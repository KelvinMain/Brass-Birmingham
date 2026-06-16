import type { PlayerCount } from '../game/cards'
import type { DrawableStacks } from '../game/deck'
import type { GameState } from '../game/game'

export type RoomStatus = 'lobby' | 'playing'

export type RoomPlayer = {
  clientId: string
  playerId: string
  name: string
  isHost: boolean
}

export type RoomView = {
  roomCode: string
  status: RoomStatus
  playerCount: PlayerCount
  players: RoomPlayer[]
  game: GameState | null
  stackCounts: Record<keyof DrawableStacks, number>
}
