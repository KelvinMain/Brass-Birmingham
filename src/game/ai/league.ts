import type * as tf from '@tensorflow/tfjs'

import { createRandomAiAgent, createStrategicAiAgent, type AiAgentFactory } from '../aiActions'
import { createNeuralAiAgentFactory } from './neuralAgent'
import { cloneModel } from './neuralModel'

export type LeagueOpponentKind = 'heuristic' | 'random' | 'population' | 'champion'

export type LeagueConfig = {
  heuristicWeight: number
  randomWeight: number
  populationWeight: number
  championWeight: number
  hallOfFameSize: number
}

export const DEFAULT_LEAGUE_CONFIG: LeagueConfig = {
  heuristicWeight: 0.35,
  randomWeight: 0.1,
  populationWeight: 0.4,
  championWeight: 0.15,
  hallOfFameSize: 3,
}

export type LeagueOpponentContext = {
  heuristicFactory: AiAgentFactory
  randomFactory: AiAgentFactory
  populationFactories: AiAgentFactory[]
  championFactories: AiAgentFactory[]
}

export function createRandomAiAgentFactory(): AiAgentFactory {
  return (_game, _playerId, random) => createRandomAiAgent(random)
}

export function createHeuristicAiAgentFactory(): AiAgentFactory {
  return createStrategicAiAgent
}

export function buildLeagueOpponentContext(
  populationModels: tf.LayersModel[],
  genomeIndex: number,
  championModels: tf.LayersModel[],
): LeagueOpponentContext {
  return {
    heuristicFactory: createHeuristicAiAgentFactory(),
    randomFactory: createRandomAiAgentFactory(),
    populationFactories: populationModels
      .filter((_, index) => index !== genomeIndex)
      .map((model) => createNeuralAiAgentFactory(model)),
    championFactories: championModels.map((model) => createNeuralAiAgentFactory(model)),
  }
}

export function pickLeagueOpponentFactory(
  config: LeagueConfig,
  context: LeagueOpponentContext,
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

export class HallOfFame {
  private readonly maxSize: number
  private entries: Array<{ fitness: number; model: tf.LayersModel }> = []

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize)
  }

  seed(model: tf.LayersModel, fitness = Number.POSITIVE_INFINITY): void {
    this.entries = [{ fitness, model: cloneModel(model) }]
  }

  add(model: tf.LayersModel, fitness: number): void {
    const nextEntries = [...this.entries, { fitness, model: cloneModel(model) }]
    nextEntries.sort((left, right) => right.fitness - left.fitness)

    const seen = new Set<string>()
    this.entries = []

    for (const entry of nextEntries) {
      const signature = getModelWeightSignature(entry.model)

      if (seen.has(signature)) {
        continue
      }

      seen.add(signature)
      this.entries.push(entry)

      if (this.entries.length >= this.maxSize) {
        break
      }
    }
  }

  getModels(): tf.LayersModel[] {
    return this.entries.map((entry) => cloneModel(entry.model))
  }

  get size(): number {
    return this.entries.length
  }
}

function getModelWeightSignature(model: tf.LayersModel): string {
  const weights = model.getWeights()

  if (weights.length === 0) {
    return 'empty'
  }

  const bias = weights[weights.length - 1]?.dataSync() ?? new Float32Array()

  return `${bias.length}:${Array.from(bias.slice(0, 4)).join(',')}`
}

export function mergeLeagueConfig(partial: Partial<LeagueConfig> = {}): LeagueConfig {
  return {
    ...DEFAULT_LEAGUE_CONFIG,
    ...partial,
  }
}

export function describeLeagueConfig(config: LeagueConfig): string {
  return [
    `heuristic=${(config.heuristicWeight * 100).toFixed(0)}%`,
    `random=${(config.randomWeight * 100).toFixed(0)}%`,
    `population=${(config.populationWeight * 100).toFixed(0)}%`,
    `champion=${(config.championWeight * 100).toFixed(0)}%`,
    `hallOfFame=${config.hallOfFameSize}`,
  ].join(', ')
}
