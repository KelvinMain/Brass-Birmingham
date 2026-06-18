import * as tf from '@tensorflow/tfjs'

import { createStrategicAiAgent, type AiAgentFactory } from '../aiActions'
import {
  cloneModel,
  buildScoringNetwork,
  getModelWeightVector,
  serializeModel,
  setModelWeightVector,
  warmStartToDefaultParams,
  type SerializedScoringNetwork,
} from './neuralModel'
import { createNeuralAiAgentFactory } from './neuralAgent'
import { createSeededRandom } from './random'
import { getPlayerFitness, simulateAiGame } from './simulator'

export type EvolutionConfig = {
  populationSize: number
  gamesPerGenome: number
  generations: number
  seed: number
  eliteCount: number
  mutationRate: number
  mutationSigma: number
  outputPath?: string
  verboseGames?: boolean
  onProgress?: (message: string) => void
}

export type EvolutionGenerationStats = {
  generation: number
  bestFitness: number
  averageFitness: number
  bestWinRate: number
}

export type EvolutionResult = {
  bestModel: tf.LayersModel
  generations: EvolutionGenerationStats[]
  serialized: SerializedScoringNetwork
  outputPath?: string
}

const DEFAULT_CONFIG: EvolutionConfig = {
  populationSize: 24,
  gamesPerGenome: 16,
  generations: 50,
  seed: 42,
  eliteCount: 2,
  mutationRate: 0.15,
  mutationSigma: 0.05,
  verboseGames: false,
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

function reportProgress(config: EvolutionConfig, startedAt: number, message: string): void {
  const line = `[${formatDuration(Date.now() - startedAt)}] ${message}`

  if (config.onProgress) {
    config.onProgress(line)
    return
  }

  console.log(line)
}

export async function runEvolution(
  partialConfig: Partial<EvolutionConfig> = {},
): Promise<EvolutionResult> {
  const config = { ...DEFAULT_CONFIG, ...partialConfig }
  const startedAt = Date.now()
  const totalSimulations = config.generations * config.populationSize * config.gamesPerGenome

  reportProgress(
    config,
    startedAt,
    `Starting evolution: ${config.generations} generations × ${config.populationSize} genomes × ${config.gamesPerGenome} games = ${totalSimulations.toLocaleString()} full games`,
  )
  reportProgress(config, startedAt, 'Warming up neural network to heuristic defaults...')

  const baselineFactory: AiAgentFactory = createStrategicAiAgent
  const seedModel = buildScoringNetwork()
  await warmStartToDefaultParams(seedModel)

  reportProgress(config, startedAt, 'Warm-start complete. Building initial population...')

  let population = Array.from({ length: config.populationSize }, (_, index) => {
    const model = index === 0 ? seedModel : mutateModel(cloneModel(seedModel), config, index + 1)
    return model
  })

  reportProgress(
    config,
    startedAt,
    `Population ready (${config.populationSize} networks). Evaluating generation 1/${config.generations}...`,
  )

  const generationStats: EvolutionGenerationStats[] = []
  let bestModel = population[0]
  let bestFitness = Number.NEGATIVE_INFINITY
  let completedSimulations = 0

  for (let generation = 0; generation < config.generations; generation += 1) {
    const generationStartedAt = Date.now()
    const evaluated = population.map((model, genomeIndex) => {
      reportProgress(
        config,
        startedAt,
        `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} · playing ${config.gamesPerGenome} games...`,
      )

      const fitnessSummary = evaluateGenome(
        model,
        baselineFactory,
        config,
        generation,
        genomeIndex,
        startedAt,
        completedSimulations,
        totalSimulations,
      )

      completedSimulations += config.gamesPerGenome

      reportProgress(
        config,
        startedAt,
        `Gen ${generation + 1}/${config.generations} · genome ${genomeIndex + 1}/${config.populationSize} done · fitness=${fitnessSummary.fitness.toFixed(3)} · winRate=${(fitnessSummary.winRate * 100).toFixed(1)}% · games ${completedSimulations.toLocaleString()}/${totalSimulations.toLocaleString()}`,
      )

      return {
        model,
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

    if (generationBest.fitness > bestFitness) {
      bestFitness = generationBest.fitness
      bestModel = generationBest.model
    }

    reportProgress(
      config,
      startedAt,
      `Generation ${generation + 1}/${config.generations} complete in ${formatDuration(generationElapsed)} · bestFitness=${generationBest.fitness.toFixed(3)} · avgFitness=${averageFitness.toFixed(3)} · bestWinRate=${(generationBest.winRate * 100).toFixed(1)}% · ETA ${formatDuration(etaMs)}`,
    )

    const nextPopulation = evaluated.slice(0, config.eliteCount).map((entry) => cloneModel(entry.model))

    while (nextPopulation.length < config.populationSize) {
      const parentA = evaluated[Math.floor(Math.random() * Math.min(8, evaluated.length))].model
      const parentB = evaluated[Math.floor(Math.random() * Math.min(8, evaluated.length))].model
      const child = crossoverModels(parentA, parentB)
      nextPopulation.push(mutateModel(child, config, generation + nextPopulation.length))
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

  const serialized = serializeModel(bestModel)

  reportProgress(
    config,
    startedAt,
    `Evolution finished in ${formatDuration(Date.now() - startedAt)} · bestFitness=${bestFitness.toFixed(3)}`,
  )

  return {
    bestModel,
    generations: generationStats,
    serialized,
    outputPath: config.outputPath,
  }
}

function evaluateGenome(
  model: tf.LayersModel,
  baselineFactory: AiAgentFactory,
  config: EvolutionConfig,
  generation: number,
  genomeIndex: number,
  startedAt: number,
  completedSimulationsBefore: number,
  totalSimulations: number,
): { fitness: number; winRate: number } {
  const candidateFactory = createNeuralAiAgentFactory(model)
  let fitnessTotal = 0
  let wins = 0

  for (let gameIndex = 0; gameIndex < config.gamesPerGenome; gameIndex += 1) {
    const seed = config.seed + generation * 10_000 + genomeIndex * 100 + gameIndex
    const result = simulateAiGame({
      playerCount: 2,
      agentFactories: [candidateFactory, baselineFactory],
      seed,
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

function mutateModel(model: tf.LayersModel, config: EvolutionConfig, salt: number): tf.LayersModel {
  const random = createSeededRandom(config.seed + salt * 9973)
  const vector = getModelWeightVector(model)
  const mutated = Float32Array.from(vector)

  for (let index = 0; index < mutated.length; index += 1) {
    if (random() < config.mutationRate) {
      mutated[index] += gaussianRandom(random) * config.mutationSigma
    }
  }

  setModelWeightVector(model, mutated)

  return model
}

function crossoverModels(parentA: tf.LayersModel, parentB: tf.LayersModel): tf.LayersModel {
  const child = cloneModel(parentA)
  const vectorA = getModelWeightVector(parentA)
  const vectorB = getModelWeightVector(parentB)
  const blended = Float32Array.from(vectorA)

  for (let index = 0; index < blended.length; index += 1) {
    blended[index] = Math.random() < 0.5 ? vectorA[index] : vectorB[index]
  }

  setModelWeightVector(child, blended)

  return child
}

function gaussianRandom(random: () => number): number {
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = random()

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}
