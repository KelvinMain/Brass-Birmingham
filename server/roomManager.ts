import { getDeckForPlayerCount, shuffleDeck } from '../src/game/deck'
import { applyGameAction, canPlayerSubmitAction } from '../src/game/actions'
import type { GameAction } from '../src/game/actions'
import { createGameState } from '../src/game/game'
import type { GameState } from '../src/game/game'
import type { PlayerCount } from '../src/game/cards'
import type { RoomPlayer, RoomStatus, RoomView } from '../src/multiplayer/roomTypes'

const roomCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type CreateRoomResult = {
  clientId: string
  playerId: string
  roomCode: string
  view: RoomView
}

export type JoinRoomResult = {
  clientId: string
  playerId: string
  roomCode: string
  view: RoomView
}

type Room = {
  code: string
  playerCount: PlayerCount
  players: RoomPlayer[]
  game: GameState | null
  status: RoomStatus
}

type RoomManager = {
  applyRoomAction: (
    roomCode: string,
    clientId: string,
    action: GameAction,
  ) => { accepted: boolean; view: RoomView }
  createRoom: (options: { hostName: string; playerCount: PlayerCount }) => CreateRoomResult
  getPlayerView: (roomCode: string, clientId: string) => RoomView
  joinRoom: (options: { roomCode: string; playerName: string }) => JoinRoomResult
  startRoom: (roomCode: string, clientId: string) => RoomView
}

function createRoomCode(random: () => number): string {
  return Array.from({ length: 4 }, () => {
    const index = Math.floor(random() * roomCodeAlphabet.length)
    return roomCodeAlphabet[index] ?? roomCodeAlphabet[0]
  }).join('')
}

function createClientId(nextClientIndex: number): string {
  return `client-${nextClientIndex}`
}

function getRoomOrThrow(rooms: Map<string, Room>, roomCode: string): Room {
  const room = rooms.get(roomCode.toUpperCase())

  if (!room) {
    throw new Error('Room not found')
  }

  return room
}

function getPlayerOrThrow(room: Room, clientId: string): RoomPlayer {
  const player = room.players.find((currentPlayer) => currentPlayer.clientId === clientId)

  if (!player) {
    throw new Error('Player not found')
  }

  return player
}

function filterGameForPlayer(game: GameState | null, playerId: string): GameState | null {
  if (!game) {
    return null
  }

  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId
        ? player
        : {
            ...player,
            hand: [],
          },
    ),
    stacks: {
      ...game.stacks,
      standard: [],
    },
  }
}

function createRoomView(room: Room, playerId: string): RoomView {
  return {
    roomCode: room.code,
    status: room.status,
    playerCount: room.playerCount,
    players: room.players,
    game: filterGameForPlayer(room.game, playerId),
  }
}

export function createRoomManager(random = Math.random): RoomManager {
  const rooms = new Map<string, Room>()
  let nextClientIndex = 1

  const createPlayer = (name: string, isHost: boolean): RoomPlayer => {
    const playerNumber = isHost ? 1 : 0
    return {
      clientId: createClientId(nextClientIndex++),
      playerId: playerNumber ? `player-${playerNumber}` : '',
      name,
      isHost,
    }
  }

  return {
    applyRoomAction(roomCode, clientId, action) {
      const room = getRoomOrThrow(rooms, roomCode)
      const player = getPlayerOrThrow(room, clientId)

      if (!room.game || !canPlayerSubmitAction(room.game, player.playerId, action)) {
        return {
          accepted: false,
          view: createRoomView(room, player.playerId),
        }
      }

      room.game = applyGameAction(room.game, action)

      return {
        accepted: true,
        view: createRoomView(room, player.playerId),
      }
    },

    createRoom({ hostName, playerCount }) {
      let roomCode = createRoomCode(random)

      while (rooms.has(roomCode)) {
        roomCode = createRoomCode(random)
      }

      const host = createPlayer(hostName, true)
      const room: Room = {
        code: roomCode,
        playerCount,
        players: [host],
        game: null,
        status: 'lobby',
      }
      rooms.set(roomCode, room)

      return {
        clientId: host.clientId,
        playerId: host.playerId,
        roomCode,
        view: createRoomView(room, host.playerId),
      }
    },

    getPlayerView(roomCode, clientId) {
      const room = getRoomOrThrow(rooms, roomCode)
      const player = getPlayerOrThrow(room, clientId)

      return createRoomView(room, player.playerId)
    },

    joinRoom({ roomCode, playerName }) {
      const room = getRoomOrThrow(rooms, roomCode)

      if (room.status !== 'lobby') {
        throw new Error('Game already started')
      }

      if (room.players.length >= room.playerCount) {
        throw new Error('Room is full')
      }

      const player: RoomPlayer = {
        clientId: createClientId(nextClientIndex++),
        playerId: `player-${room.players.length + 1}`,
        name: playerName,
        isHost: false,
      }
      room.players.push(player)

      return {
        clientId: player.clientId,
        playerId: player.playerId,
        roomCode: room.code,
        view: createRoomView(room, player.playerId),
      }
    },

    startRoom(roomCode, clientId) {
      const room = getRoomOrThrow(rooms, roomCode)
      const host = getPlayerOrThrow(room, clientId)

      if (!host.isHost) {
        throw new Error('Only the host can start')
      }

      if (room.players.length !== room.playerCount) {
        throw new Error('Room is not full')
      }

      const game = createGameState(
        room.playerCount,
        shuffleDeck(getDeckForPlayerCount(room.playerCount), random),
      )

      room.game = {
        ...game,
        players: game.players.map((player, index) => ({
          ...player,
          name: room.players[index]?.name ?? player.name,
        })),
      }
      room.status = 'playing'

      return createRoomView(room, host.playerId)
    },
  }
}
