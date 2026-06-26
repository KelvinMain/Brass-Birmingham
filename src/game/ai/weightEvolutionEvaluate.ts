import type { PlayerCount } from '../cards'
import { createStrategicAiAgent, type AiAgentFactory } from '../aiActions'
import { buildParamsFromUnitWeights } from './featureNorm'
import { AI_PARAM_NAMES, type AiParamName } from './params'
import { createParametricAiAgent } from './parametricScorer'
import { createSeededRandom } from './random'
import { scoreStrategicAdjustment } from './strategicScorer'
import { getPlayerFitness, simulateAiGame } from './simulator'
import {
  createRandomAiAgentFactory,
  createHeuristicAiAgentFactory,
  mergeLeagueConfig,
  type LeagueConfig,
} from './league'
import type { WeightEvolutionMode } from './weightEvolutionTypes'

export type EvaluateGenomeWorkerConfig = {
  gamesPerGenome: number
  seed: number
  playerCount: PlayerCount
  mode: WeightEvolutionMode
  randomizeRoundOneStartingPlayer: boolean
}

export type EvaluateGenomeWorkerJob = {
  genomeIndex: number
  generation: number
  weights: Record<AiParamName, number>
  config: EvaluateGenomeWorkerConfig
  leagueConfig: LeagueConfig
  population: Record<AiParamName, number>[]
  championWeights: Record<AiParamName, number>[]
}

export type EvaluateGenomeWorkerResult = {
  genomeIndex: number
  fitness: number
  winRate: number
}

export type WeightEvolutionWorkerRequest = {
  type: 'run'
  job: EvaluateGenomeWorkerJob
}

export type WeightEvolutionWorkerResponse = {
  type: 'done'
  result: EvaluateGenomeWorkerResult
}

export type WeightEvolutionWorkerError = {
  type: 'error'
  error: string
}

export function createWeightedAiAgentFactory(weights: Record<AiParamName, number>): AiAgentFactory {
  const params = buildParamsFromUnitWeights(weights, AI_PARAM_NAMES)

  return (game, playerId, random) =>
    createParametricAiAgent(game, playerId, params, random, scoreStrategicAdjustment)
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

export function evaluateGenomeWorkerJob(
  job: EvaluateGenomeWorkerJob,
): EvaluateGenomeWorkerResult {
  const {
    weights,
    config,
    leagueConfig,
    population,
    championWeights,
    genomeIndex,
    generation,
  } = job
  const baselineFactory: AiAgentFactory = createStrategicAiAgent
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
  }

  return {
    genomeIndex,
    fitness: fitnessTotal / config.gamesPerGenome,
    winRate: wins / config.gamesPerGenome,
  }
}

export type EvaluateGenomeGameReport = {
  gameIndex: number
  status: 'ended' | 'stuck'
  turnsPlayed: number
  fitness: number
}

export function evaluateGenomeWithGameReports(
  job: EvaluateGenomeWorkerJob,
  onGameComplete: (report: EvaluateGenomeGameReport) => void,
): EvaluateGenomeWorkerResult {
  const {
    weights,
    config,
    leagueConfig,
    population,
    championWeights,
    genomeIndex,
    generation,
  } = job
  const baselineFactory: AiAgentFactory = createStrategicAiAgent
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

    onGameComplete({
      gameIndex,
      status: result.status,
      turnsPlayed: result.turnsPlayed,
      fitness: fitness.fitness,
    })
  }

  return {
    genomeIndex,
    fitness: fitnessTotal / config.gamesPerGenome,
    winRate: wins / config.gamesPerGenome,
  }
}

export function toEvaluateGenomeWorkerConfig(options: {
  gamesPerGenome: number
  seed: number
  playerCount: PlayerCount
  mode?: WeightEvolutionMode
  randomizeRoundOneStartingPlayer?: boolean
}): EvaluateGenomeWorkerConfig {
  return {
    gamesPerGenome: options.gamesPerGenome,
    seed: options.seed,
    playerCount: options.playerCount,
    mode: options.mode ?? 'fixed',
    randomizeRoundOneStartingPlayer: options.randomizeRoundOneStartingPlayer ?? true,
  }
}
