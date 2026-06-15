import { describe, expect, it } from 'vitest'

import { getDeckForPlayerCount, HAND_LIMIT } from './deck.ts'
import { createGameState, discardCardFromPlayerHand, updatePlayerScore } from './game.ts'

describe('Brass: Birmingham game setup', () => {
  it('creates one local hand per selected player', () => {
    const game = createGameState(3)

    expect(game.playerCount).toBe(3)
    expect(game.players).toHaveLength(3)
    expect(game.players.map((player) => player.name)).toEqual([
      'Player 1',
      'Player 2',
      'Player 3',
    ])
    expect(game.players.every((player) => player.hand.length === 0)).toBe(true)
  })

  it('uses the selected player count to build the standard draw deck', () => {
    expect(createGameState(2).stacks.standard).toEqual(getDeckForPlayerCount(2))
    expect(createGameState(3).stacks.standard).toEqual(getDeckForPlayerCount(3))
    expect(createGameState(4).stacks.standard).toEqual(getDeckForPlayerCount(4))
  })

  it('starts every local player with an eight-card hand limit', () => {
    const game = createGameState(4)

    expect(game.players).toHaveLength(4)
    expect(game.players.every((player) => player.handLimit === HAND_LIMIT)).toBe(true)
  })

  it('starts every local player with tracked VP and income counters', () => {
    const game = createGameState(3)

    expect(
      game.players.map((player) => ({
        id: player.id,
        victoryPoints: player.victoryPoints,
        income: player.income,
      })),
    ).toEqual([
      { id: 'player-1', victoryPoints: 0, income: 0 },
      { id: 'player-2', victoryPoints: 0, income: 0 },
      { id: 'player-3', victoryPoints: 0, income: 0 },
    ])
  })

  it('updates one player score counter without changing other players', () => {
    const game = createGameState(2)
    const afterVp = updatePlayerScore(game, 'player-1', 'victoryPoints', 3)
    const afterIncome = updatePlayerScore(afterVp, 'player-2', 'income', -2)

    expect(afterIncome.players[0]).toMatchObject({
      id: 'player-1',
      victoryPoints: 3,
      income: 0,
    })
    expect(afterIncome.players[1]).toMatchObject({
      id: 'player-2',
      victoryPoints: 0,
      income: -2,
    })
  })

  it('ignores score updates for unknown players', () => {
    const game = createGameState(2)

    expect(updatePlayerScore(game, 'missing-player', 'income', 1)).toEqual(game)
  })

  it('moves a discarded standard card from a player hand to the shared discard pile', () => {
    const game = createGameState(4)
    const card = game.stacks.standard[0]
    const gameWithHand = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card] } : player,
      ),
      stacks: {
        ...game.stacks,
        standard: game.stacks.standard.slice(1),
      },
    }

    const result = discardCardFromPlayerHand(gameWithHand, 'player-1', card.id)

    expect(result.players[0].hand).toEqual([])
    expect(result.discardPile).toEqual([card])
    expect(result.stacks.standard).toEqual(gameWithHand.stacks.standard)
  })

  it('returns a discarded wild location card to the wild location stack', () => {
    const game = createGameState(4)
    const card = game.stacks.wildLocation[0]
    const gameWithHand = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card] } : player,
      ),
      stacks: {
        ...game.stacks,
        wildLocation: game.stacks.wildLocation.slice(1),
      },
    }

    const result = discardCardFromPlayerHand(gameWithHand, 'player-1', card.id)

    expect(result.players[0].hand).toEqual([])
    expect(result.discardPile).toEqual([])
    expect(result.stacks.wildLocation).toEqual([...gameWithHand.stacks.wildLocation, card])
  })

  it('returns a discarded wild industry card to the wild industry stack', () => {
    const game = createGameState(4)
    const card = game.stacks.wildIndustry[0]
    const gameWithHand = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card] } : player,
      ),
      stacks: {
        ...game.stacks,
        wildIndustry: game.stacks.wildIndustry.slice(1),
      },
    }

    const result = discardCardFromPlayerHand(gameWithHand, 'player-1', card.id)

    expect(result.players[0].hand).toEqual([])
    expect(result.discardPile).toEqual([])
    expect(result.stacks.wildIndustry).toEqual([...gameWithHand.stacks.wildIndustry, card])
  })
})
