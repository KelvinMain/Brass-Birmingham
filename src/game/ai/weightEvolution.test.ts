import { describe, expect, it } from 'vitest'

import {
  buildParamsFromUnitWeights,
  DEFAULT_UNIT_WEIGHTS,
  deserializeUnitWeights,
  serializeUnitWeights,
} from './featureNorm'
import { AI_PARAM_NAMES, DEFAULT_PARAMS } from './params'
import { loadTunedWeightsFromSerialized } from './weightEvolution'

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
})
