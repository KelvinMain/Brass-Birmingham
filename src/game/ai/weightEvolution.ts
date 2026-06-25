import type { PlayerCount } from '../cards'
import { createStrategicAiAgent, type AiAgentFactory } from '../aiActions'
import {
  buildParamsFromUnitWeights,
  cloneUnitWeights,
  DEFAULT_UNIT_WEIGHTS,
  deserializeUnitWeights,
  serializeUnitWeights,
  type SerializedUnitWeights,
} from './featureNorm'
import { AI_PARAM_NAMES, type AiParamName } from './params'
import { createParametricAiAgent } from './parametricScorer'
import { createSeededRandom } from './random'
import { scoreStrategicAdjustment } from './strategicScorer'
import { getPlayerFitness, simulateAiGame } from './simulator'
import {
  createRandomAiAgentFactory,
  createHeuristicAiAgentFactory,
  describeLeagueConfig,
  mergeLeagueConfig,
  type LeagueConfig,
} from './league'

export type WeightEvolutionMode = 'fixed' | 'league'

export type WeightEvolutionConfig = {
  populationSize: number
  gamesPerGenome: number
  generations: number
  seed: number
  eliteCount: number
  mutationRate: number
  mutationSigma: number
  playerCount: PlayerCount
  outputPath?: string
  verboseGames?: boolean
  mode?: WeightEvolutionMode
  league?: Partial<LeagueConfig>
  resumeWeights?: Record<AiParamName, number>
  randomizeRoundOneStartingPlayer?: boolean
  onProgress?: (message: string) => void
}

export type WeightEvolutionGenerationStats = {
  generation: number
  bestFitness: number
  averageFitness: number
  bestWinRate: number
}

export type WeightEvolutionResult = {
  bestWeights: Record<AiParamName, number>
  bestFitness: number
  generations: WeightEvolutionGenerationStats[]
  serialized: SerializedUnitWeights
  outputPath?: string
  mode: WeightEvolutionMode
}

const DEFAULT_CONFIG: WeightEvolutionConfig = {
  populationSize: 24,
  gamesPerGenome: 16,
  generations: 50,
  seed: 42,
  eliteCount: 2,
  mutationRate: 0.12,
  mutationSigma: 0.18,
  playerCount: 2,
  verboseGames: false,
  mode: 'fixed',
  randomizeRoundOneStartingPlayer: true,
}

class WeightHallOfFame {
  private readonly maxSize: number
  private entries: Array<{ fitness: number; weights: Record<AiParamName, number> }> = []

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize)
  }

  seed(weights: Record<AiParamName, number>, fitness = Number.POSITIVE_INFINITY): void {
    this.entries = [{ fitness, weights: cloneUnitWeights(weights) }]
  }

  add(weights: Record<AiParamName, number>, fitness: number): void {
    const nextEntries = [...this.entries, { fitness, weights: cloneUnitWeights(weights) }]
    nextEntries.sort((left, right) => right.fitness - left.fitness)
    this.entries = nextEntries.slice(0, this.maxSize)
  }

  getWeights(): Record<AiParamName, number>[] {
    return this.entries.map((entry) => cloneUnitWeights(entry.weights))
  }

  get size(): number {
    return this.entries.length
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

function reportProgress(config: WeightEvolutionConfig, startedAt: number, message: string): void {
  const line = `[${formatDuration(Date.now() - startedAt)}] ${message}`

  if (config.onProgress) {
    config.onProgress(line)
    return
  }

  console.log(line)
}

function createWeightedAiAgentFactory(weights: Record<AiParamName, number>): AiAgentFactory {
  const params = buildParamsFromUnitWeights(weights, AI_PARAM_NAMES)

  return (game, playerId, random) =>
    createParametricAiAgent(game, playerId, params, random, scoreStrategicAdjustment)
}

function gaussianRandom(random: () => number): number {
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = random()

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function mutateUnitWeights(
  weights: Record<AiParamName, number>,
  config: WeightEvolutionConfig,
  salt: number,
): Record<AiParamName, number> {
  const random = createSeededRandom(config.seed + salt * 9973)
  const mutated = cloneUnitWeights(weights)

  for (const name of AI_PARAM_NAMES) {
    if (random() < config.mutationRate) {
      const magnitude = Math.max(1, Math.abs(mutated[name]))
      mutated[name] += gaussianRandom(random) * config.mutationSigma * magnitude
    }
  }

  return mutated
}

function crossoverUnitWeights(
  parentA: Record<AiParamName, number>,
  parentB: Record<AiParamName, number>,
): Record<AiParamName, number> {
  const child = cloneUnitWeights(parentA)

  for (const name of AI_PARAM_NAMES) {
    child[name] = Math.random() < 0.5 ? parentA[name] : parentB[name]
  }

  return child
}

type WeightLeagueContext = {
  heuristicFactory: AiAgentFactory
  randomFactory: AiAgentFactory
  populationFactories: AiAgentFactory[]
  championFactories: AiAgentFactory[]
}

function buildWeightLeagueOpponentContext(
  population: Record<AiParamName, number>[],
  genomeIndex: number,
  championWeights: Record<AiParamName, number>[],
): WeightLeagueContext {
  return {
    heuristicFactory: createHeuristicAiAgentFactory(),
    randomFactory: createRandomAiAgentFactory(),
    populationFactories: population
      .filter((_, index) => index !== genomeIndex)
      .map((weights) => createWeightedAiAgentFactory(weights)),
    championFactories: championWeights.map((weights) => createWeightedAiAgentFactory(weights)),
  }
}

function pickWeightLeagueOpponentFactory(
  config: LeagueConfig,
  context: WeightLeagueContext,
  random: () => number,
): AiAgentFactory {
  const slots: Array<{ weight: number; factory: AiAgentFactory }> = []

  if (config.heuristicWeight > 0) {
    slots.push({ weight: config.heuristicWeight, factory: context.heuristicFactory })
  }

  if (config.randomWeight > 0) {
    slots.push({ weight: config.randomWeight, factory: context.randomFactory })
  }

  if (config.championWeight > 0 && context.championFactories.length > 0) {
    const championFactory =
      context.championFactories[Math.floor(random() * context.championFactories.length)]

    slots.push({ weight: config.championWeight, factory: championFactory })
  }

  if (config.populationWeight > 0 && context.populationFactories.length > 0) {
    const populationFactory =
      context.populationFactories[Math.floor(random() * context.populationFactories.length)]

    slots.push({ weight: config.populationWeight, factory: populationFactory })
  }

  if (slots.length === 0) {
    return context.heuristicFactory
  }

  const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0)
  let roll = random() * totalWeight

  for (const slot of slots) {
    roll -= slot.weight

    if (roll <= 0) {
      return slot.factory
    }
  }

  return slots[slots.length - 1].factory
}

type EvaluateGenomeOptions = {
  weights: Record<AiParamName, number>
  config: WeightEvolutionConfig
  leagueConfig: LeagueConfig
  baselineFactory: AiAgentFactory
  population: Record<AiParamName, number>[]
  championWeights: Record<AiParamName, number>[]
  genomeIndex: number
  generation: number
  startedAt: number
  completedSimulationsBefore: number
  totalSimulations: number
}

function evaluateGenome(options: EvaluateGenomeOptions): { fitness: number; winRate: number } {
  const {
    weights,
    config,
    leagueConfig,
    baselineFactory,
    population,
    championWeights,
    genomeIndex,
    generation,
    startedAt,
    completedSimulationsBefore,
    totalSimulations,
  } = options

  const candidateFactory = createWeightedAiAgentFactory(weights)
  const leagueContext =
    config.mode === 'league'
      ? buildWeightLeagueOpponentContext(population, genomeIndex, championWeights)
      : null

  let fitnessTotal = 0
  let wins = 0

  for (let gameIndex = 0; gameIndex < config.gamesPerGenome; gameIndex += 1) {
    const seed = config.seed + generation * 10_000 + genomeIndex * 100 + gameIndex
    const opponentFactory =
      config.mode === 'league' && leagueContext
        ? pickWeightLeagueOpponentFactory(
            leagueConfig,
            leagueContext,
            createSeededRandom(seed + 50_000),
          )
        : baselineFactory

    const result = simulateAiGame({
      playerCount: config.playerCount,
      agentFactories: [candidateFactory, opponentFactory],
      seed,
      randomizeRoundOneStartingPlayer: config.randomizeRoundOneStartingPlayer,
    })
    const fitness = getPlayerFitness(result, 'player-1')
    fitnessTotal += fitness.fitness
    wins += fitness.wins

    if (config.verboseGames) {
      const gamesDone = completedSimulationsBefore + gameIndex + 1
      reportProgress(
        config,
        startedAt,
        `  game ${gameIndex + 1}/${config.gamesPerGenome} · ${result.status} · ${result.turnsPlayed} turns · fitness=${fitness.fitness.toFixed(3)} · overall ${gamesDone}/${totalSimulations}`,
      )
    }
  }

  return {
    fitness: fitnessTotal / config.gamesPerGenome,
    winRate: wins / config.gamesPerGenome,
  }
}

export function runWeightEvolution(
  partialConfig: Partial<WeightEvolutionConfig> = {},
): WeightEvolutionResult {
  const config = { ...DEFAULT_CONFIG, ...partialConfig }
  const leagueConfig = mergeLeagueConfig(config.league)
  const startedAt = Date.now()
  const totalSimulations = config.generations * config.populationSize * config.gamesPerGenome
  const baselineFactory: AiAgentFactory = createStrategicAiAgent
  const hallOfFame = new WeightHallOfFame(leagueConfig.hallOfFameSize)
  const seedWeights = cloneUnitWeights(config.resumeWeights ?? DEFAULT_UNIT_WEIGHTS)

  reportProgress(
    config,
    startedAt,
    `Starting weight evolution (${config.mode}): ${config.generations} generations × ${config.populationSize} genomes × ${config.gamesPerGenome} games × ${config.playerCount}p = ${totalSimulations.toLocaleString()} full games`,
  )

  if (config.mode === 'league') {
    reportProgress(config, startedAt, `League opponents: ${describeLeagueConfig(leagueConfig)}`)
  } else {
    reportProgress(config, startedAt, 'Opponent: fixed heuristic baseline (DEFAULT_UNIT_WEIGHTS)')
  }

  if (config.resumeWeights) {
    hallOfFame.seed(seedWeights)
    reportProgress(config, startedAt, 'Loaded resume weights into seed genome and hall of fame')
  }

  reportProgress(config, startedAt, 'Building initial population...')

  let population = Array.from({ length: config.populationSize }, (_, index) => {
    if (index === 0) {
      return cloneUnitWeights(seedWeights)
    }

    return mutateUnitWeights(cloneUnitWeights(seedWeights), config, index + 1)
  })

  reportProgress(
    config,
    startedAt,
    `Population ready (${config.populationSize} weight sets). Evaluating generation 1/${config.generations}...`,
  )

  const generationStats: WeightEvolutionGenerationStats[] = []
  let bestWeights = cloneUnitWeights(population[0])
  let bestFitness = Number.NEGATIVE_INFINITY
  let completedSimulations = 0

  for (let generation = 0; generation < config.generations; generation += 1) {
    const generationStartedAt = Date.now()
    const championWeights = hallOfFame.getWeights()
    const evaluated = population.map((weights, genomeIndex) => {
      reportProgress(
        config,
        startedAt,
        `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} · playing ${config.gamesPerGenome} games...`,
      )

      const fitnessSummary = evaluateGenome({
        weights,
        config,
        leagueConfig,
        baselineFactory,
        population,
        championWeights,
        genomeIndex,
        generation,
        startedAt,
        completedSimulationsBefore: completedSimulations,
        totalSimulations,
      })

      completedSimulations += config.gamesPerGenome

      reportProgress(
        config,
        startedAt,
        `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} done · fitness=${fitnessSummary.fitness.toFixed(3)} · winRate=${(fitnessSummary.winRate * 100).toFixed(1)}% · games ${completedSimulations.toLocaleString()}/${totalSimulations.toLocaleString()}`,
      )

      return {
        weights,
        ...fitnessSummary,
      }
    })

    evaluated.sort((left, right) => right.fitness - left.fitness)
    const generationBest = evaluated[0]
    const averageFitness =
      evaluated.reduce((total, entry) => total + entry.fitness, 0) / evaluated.length
    const generationElapsed = Date.now() - generationStartedAt
    const elapsed = Date.now() - startedAt
    const simulationsPerMs = completedSimulations / Math.max(elapsed, 1)
    const remainingSimulations = totalSimulations - completedSimulations
    const etaMs = remainingSimulations / Math.max(simulationsPerMs, 0.000001)

    generationStats.push({
      generation,
      bestFitness: generationBest.fitness,
      averageFitness,
      bestWinRate: generationBest.winRate,
    })

    for (const elite of evaluated.slice(0, config.eliteCount)) {
      hallOfFame.add(elite.weights, elite.fitness)
    }

    if (generationBest.fitness > bestFitness) {
      bestFitness = generationBest.fitness
      bestWeights = cloneUnitWeights(generationBest.weights)
    }

    reportProgress(
      config,
      startedAt,
      `Generation ${generation + 1}/${config.generations} complete in ${formatDuration(generationElapsed)} · bestFitness=${generationBest.fitness.toFixed(3)} · allTimeBest=${bestFitness.toFixed(3)} · avgFitness=${averageFitness.toFixed(3)} · bestWinRate=${(generationBest.winRate * 100).toFixed(1)}% · hallOfFame=${hallOfFame.size} · ETA ${formatDuration(etaMs)}`,
    )

    const nextPopulation = evaluated
      .slice(0, config.eliteCount)
      .map((entry) => cloneUnitWeights(entry.weights))

    while (nextPopulation.length < config.populationSize) {
      const parentA = evaluated[Math.floor(Math.random() * Math.min(8, evaluated.length))].weights
      const parentB = evaluated[Math.floor(Math.random() * Math.min(8, evaluated.length))].weights
      const child = crossoverUnitWeights(parentA, parentB)
      nextPopulation.push(
        mutateUnitWeights(child, config, generation + nextPopulation.length + 1000),
      )
    }

    population = nextPopulation

    if (generation + 1 < config.generations) {
      reportProgress(
        config,
        startedAt,
        `Evaluating generation ${generation + 2}/${config.generations}...`,
      )
    }
  }

  const serialized = serializeUnitWeights(bestWeights)

  reportProgress(
    config,
    startedAt,
    `Weight evolution finished in ${formatDuration(Date.now() - startedAt)} · allTimeBestFitness=${bestFitness.toFixed(3)}`,
  )

  return {
    bestWeights,
    bestFitness,
    generations: generationStats,
    serialized,
    outputPath: config.outputPath,
    mode: config.mode ?? 'fixed',
  }
}

export function loadTunedWeightsFromSerialized(
  serialized: SerializedUnitWeights | Record<AiParamName, number>,
): Record<AiParamName, number> {
  return deserializeUnitWeights(serialized)
}

export function createTunedAiAgentFactory(
  weights: Record<AiParamName, number> = DEFAULT_UNIT_WEIGHTS,
): AiAgentFactory {
  return createWeightedAiAgentFactory(weights)
}

export { createWeightedAiAgentFactory }
