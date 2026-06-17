import { describe, expect, it } from 'vitest'

import { createGameState } from './game'
import {
  clearOfflineSave,
  formatOfflineSaveAge,
  getOfflineSaveSummary,
  loadOfflineSave,
  OFFLINE_SAVE_STORAGE_KEY,
  writeOfflineSave,
} from './offlineSave'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('offlineSave', () => {
  it('writes, loads, and summarizes an offline game save', () => {
    const storage = createMemoryStorage()
    const game = createGameState(2)
    const turnStartSnapshot = game

    writeOfflineSave(game, turnStartSnapshot, storage)

    const payload = loadOfflineSave(storage)
    const summary = getOfflineSaveSummary(storage)

    expect(payload?.game.playerCount).toBe(2)
    expect(payload?.turnStartSnapshot?.roundNumber).toBe(1)
    expect(summary).toMatchObject({
      playerCount: 2,
      era: 'canal',
      roundNumber: 1,
      activePlayerName: 'Player 1',
    })
  })

  it('clears invalid or ended saves from summary and load', () => {
    const storage = createMemoryStorage()
    const game = createGameState(2)
    const endedGame = { ...game, status: 'ended' as const }

    writeOfflineSave(endedGame, null, storage)

    expect(loadOfflineSave(storage)).toBeNull()
    expect(getOfflineSaveSummary(storage)).toBeNull()
  })

  it('removes saved games', () => {
    const storage = createMemoryStorage()
    const game = createGameState(3)

    writeOfflineSave(game, game, storage)
    clearOfflineSave(storage)

    expect(storage.getItem(OFFLINE_SAVE_STORAGE_KEY)).toBeNull()
    expect(loadOfflineSave(storage)).toBeNull()
  })

  it('formats save age for display', () => {
    const savedAt = new Date('2026-06-17T12:00:00.000Z').toISOString()

    expect(formatOfflineSaveAge(savedAt, Date.parse('2026-06-17T12:00:30.000Z'))).toBe('just now')
    expect(formatOfflineSaveAge(savedAt, Date.parse('2026-06-17T12:05:00.000Z'))).toBe('5 minutes ago')
    expect(formatOfflineSaveAge(savedAt, Date.parse('2026-06-17T13:30:00.000Z'))).toBe('1 hour ago')
  })
})
