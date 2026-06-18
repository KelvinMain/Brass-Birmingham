import { describe, expect, it } from 'vitest'

import { createGameState } from '../game/game'
import { selectPlayerView } from './playerView'

describe('selectPlayerView', () => {
  it('keeps online players viewing their own seat when another player has the turn', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
    }

    const view = selectPlayerView(game, 'player-1')

    expect(view.turnPlayer?.id).toBe('player-2')
    expect(view.viewedPlayer?.id).toBe('player-1')
    expect(view.viewedPlayerIndex).toBe(0)
  })

  it('uses the active turn player for offline play', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
    }

    const view = selectPlayerView(game, null)

    expect(view.turnPlayer?.id).toBe('player-2')
    expect(view.viewedPlayer?.id).toBe('player-2')
    expect(view.viewedPlayerIndex).toBe(1)
  })

  it('keeps the human seat in view during vs AI play', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
    }

    const view = selectPlayerView(game, null, 'vsAi')

    expect(view.turnPlayer?.id).toBe('player-2')
    expect(view.viewedPlayer?.id).toBe('player-1')
    expect(view.viewedPlayerIndex).toBe(0)
  })

  it('keeps player-1 in view during vs AI play after turn order changes', () => {
    const baseGame = createGameState(3)
    const game = {
      ...baseGame,
      activePlayerIndex: 0,
      players: [baseGame.players[1], baseGame.players[0], baseGame.players[2]],
    }

    const view = selectPlayerView(game, null, 'vsAi')

    expect(view.turnPlayer?.id).toBe('player-2')
    expect(view.viewedPlayer?.id).toBe('player-1')
    expect(view.viewedPlayerIndex).toBe(1)
  })
})
