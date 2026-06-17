import type { PlayerCount } from './cards'
import type { Era, GameState } from './game'

export const OFFLINE_SAVE_STORAGE_KEY = 'brass-birmingham-offline-save'
export const OFFLINE_SAVE_VERSION = 1

export type OfflineSavePayload = {
  version: typeof OFFLINE_SAVE_VERSION
  savedAt: string
  game: GameState
  turnStartSnapshot: GameState | null
}

export type OfflineSaveSummary = {
  playerCount: PlayerCount
  era: Era
  roundNumber: number
  activePlayerName: string
  savedAt: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const playerCounts: PlayerCount[] = [2, 3, 4]

function isPlayerCount(value: unknown): value is PlayerCount {
  return typeof value === 'number' && playerCounts.includes(value as PlayerCount)
}

function isEra(value: unknown): value is Era {
  return value === 'canal' || value === 'rail'
}

function isGameStatus(value: unknown): value is GameState['status'] {
  return value === 'playing' || value === 'ended'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false
  }

  if (!isPlayerCount(value.playerCount)) {
    return false
  }

  if (!Array.isArray(value.players) || value.players.length !== value.playerCount) {
    return false
  }

  if (!isRecord(value.board)) {
    return false
  }

  if (!isEra(value.era) || !isGameStatus(value.status)) {
    return false
  }

  if (typeof value.activePlayerIndex !== 'number') {
    return false
  }

  if (typeof value.roundNumber !== 'number' || typeof value.turnsTakenThisRound !== 'number') {
    return false
  }

  if (typeof value.turnStartHandCount !== 'number') {
    return false
  }

  if (!Array.isArray(value.discardPile) || !isRecord(value.stacks)) {
    return false
  }

  return true
}

function parseOfflineSavePayload(raw: string): OfflineSavePayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!isRecord(parsed) || parsed.version !== OFFLINE_SAVE_VERSION) {
      return null
    }

    if (typeof parsed.savedAt !== 'string' || !isGameState(parsed.game)) {
      return null
    }

    if (parsed.turnStartSnapshot !== null && !isGameState(parsed.turnStartSnapshot)) {
      return null
    }

    return parsed as OfflineSavePayload
  } catch {
    return null
  }
}

export function getOfflineSaveSummary(
  storage: StorageLike = localStorage,
): OfflineSaveSummary | null {
  const raw = storage.getItem(OFFLINE_SAVE_STORAGE_KEY)

  if (!raw) {
    return null
  }

  const payload = parseOfflineSavePayload(raw)

  if (!payload || payload.game.status !== 'playing') {
    return null
  }

  const activePlayer = payload.game.players[payload.game.activePlayerIndex]

  return {
    playerCount: payload.game.playerCount,
    era: payload.game.era,
    roundNumber: payload.game.roundNumber,
    activePlayerName: activePlayer?.name ?? 'Unknown player',
    savedAt: payload.savedAt,
  }
}

export function loadOfflineSave(storage: StorageLike = localStorage): OfflineSavePayload | null {
  const raw = storage.getItem(OFFLINE_SAVE_STORAGE_KEY)

  if (!raw) {
    return null
  }

  const payload = parseOfflineSavePayload(raw)

  if (!payload || payload.game.status !== 'playing') {
    return null
  }

  return payload
}

export function writeOfflineSave(
  game: GameState,
  turnStartSnapshot: GameState | null,
  storage: StorageLike = localStorage,
): void {
  const payload: OfflineSavePayload = {
    version: OFFLINE_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game,
    turnStartSnapshot,
  }

  storage.setItem(OFFLINE_SAVE_STORAGE_KEY, JSON.stringify(payload))
}

export function clearOfflineSave(storage: StorageLike = localStorage): void {
  storage.removeItem(OFFLINE_SAVE_STORAGE_KEY)
}

export function formatOfflineSaveAge(savedAt: string, now = Date.now()): string {
  const savedTime = Date.parse(savedAt)

  if (Number.isNaN(savedTime)) {
    return 'recently'
  }

  const elapsedMinutes = Math.max(0, Math.floor((now - savedTime) / 60_000))

  if (elapsedMinutes < 1) {
    return 'just now'
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} minute${elapsedMinutes === 1 ? '' : 's'} ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `${elapsedHours} hour${elapsedHours === 1 ? '' : 's'} ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)

  return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
}
