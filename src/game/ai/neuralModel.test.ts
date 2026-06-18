import { describe, expect, it } from 'vitest'

import { createGameState } from '../game'
import { AI_PARAM_COUNT, AI_PARAM_NAMES, DEFAULT_PARAMS } from './params'
import {
  buildScoringNetwork,
  predictParams,
  serializeModel,
  deserializeModel,
  warmStartToDefaultParams,
} from './neuralModel'
import { encodeAiState, AI_STATE_FEATURE_COUNT } from './stateEncoding'

describe('neural scoring network', () => {
  it('outputs 50 scaled parameters', () => {
    const model = buildScoringNetwork()
    const game = createGameState(2)
    const state = encodeAiState(game, game.players[1].id)
    const params = predictParams(model, state)

    expect(state).toHaveLength(AI_STATE_FEATURE_COUNT)
    expect(Object.keys(params)).toHaveLength(AI_PARAM_COUNT)
    expect(params.buildBrewery).toBeTypeOf('number')
  })

  it('warm-starts close to default heuristic params', async () => {
    const model = buildScoringNetwork()
    await warmStartToDefaultParams(model, 300)

    const game = createGameState(2)
    const params = predictParams(model, encodeAiState(game, game.players[1].id))

    const gameplayParams = AI_PARAM_NAMES.filter(
      (name) => name !== 'biasDiscard' && name !== 'biasScout',
    )

    for (const name of gameplayParams) {
      const expected = DEFAULT_PARAMS[name]
      const actual = params[name]
      const tolerance = Math.max(5, Math.abs(expected) * 0.25)
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
    }
  }, 30_000)

  it('serializes and deserializes model weights', () => {
    const model = buildScoringNetwork()
    const serialized = serializeModel(model)
    const restored = deserializeModel(serialized)
    const game = createGameState(2)
    const state = encodeAiState(game, game.players[0].id)

    const original = predictParams(model, state)
    const roundTrip = predictParams(restored, state)

    for (const name of AI_PARAM_NAMES) {
      expect(roundTrip[name]).toBeCloseTo(original[name], 4)
    }
  })
})
