import { beforeEach, describe, expect, it } from 'vitest'

import { createMultiplayerClient } from './client'

class FakeSocket {
  static instances: FakeSocket[] = []

  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  sent: string[] = []
  url: string

  constructor(url: string) {
    this.url = url
    FakeSocket.instances.push(this)
  }

  send(message: string) {
    this.sent.push(message)
  }
}

describe('multiplayer client', () => {
  beforeEach(() => {
    FakeSocket.instances = []
  })

  it('sends room commands after the socket opens', () => {
    const client = createMultiplayerClient({
      socketUrl: 'ws://localhost:8787/ws',
      WebSocketCtor: FakeSocket,
    })
    const socket = FakeSocket.instances[0]

    socket.onopen?.()
    client.createRoom({ hostName: 'Kelvin', playerCount: 2 })
    client.joinRoom({ roomCode: 'ABCD', playerName: 'Friend' })

    expect(socket.url).toBe('ws://localhost:8787/ws')
    expect(socket.sent.map((message) => JSON.parse(message))).toEqual([
      { type: 'create-room', hostName: 'Kelvin', playerCount: 2 },
      { type: 'join-room', roomCode: 'ABCD', playerName: 'Friend' },
    ])
  })

  it('publishes server messages to subscribers', () => {
    const received: unknown[] = []
    const client = createMultiplayerClient({
      socketUrl: 'ws://localhost:8787/ws',
      WebSocketCtor: FakeSocket,
    })
    const socket = FakeSocket.instances.at(-1)

    client.subscribe((message) => received.push(message))
    socket?.onmessage?.({ data: JSON.stringify({ type: 'error', message: 'No room' }) })

    expect(received).toEqual([{ type: 'error', message: 'No room' }])
  })

  it('reconnects and flushes messages queued after close', () => {
    let reconnect: (() => void) | undefined
    const client = createMultiplayerClient({
      socketUrl: 'ws://localhost:8787/ws',
      WebSocketCtor: FakeSocket,
      scheduleReconnect: (callback) => {
        reconnect = callback
      },
    })
    const firstSocket = FakeSocket.instances[0]

    firstSocket.onopen?.()
    firstSocket.onclose?.()
    client.createRoom({ hostName: 'Kelvin', playerCount: 2 })
    reconnect?.()
    const secondSocket = FakeSocket.instances[1]
    secondSocket.onopen?.()

    expect(secondSocket.sent.map((message) => JSON.parse(message))).toEqual([
      { type: 'create-room', hostName: 'Kelvin', playerCount: 2 },
    ])
  })
})
