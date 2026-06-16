import { describe, expect, it } from 'vitest'

import { createGameState } from './game.ts'
import { applyGameAction, canPlayerSubmitAction } from './actions.ts'

describe('game actions', () => {
  it('applies serializable active-player actions', () => {
    const game = createGameState(2)
    const card = game.players[0].hand[0]

    const afterDiscard = applyGameAction(game, {
      type: 'discard-card',
      playerId: 'player-1',
      cardId: card.id,
    })
    const afterPass = applyGameAction(afterDiscard, {
      type: 'pass-turn',
      playerId: 'player-1',
    })

    expect(afterDiscard.players[0].hand).toHaveLength(7)
    expect(afterDiscard.discardPile.at(-1)).toEqual(card)
    expect(afterPass.activePlayerIndex).toBe(1)
  })

  it('rejects turn-owned actions from non-active players', () => {
    const game = createGameState(2)
    const card = game.players[1].hand[0]

    expect(canPlayerSubmitAction(game, 'player-2', { type: 'pass-turn', playerId: 'player-2' })).toBe(
      false,
    )
    expect(
      applyGameAction(game, {
        type: 'discard-card',
        playerId: 'player-2',
        cardId: card.id,
      }),
    ).toBe(game)
  })

  it('applies shared board and counter actions', () => {
    const game = createGameState(2)
    const tile = {
      id: 'player-1-cotton-1',
      industry: 'cotton' as const,
      ownerId: 'player-1',
      tileId: 'cotton-1',
    }

    const withTile = applyGameAction(game, {
      type: 'place-industry-tile',
      playerId: 'player-1',
      spaceId: 'birmingham-1',
      tile,
    })
    const withScore = applyGameAction(withTile, {
      type: 'update-player-score',
      playerId: 'player-1',
      targetPlayerId: 'player-2',
      field: 'victoryPoints',
      delta: 3,
    })

    expect(withTile.board.industryPlacements['birmingham-1']).toEqual(tile)
    expect(withScore.players[1].victoryPoints).toBe(3)
  })
})
