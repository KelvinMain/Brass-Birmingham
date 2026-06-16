import { describe, expect, it } from 'vitest'

import { createRoomManager } from './roomManager'

describe('room manager', () => {
  it('creates rooms, joins players, and starts a canonical game', () => {
    const rooms = createRoomManager(() => 0.1)
    const host = rooms.createRoom({ hostName: 'Kelvin', playerCount: 2 })
    const guest = rooms.joinRoom({ roomCode: host.roomCode, playerName: 'Friend' })
    const started = rooms.startRoom(host.roomCode, host.clientId)

    expect(host.roomCode).toMatch(/^[A-Z0-9]{4}$/)
    expect(guest.playerId).toBe('player-2')
    expect(started.status).toBe('playing')
    expect(started.game?.players.map((player) => player.name)).toEqual(['Kelvin', 'Friend'])
  })

  it('rejects game actions from players who do not own the active turn', () => {
    const rooms = createRoomManager(() => 0.2)
    const host = rooms.createRoom({ hostName: 'Kelvin', playerCount: 2 })
    const guest = rooms.joinRoom({ roomCode: host.roomCode, playerName: 'Friend' })
    rooms.startRoom(host.roomCode, host.clientId)
    const guestCard = rooms.getPlayerView(host.roomCode, guest.clientId).game?.players[1].hand[0]

    const result = rooms.applyRoomAction(host.roomCode, guest.clientId, {
      type: 'discard-card',
      playerId: guest.playerId,
      cardId: guestCard?.id ?? '',
    })

    expect(result.accepted).toBe(false)
  })

  it('filters hidden hands from player-specific views', () => {
    const rooms = createRoomManager(() => 0.3)
    const host = rooms.createRoom({ hostName: 'Kelvin', playerCount: 2 })
    const guest = rooms.joinRoom({ roomCode: host.roomCode, playerName: 'Friend' })
    rooms.startRoom(host.roomCode, host.clientId)

    const hostView = rooms.getPlayerView(host.roomCode, host.clientId)
    const guestView = rooms.getPlayerView(host.roomCode, guest.clientId)

    expect(hostView.game?.players[0].hand).toHaveLength(8)
    expect(hostView.game?.players[1].hand).toEqual([])
    expect(guestView.game?.players[0].hand).toEqual([])
    expect(guestView.game?.players[1].hand).toHaveLength(8)
  })
})
