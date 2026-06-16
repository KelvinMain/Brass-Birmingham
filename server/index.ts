import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'

import { createRoomManager } from './roomManager'
import type { ClientMessage, ServerMessage } from '../src/multiplayer/protocol'

const port = Number(process.env.PORT ?? 8787)
const rooms = createRoomManager()
const clients = new Map<string, { roomCode: string; socket: WebSocket }>()

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcastRoom(roomCode: string) {
  for (const [clientId, client] of clients) {
    if (client.roomCode !== roomCode) {
      continue
    }

    send(client.socket, {
      type: 'room-view',
      view: rooms.getPlayerView(roomCode, clientId),
    })
  }
}

function rememberClient(clientId: string, roomCode: string, socket: WebSocket) {
  clients.set(clientId, { roomCode, socket })
  socket.once('close', () => {
    clients.delete(clientId)
  })
}

function handleMessage(socket: WebSocket, rawMessage: string) {
  let message: ClientMessage

  try {
    message = JSON.parse(rawMessage) as ClientMessage
  } catch {
    send(socket, { type: 'error', message: 'Invalid message' })
    return
  }

  try {
    if (message.type === 'create-room') {
      const result = rooms.createRoom({
        hostName: message.hostName,
        playerCount: message.playerCount,
      })
      rememberClient(result.clientId, result.roomCode, socket)
      send(socket, {
        type: 'room-created',
        clientId: result.clientId,
        playerId: result.playerId,
        view: result.view,
      })
      return
    }

    if (message.type === 'join-room') {
      const result = rooms.joinRoom({
        roomCode: message.roomCode,
        playerName: message.playerName,
      })
      rememberClient(result.clientId, result.roomCode, socket)
      send(socket, {
        type: 'room-joined',
        clientId: result.clientId,
        playerId: result.playerId,
        view: result.view,
      })
      broadcastRoom(result.roomCode)
      return
    }

    const client = [...clients.entries()].find(([, currentClient]) => currentClient.socket === socket)

    if (!client) {
      send(socket, { type: 'error', message: 'Join or create a room first' })
      return
    }

    const [clientId] = client

    if (message.type === 'start-room') {
      const view = rooms.startRoom(message.roomCode, clientId)
      send(socket, { type: 'room-view', view })
      broadcastRoom(message.roomCode)
      return
    }

    if (message.type === 'game-action') {
      const result = rooms.applyRoomAction(message.roomCode, clientId, message.action)
      send(socket, {
        type: 'game-action-result',
        accepted: result.accepted,
        view: result.view,
      })
      broadcastRoom(message.roomCode)
    }
  } catch (error) {
    send(socket, {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}

const server = createServer()
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  socket.on('message', (message) => {
    handleMessage(socket, message.toString())
  })
})

server.listen(port, () => {
  console.log(`Brass Birmingham room server listening on ws://localhost:${port}/ws`)
})
