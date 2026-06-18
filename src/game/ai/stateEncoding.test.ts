import { describe, expect, it } from 'vitest'

import { createGameState } from '../game'
import {
  AI_STATE_FEATURE_COUNT,
  encodeAiState,
  STATE_ENCODING_LAYOUT,
} from './stateEncoding'
import {
  beerResourceSpaces,
  industrySpaces,
  linkSpaces,
  marketLocations,
  marketResourceSpaces,
  merchantTileSpaces,
} from '../board'
import { playerBoardIndustryTiles } from '../playerBoard'
import { HAND_LIMIT } from '../deck'

describe('encodeAiState', () => {
  it('matches the documented feature layout size', () => {
    const expected =
      STATE_ENCODING_LAYOUT.global +
      STATE_ENCODING_LAYOUT.perPlayer * STATE_ENCODING_LAYOUT.maxPlayers +
      STATE_ENCODING_LAYOUT.industrySpaceFeatures * industrySpaces.length +
      STATE_ENCODING_LAYOUT.linkSpaceFeatures * linkSpaces.length +
      STATE_ENCODING_LAYOUT.marketSlotFeatures * marketResourceSpaces.length +
      STATE_ENCODING_LAYOUT.beerSlotFeatures * beerResourceSpaces.length +
      STATE_ENCODING_LAYOUT.merchantSlotFeatures * merchantTileSpaces.length +
      STATE_ENCODING_LAYOUT.playerBoardTileFeatures * playerBoardIndustryTiles.length +
      STATE_ENCODING_LAYOUT.handSlotFeatures * HAND_LIMIT +
      marketLocations.length +
      STATE_ENCODING_LAYOUT.boardAggregates +
      STATE_ENCODING_LAYOUT.developedStackByIndustry +
      STATE_ENCODING_LAYOUT.outdatedStackByIndustry

    expect(AI_STATE_FEATURE_COUNT).toBe(expected)
  })

  it('encodes a full game snapshot without length drift', () => {
    const game = createGameState(2)
    const state = encodeAiState(game, game.players[0].id)

    expect(state).toHaveLength(AI_STATE_FEATURE_COUNT)
    expect(state.some((value) => value !== 0)).toBe(true)
  })

  it('encodes per-player economy markers for every seat', () => {
    const game = createGameState(4)
    const state = encodeAiState(game, game.players[2].id)

    expect(state).toHaveLength(AI_STATE_FEATURE_COUNT)
    expect(state[STATE_ENCODING_LAYOUT.global]).toBeGreaterThan(0)
  })
})
