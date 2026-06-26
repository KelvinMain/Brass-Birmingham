import { describe, expect, it } from 'vitest'

import {
  buildParamsFromUnitWeights,
  DEFAULT_UNIT_WEIGHTS,
  deserializeUnitWeights,
  serializeUnitWeights,
} from './featureNorm'
import { AI_PARAM_NAMES, DEFAULT_PARAMS } from './params'
import {
  evaluateGenomeWorkerJob,
  loadTunedWeightsFromSerialized,
  runWeightEvolution,
} from './weightEvolution'
import { mergeLeagueConfig } from './league'
import { toEvaluateGenomeWorkerConfig } from './weightEvolutionEvaluate'

describe('unit weight tuning helpers', () => {
  it('builds scoring params from unit weights and feature norms', () => {
    const params = buildParamsFromUnitWeights(DEFAULT_UNIT_WEIGHTS, AI_PARAM_NAMES)

    expect(params.networkSingleCanal).toBe(DEFAULT_UNIT_WEIGHTS.networkSingleCanal)
    expect(params.networkBlocksOpponent).toBe(DEFAULT_UNIT_WEIGHTS.networkBlocksOpponent * 2)
    expect(params).toEqual(DEFAULT_PARAMS)
  })

  it('round-trips serialized unit weights', () => {
    const serialized = serializeUnitWeights(DEFAULT_UNIT_WEIGHTS)
    const restored = deserializeUnitWeights(serialized)
    const loaded = loadTunedWeightsFromSerialized(serialized)

    for (const name of AI_PARAM_NAMES) {
      expect(restored[name]).toBe(DEFAULT_UNIT_WEIGHTS[name])
      expect(loaded[name]).toBe(DEFAULT_UNIT_WEIGHTS[name])
    }
  })

  it('matches serial and worker genome evaluation', () => {
    const job = {
      genomeIndex: 0,
      generation: 0,
      weights: DEFAULT_UNIT_WEIGHTS,
      config: toEvaluateGenomeWorkerConfig({
        gamesPerGenome: 1,
        seed: 42,
        playerCount: 2,
        mode: 'fixed',
        randomizeRoundOneStartingPlayer: false,
      }),
      leagueConfig: mergeLeagueConfig(undefined),
      population: [DEFAULT_UNIT_WEIGHTS],
      championWeights: [],
    }

    expect(evaluateGenomeWorkerJob(job)).toEqual(evaluateGenomeWorkerJob(job))
  }, 60_000)

  it('produces the same first-generation fitness with one or four workers', async () => {
    const config = {
      generations: 1,
      populationSize: 4,
      gamesPerGenome: 2,
      seed: 99,
      playerCount: 2 as const,
      mode: 'fixed' as const,
      randomizeRoundOneStartingPlayer: false,
    }

    const serial = await runWeightEvolution({ ...config, workers: 1 })
    const parallel = await runWeightEvolution({ ...config, workers: 4 })

    expect(parallel.generations[0]?.bestFitness).toBe(serial.generations[0]?.bestFitness)
    expect(parallel.generations[0]?.averageFitness).toBe(serial.generations[0]?.averageFitness)
  }, 600_000)
})
