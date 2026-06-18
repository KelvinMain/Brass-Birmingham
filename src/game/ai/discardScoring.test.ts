import { describe, expect, it } from 'vitest'

import { getDiscardCardAdjustment } from './discardScoring'
import { DISCARD_BASE_PENALTY } from './params'
import { scoreCandidateWithParams } from './parametricScorer'
import { createGameState } from '../game'
import type { AiCandidateAction } from '../aiActions'
import { DEFAULT_PARAMS } from './params'

describe('discard scoring', () => {
  it('applies a fixed base penalty outside the neural weights', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const discard: AiCandidateAction = {
      kind: 'discard',
      cardId: card.id,
      description: 'Discarded card',
    }

    const score = scoreCandidateWithParams(game, playerId, discard, DEFAULT_PARAMS)

    expect(score).toBeLessThan(-100_000)
    expect(score).toBe(DISCARD_BASE_PENALTY + getDiscardCardAdjustment(card))
  })

  it('prefers discarding location cards over wild cards', () => {
    const locationAdjustment = getDiscardCardAdjustment({
      id: 'loc-birmingham-1',
      kind: 'location',
      name: 'Birmingham',
      color: '#000',
      availableInPlayerCounts: [2, 3, 4],
    })
    const wildAdjustment = getDiscardCardAdjustment({
      id: 'wild-location-1',
      kind: 'wild-location',
    })

    expect(locationAdjustment).toBeGreaterThan(wildAdjustment)
  })
})
