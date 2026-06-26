import type { PlayerCount } from '../cards'
import {
  cloneUnitWeights,
  DEFAULT_UNIT_WEIGHTS,
  deserializeUnitWeights,
  serializeUnitWeights,
  type SerializedUnitWeights,
} from './featureNorm'
import { AI_PARAM_NAMES, type AiParamName } from './params'
import { createSeededRandom } from './random'
import {
  describeLeagueConfig,
  mergeLeagueConfig,
  type LeagueConfig,
} from './league'
import {
  createWeightedAiAgentFactory,
  evaluateGenomeWorkerJob,
  evaluateGenomeWithGameReports,
  toEvaluateGenomeWorkerConfig,
  type EvaluateGenomeWorkerJob,
} from './weightEvolutionEvaluate'
import type { WeightEvolutionWorkerPool } from './weightEvolutionPool'

import type { WeightEvolutionMode } from './weightEvolutionTypes'
export type { WeightEvolutionMode } from './weightEvolutionTypes'

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
  workers?: number
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
  workers: 1,
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

type EvaluatedGenome = {
  weights: Record<AiParamName, number>
  fitness: number
  winRate: number
}

function buildEvaluateGenomeJob(
  weights: Record<AiParamName, number>,
  genomeIndex: number,
  generation: number,
  config: WeightEvolutionConfig,
  leagueConfig: LeagueConfig,
  population: Record<AiParamName, number>[],
  championWeights: Record<AiParamName, number>[],
): EvaluateGenomeWorkerJob {
  return {
    genomeIndex,
    generation,
    weights,
    config: toEvaluateGenomeWorkerConfig(config),
    leagueConfig,
    population,
    championWeights,
  }
}

async function evaluatePopulation(
  population: Record<AiParamName, number>[],
  options: {
    config: WeightEvolutionConfig
    leagueConfig: LeagueConfig
    generation: number
    championWeights: Record<AiParamName, number>[]
    workerPool: WeightEvolutionWorkerPool | null
    startedAt: number
    completedSimulations: number
    totalSimulations: number
  },
): Promise<{ evaluated: EvaluatedGenome[]; completedSimulations: number }> {
  const {
    config,
    leagueConfig,
    generation,
    championWeights,
    workerPool,
    startedAt,
    totalSimulations,
  } = options
  let completedSimulations = options.completedSimulations

  if (config.verboseGames && workerPool) {
    reportProgress(
      config,
      startedAt,
      'Verbose per-game logging requires --workers 1; running genome evaluation sequentially.',
    )
  }

  if (workerPool && !config.verboseGames) {
    const jobs = population.map((weights, genomeIndex) =>
      buildEvaluateGenomeJob(
        weights,
        genomeIndex,
        generation,
        config,
        leagueConfig,
        population,
        championWeights,
      ),
    )

    reportProgress(
      config,
      startedAt,
      `Gen ${generation + 1}/${config.generations} · evaluating ${config.populationSize} genomes in parallel...`,
    )

    const results = await workerPool.runAll(jobs)
    const evaluated = results.map((result) => ({
      weights: population[result.genomeIndex],
      fitness: result.fitness,
      winRate: result.winRate,
    }))

    for (const result of results) {
      completedSimulations += config.gamesPerGenome
      reportProgress(
        config,
        startedAt,
        `Gen ${generation + 1}/${config.generations} · genome ${result.genomeIndex + 1}/${config.populationSize} done · fitness=${result.fitness.toFixed(3)} · winRate=${(result.winRate * 100).toFixed(1)}% · games ${completedSimulations.toLocaleString()}/${totalSimulations.toLocaleString()}`,
      )
    }

    return { evaluated, completedSimulations }
  }

  const evaluated: EvaluatedGenome[] = []

  for (let genomeIndex = 0; genomeIndex < population.length; genomeIndex += 1) {
    const weights = population[genomeIndex]

    reportProgress(
      config,
      startedAt,
      `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} · playing ${config.gamesPerGenome} games...`,
    )

    const job = buildEvaluateGenomeJob(
      weights,
      genomeIndex,
      generation,
      config,
      leagueConfig,
      population,
      championWeights,
    )

    const fitnessSummary = config.verboseGames
      ? evaluateGenomeWithGameReports(job, (gameReport) => {
          const gamesDone = completedSimulations + gameReport.gameIndex + 1
          reportProgress(
            config,
            startedAt,
            `  game ${gameReport.gameIndex + 1}/${config.gamesPerGenome} · ${gameReport.status} · ${gameReport.turnsPlayed} turns · fitness=${gameReport.fitness.toFixed(3)} · overall ${gamesDone}/${totalSimulations}`,
          )
        })
      : evaluateGenomeWorkerJob(job)

    completedSimulations += config.gamesPerGenome

    reportProgress(
      config,
      startedAt,
      `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} done · fitness=${fitnessSummary.fitness.toFixed(3)} · winRate=${(fitnessSummary.winRate * 100).toFixed(1)}% · games ${completedSimulations.toLocaleString()}/${totalSimulations.toLocaleString()}`,
    )

    evaluated.push({
      weights,
      ...fitnessSummary,
    })
  }

  return { evaluated, completedSimulations }
}

export async function runWeightEvolution(
  partialConfig: Partial<WeightEvolutionConfig> = {},
): Promise<WeightEvolutionResult> {
  const config = { ...DEFAULT_CONFIG, ...partialConfig }
  const leagueConfig = mergeLeagueConfig(config.league)
  const { resolveWorkerCount, WeightEvolutionWorkerPool } = await import('./weightEvolutionPool')
  const workerCount = resolveWorkerCount(config.workers)
  const startedAt = Date.now()
  const totalSimulations = config.generations * config.populationSize * config.gamesPerGenome
  const hallOfFame = new WeightHallOfFame(leagueConfig.hallOfFameSize)
  const seedWeights = cloneUnitWeights(config.resumeWeights ?? DEFAULT_UNIT_WEIGHTS)
  const workerPool =
    workerCount > 1 && !config.verboseGames ? new WeightEvolutionWorkerPool(workerCount) : null

  reportProgress(
    config,
    startedAt,
    `Starting weight evolution (${config.mode}): ${config.generations} generations × ${config.populationSize} genomes × ${config.gamesPerGenome} games × ${config.playerCount}p = ${totalSimulations.toLocaleString()} full games`,
  )

  if (workerPool) {
    reportProgress(config, startedAt, `Parallel workers: ${workerCount}`)
  }

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

  try {
    for (let generation = 0; generation < config.generations; generation += 1) {
      const generationStartedAt = Date.now()
      const championWeights = hallOfFame.getWeights()
      const evaluation = await evaluatePopulation(population, {
        config,
        leagueConfig,
        generation,
        championWeights,
        workerPool,
        startedAt,
        completedSimulations,
        totalSimulations,
      })
      const evaluated = evaluation.evaluated
      completedSimulations = evaluation.completedSimulations

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
  } finally {
    if (workerPool) {
      await workerPool.close()
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
): import('../aiActions').AiAgentFactory {
  return createWeightedAiAgentFactory(weights)
}

export { createWeightedAiAgentFactory, evaluateGenomeWorkerJob }
