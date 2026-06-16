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
})
