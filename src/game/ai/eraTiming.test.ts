import { describe, expect, it } from 'vitest'

import { getDeckForPlayerCount } from '../deck'
import { createGameState } from '../game'
import {
  estimateMaxRoundsInEra,
  getEraCardProgress,
  getEraDeckSize,
  getEraRoundProgress,
  isEarlyEraPhase,
  isLateEraPhase,
} from './eraTiming'

describe('eraTiming', () => {
  it('uses deck size that scales with player count', () => {
    expect(getEraDeckSize(2)).toBe(getDeckForPlayerCount(2).length)
    expect(getEraDeckSize(3)).toBeGreaterThan(getEraDeckSize(2))
    expect(getEraDeckSize(4)).toBeGreaterThan(getEraDeckSize(3))
  })

  it('tracks card progress from remaining stack and hands', () => {
    const game = createGameState(2)

    expect(getEraCardProgress(game)).toBeGreaterThan(0)
    expect(getEraCardProgress(game)).toBeLessThan(0.2)
  })

  it('returns a positive round estimate for each supported player count', () => {
    expect(estimateMaxRoundsInEra(createGameState(2))).toBeGreaterThanOrEqual(3)
    expect(estimateMaxRoundsInEra(createGameState(3))).toBeGreaterThanOrEqual(3)
    expect(estimateMaxRoundsInEra(createGameState(4))).toBeGreaterThanOrEqual(3)
  })

  it('marks opening rounds as early and exhausted decks as late', () => {
    const opening = createGameState(4)
    const late = {
      ...opening,
      roundNumber: estimateMaxRoundsInEra(opening),
      stacks: { ...opening.stacks, standard: [] },
      players: opening.players.map((player) => ({ ...player, hand: [] })),
    }

    expect(isEarlyEraPhase(opening)).toBe(true)
    expect(isLateEraPhase(opening)).toBe(false)
    expect(getEraRoundProgress(late)).toBeGreaterThan(0.7)
    expect(isLateEraPhase(late)).toBe(true)
  })
})
