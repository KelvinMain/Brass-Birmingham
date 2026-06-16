import type { GameAction } from '../game/actions'
import type { PlayerCount } from '../game/cards'
import type { RoomView } from './roomTypes'

export type ClientMessage =
  | { type: 'create-room'; hostName: string; playerCount: PlayerCount }
  | { type: 'join-room'; roomCode: string; playerName: string }
  | { type: 'start-room'; roomCode: string }
  | { type: 'game-action'; roomCode: string; action: GameAction }

export type ServerMessage =
  | { type: 'room-created'; clientId: string; playerId: string; view: RoomView }
  | { type: 'room-joined'; clientId: string; playerId: string; view: RoomView }
  | { type: 'room-view'; view: RoomView }
  | { type: 'game-action-result'; accepted: boolean; view: RoomView }
  | { type: 'error'; message: string }
