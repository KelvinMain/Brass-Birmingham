import type { GameAction } from '../game/actions'
import type { PlayerCount } from '../game/cards'
import type { ClientMessage, ServerMessage } from './protocol'

type MultiplayerSocket = {
  onclose: (() => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onopen: (() => void) | null
  send: (message: string) => void
}

type WebSocketConstructor = new (url: string) => MultiplayerSocket

type CreateMultiplayerClientOptions = {
  reconnectDelayMs?: number
  scheduleReconnect?: (callback: () => void, delayMs: number) => void
  socketUrl?: string
  WebSocketCtor?: WebSocketConstructor
}

export type MultiplayerClient = {
  createRoom: (options: { hostName: string; playerCount: PlayerCount }) => void
  joinRoom: (options: { roomCode: string; playerName: string }) => void
  sendAction: (roomCode: string, action: GameAction) => void
  startRoom: (roomCode: string) => void
  subscribe: (listener: (message: ServerMessage) => void) => () => void
}

function defaultSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function createMultiplayerClient({
  reconnectDelayMs = 1000,
  scheduleReconnect = (callback, delayMs) => window.setTimeout(callback, delayMs),
  socketUrl = defaultSocketUrl(),
  WebSocketCtor,
}: CreateMultiplayerClientOptions = {}): MultiplayerClient {
  const SocketCtor = WebSocketCtor ?? (WebSocket as unknown as WebSocketConstructor)
  const listeners = new Set<(message: ServerMessage) => void>()
  const pendingMessages: ClientMessage[] = []
  let isOpen = false
  let isReconnectScheduled = false
  let socket = new SocketCtor(socketUrl)

  const flush = () => {
    while (isOpen && pendingMessages.length > 0) {
      const message = pendingMessages.shift()

      if (message) {
        socket.send(JSON.stringify(message))
      }
    }
  }

  const sendMessage = (message: ClientMessage) => {
    pendingMessages.push(message)
    flush()
  }

  const connect = () => {
    socket.onopen = () => {
      isOpen = true
      isReconnectScheduled = false
      flush()
    }
    socket.onclose = () => {
      isOpen = false

      if (!isReconnectScheduled) {
        isReconnectScheduled = true
        scheduleReconnect(() => {
          socket = new SocketCtor(socketUrl)
          connect()
        }, reconnectDelayMs)
      }
    }
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage
      listeners.forEach((listener) => listener(message))
    }
  }

  connect()

  return {
    createRoom(options) {
      sendMessage({
        type: 'create-room',
        ...options,
      })
    },

    joinRoom(options) {
      sendMessage({
        type: 'join-room',
        roomCode: options.roomCode.trim().toUpperCase(),
        playerName: options.playerName,
      })
    },

    sendAction(roomCode, action) {
      sendMessage({
        type: 'game-action',
        roomCode,
        action,
      })
    },

    startRoom(roomCode) {
      sendMessage({
        type: 'start-room',
        roomCode,
      })
    },

    subscribe(listener) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
  }
}
