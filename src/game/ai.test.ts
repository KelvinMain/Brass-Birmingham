import { describe, expect, it } from 'vitest'

import { runSimpleAiTurn } from './ai'
import { HAND_LIMIT } from './deck'
import { createGameState, getRequiredEndTurnHandSize } from './game'

describe('runSimpleAiTurn', () => {
  it('discards down to the required hand size and passes the turn', () => {
    const game = createGameState(2)
    const activePlayer = game.players[1]
    const requiredHandSize = getRequiredEndTurnHandSize(game)
    const discardCount = activePlayer.hand.length - requiredHandSize
    let randomCall = 0
    const random = () => {
      randomCall += 1
      return 0
    }

    const result = runSimpleAiTurn(
      {
        ...game,
        activePlayerIndex: 1,
      },
      random,
    )

    expect(randomCall).toBe(discardCount)
    expect(result.activePlayerIndex).toBe(0)
    expect(result.players[1].hand).toHaveLength(HAND_LIMIT)
    expect(result.turnsTakenThisRound).toBe(1)
  })
})
