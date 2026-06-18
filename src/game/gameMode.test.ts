import { describe, expect, it } from 'vitest'

import { isAiPlayerId, isHumanPlayerId } from './gameMode'

describe('gameMode player identity', () => {
  it('uses player-1 as the human in vs AI regardless of turn order index', () => {
    expect(isHumanPlayerId('player-1', 'vsAi')).toBe(true)
    expect(isAiPlayerId('player-1', 'vsAi')).toBe(false)
    expect(isHumanPlayerId('player-2', 'vsAi')).toBe(false)
    expect(isAiPlayerId('player-2', 'vsAi')).toBe(true)
  })
})
