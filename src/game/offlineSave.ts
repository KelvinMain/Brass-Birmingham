import type { IndustryTilePlacement } from './board'
import type { PlayerCount } from './cards'
import type { LocalGameMode } from './gameMode'
import type { Era, GameState } from './game'

export const OFFLINE_SAVE_STORAGE_KEY = 'brass-birmingham-offline-save'
export const OFFLINE_SAVE_VERSION = 2

export type OfflineSavePayload = {
  version: typeof OFFLINE_SAVE_VERSION
  savedAt: string
  game: GameState
  turnStartSnapshot: GameState | null
  gameMode?: LocalGameMode
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

function isLocalGameMode(value: unknown): value is LocalGameMode {
  return value === 'hotseat' || value === 'vsAi'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIndustryTileArray(value: unknown): value is IndustryTilePlacement[] {
  return Array.isArray(value)
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

  if (!isIndustryTileArray(value.developedIndustries) || !isIndustryTileArray(value.outdatedIndustries)) {
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

function migrateLegacyGameState(value: unknown): GameState | null {
  if (!isRecord(value) || !isPlayerCount(value.playerCount)) {
    return null
  }

  if (!Array.isArray(value.players) || value.players.length !== value.playerCount) {
    return null
  }

  if (!isRecord(value.board)) {
    return null
  }

  const developedIndustries = value.players.flatMap((player) => {
    if (!isRecord(player) || !Array.isArray(player.developedIndustries)) {
      return []
    }

    return player.developedIndustries as IndustryTilePlacement[]
  })

  const players = value.players.map((player) => {
    if (!isRecord(player)) {
      return player
    }

    const { developedIndustries: _removed, ...rest } = player

    return rest
  })

  const migrated = {
    ...value,
    players,
    developedIndustries,
    outdatedIndustries: [],
  }

  return isGameState(migrated) ? migrated : null
}

function hasLegacyPlayerDevelopedIndustries(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.players)) {
    return false
  }

  return value.players.some(
    (player) => isRecord(player) && Array.isArray(player.developedIndustries),
  )
}

function normalizeGameState(value: unknown): GameState | null {
  if (hasLegacyPlayerDevelopedIndustries(value)) {
    return migrateLegacyGameState(value)
  }

  if (isGameState(value)) {
    return value
  }

  return migrateLegacyGameState(value)
}

function parseOfflineSavePayload(raw: string): OfflineSavePayload | null {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== OFFLINE_SAVE_VERSION)) {
      return null
    }

    const game = normalizeGameState(parsed.game)

    if (typeof parsed.savedAt !== 'string' || !game) {
      return null
    }

    const turnStartSnapshot =
      parsed.turnStartSnapshot === null ? null : normalizeGameState(parsed.turnStartSnapshot)

    if (parsed.turnStartSnapshot !== null && !turnStartSnapshot) {
      return null
    }

    return {
      version: OFFLINE_SAVE_VERSION,
      savedAt: parsed.savedAt,
      game,
      turnStartSnapshot,
      gameMode: isLocalGameMode(parsed.gameMode) ? parsed.gameMode : 'hotseat',
    }
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
  gameMode: LocalGameMode = 'hotseat',
): void {
  const payload: OfflineSavePayload = {
    version: OFFLINE_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game,
    turnStartSnapshot,
    gameMode,
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
