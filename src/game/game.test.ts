import { describe, expect, it } from 'vitest'

import { getDeckForPlayerCount, HAND_LIMIT } from './deck.ts'
import {
  createGameState,
  developIndustryTile,
  discardCardFromPlayerHand,
  flipDevelopedIndustryTile,
  flipOutdatedIndustryTile,
  getIncomeMoneyDelta,
  getRequiredEndTurnHandSize,
  getTurnOrderSpendLabel,
  outdateIndustryTile,
  passTurn,
  flipPlayerBoardIndustryTile,
  restoreFlippedPlayerBoardIndustryTile,
  consumeFlippedPlayerBoardIndustryTile,
  removeDevelopedIndustryTile,
  removeOutdatedIndustryTile,
  updatePlayerMoney,
  updatePlayerRoundSpending,
  updatePlayerScore,
} from './game.ts'

describe('Brass: Birmingham income track', () => {
  it('maps income track positions to money deltas', () => {
    expect(getIncomeMoneyDelta(0)).toBe(-10)
    expect(getIncomeMoneyDelta(9)).toBe(-1)
    expect(getIncomeMoneyDelta(10)).toBe(0)
    expect(getIncomeMoneyDelta(11)).toBe(1)
    expect(getIncomeMoneyDelta(12)).toBe(1)
    expect(getIncomeMoneyDelta(30)).toBe(10)
    expect(getIncomeMoneyDelta(31)).toBe(11)
    expect(getIncomeMoneyDelta(33)).toBe(11)
    expect(getIncomeMoneyDelta(61)).toBe(21)
    expect(getIncomeMoneyDelta(64)).toBe(21)
    expect(getIncomeMoneyDelta(97)).toBe(30)
    expect(getIncomeMoneyDelta(99)).toBe(30)
  })

  it('clamps income track positions to the valid 0-99 range', () => {
    expect(getIncomeMoneyDelta(-5)).toBe(-10)
    expect(getIncomeMoneyDelta(120)).toBe(30)
  })
})

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
    expect(game.players.every((player) => player.hand.length === HAND_LIMIT)).toBe(true)
  })

  it('assigns player colors in turn order', () => {
    expect(createGameState(4).players.map((player) => player.color)).toEqual([
      'white',
      'red',
      'purple',
      'yellow',
    ])
    expect(createGameState(2).players.map((player) => player.color)).toEqual([
      'white',
      'red',
    ])
  })

  it('deals eight standard cards to every player and discards one standard card per player', () => {
    const playerCount = 3
    const startingDeck = getDeckForPlayerCount(playerCount)
    const game = createGameState(playerCount)
    const dealtCards = playerCount * HAND_LIMIT

    expect(game.players.map((player) => player.hand)).toEqual([
      startingDeck.slice(0, 8),
      startingDeck.slice(8, 16),
      startingDeck.slice(16, 24),
    ])
    expect(game.discardPile).toEqual(startingDeck.slice(dealtCards, dealtCards + playerCount))
    expect(game.stacks.standard).toEqual(startingDeck.slice(dealtCards + playerCount))
  })

  it('uses the selected player count to build the remaining standard draw deck', () => {
    expect(createGameState(2).stacks.standard).toEqual(getDeckForPlayerCount(2).slice(2 * HAND_LIMIT + 2))
    expect(createGameState(3).stacks.standard).toEqual(getDeckForPlayerCount(3).slice(3 * HAND_LIMIT + 3))
    expect(createGameState(4).stacks.standard).toEqual(getDeckForPlayerCount(4).slice(4 * HAND_LIMIT + 4))
  })

  it('uses the selected player count to initialize merchant tiles and beer', () => {
    expect(Object.keys(createGameState(2).board.merchantTilePlacements)).toHaveLength(5)
    expect(Object.keys(createGameState(2).board.beerResourcePlacements)).toHaveLength(3)
    expect(Object.keys(createGameState(3).board.merchantTilePlacements)).toHaveLength(7)
    expect(Object.keys(createGameState(3).board.beerResourcePlacements)).toHaveLength(4)
    expect(Object.keys(createGameState(4).board.merchantTilePlacements)).toHaveLength(9)
    expect(Object.keys(createGameState(4).board.beerResourcePlacements)).toHaveLength(6)
  })

  it('starts every local player with an eight-card hand limit', () => {
    const game = createGameState(4)

    expect(game.players).toHaveLength(4)
    expect(game.players.every((player) => player.handLimit === HAND_LIMIT)).toBe(true)
  })

  it('starts every local player with tracked VP, income, and round spending counters', () => {
    const game = createGameState(3)

    expect(
      game.players.map((player) => ({
        id: player.id,
        victoryPoints: player.victoryPoints,
        income: player.income,
        moneySpentThisRound: player.moneySpentThisRound,
      })),
    ).toEqual([
      { id: 'player-1', victoryPoints: 0, income: 10, moneySpentThisRound: 0 },
      { id: 'player-2', victoryPoints: 0, income: 10, moneySpentThisRound: 0 },
      { id: 'player-3', victoryPoints: 0, income: 10, moneySpentThisRound: 0 },
    ])
  })

  it('starts in canal era with white as the active player for round one', () => {
    const game = createGameState(4)

    expect(game.era).toBe('canal')
    expect(game.status).toBe('playing')
    expect(game.activePlayerIndex).toBe(0)
    expect(game.players[game.activePlayerIndex].color).toBe('white')
    expect(game.roundNumber).toBe(1)
    expect(game.turnsTakenThisRound).toBe(0)
    expect(game.turnStartHandCount).toBe(HAND_LIMIT)
  })

  it('starts every local player with Brass starting money', () => {
    expect(createGameState(3).players.map((player) => player.money)).toEqual([17, 17, 17])
  })

  it('starts with shared empty developed and outdated industry piles', () => {
    const game = createGameState(3)

    expect(game.developedIndustries).toEqual([])
    expect(game.outdatedIndustries).toEqual([])
  })

  it('starts every local player with no flipped player board industry tiles', () => {
    expect(createGameState(3).players.map((player) => player.flippedPlayerBoardTileIds)).toEqual([
      [],
      [],
      [],
    ])
  })

  it('adds and removes developed industry tiles in the shared pile', () => {
    const game = createGameState(2)
    const tile = {
      id: 'player-1-cotton-1-1',
      industry: 'cotton' as const,
      ownerId: 'player-1',
      tileId: 'cotton-1',
    }

    const developed = developIndustryTile(game, tile)
    const removed = removeDevelopedIndustryTile(developed, tile.id)

    expect(developed.developedIndustries).toEqual([tile])
    expect(removed.developedIndustries).toEqual([])
  })

  it('adds and removes outdated industry tiles in the shared pile', () => {
    const game = createGameState(2)
    const tile = {
      id: 'player-2-pottery-1-1',
      industry: 'pottery' as const,
      ownerId: 'player-2',
      tileId: 'pottery-1',
    }

    const outdated = outdateIndustryTile(game, tile)
    const removed = removeOutdatedIndustryTile(outdated, tile.id)

    expect(outdated.outdatedIndustries).toEqual([tile])
    expect(removed.outdatedIndustries).toEqual([])
  })

  it('flips developed and outdated industry tiles in the shared piles', () => {
    const game = createGameState(2)
    const developedTile = {
      id: 'player-1-cotton-1-1',
      industry: 'cotton' as const,
      ownerId: 'player-1',
      tileId: 'cotton-1',
    }
    const outdatedTile = {
      id: 'player-2-pottery-1-1',
      industry: 'pottery' as const,
      ownerId: 'player-2',
      tileId: 'pottery-1',
    }
    const withTiles = outdateIndustryTile(developIndustryTile(game, developedTile), outdatedTile)
    const flippedDeveloped = flipDevelopedIndustryTile(withTiles, developedTile.id)
    const flippedOutdated = flipOutdatedIndustryTile(flippedDeveloped, outdatedTile.id)

    expect(flippedDeveloped.developedIndustries[0]).toMatchObject({
      flipped: true,
    })
    expect(flippedOutdated.outdatedIndustries[0]).toMatchObject({
      flipped: true,
    })
  })

  it('flips the top remaining player board tile for one player', () => {
    const game = createGameState(2)
    const flipped = flipPlayerBoardIndustryTile(game, 'player-1', 'cotton-2')
    const unflipped = flipPlayerBoardIndustryTile(flipped, 'player-1', 'cotton-2')

    expect(flipped.players[0].flippedPlayerBoardTileIds).toEqual(['cotton-2'])
    expect(flipped.players[1].flippedPlayerBoardTileIds).toEqual([])
    expect(unflipped.players[0].flippedPlayerBoardTileIds).toEqual([])
  })

  it('consumes and restores flipped player board industry tiles after drag/drop', () => {
    const game = flipPlayerBoardIndustryTile(createGameState(2), 'player-1', 'cotton-2')
    const consumed = consumeFlippedPlayerBoardIndustryTile(game, 'player-1', 'cotton-2')
    const restored = restoreFlippedPlayerBoardIndustryTile(consumed, 'player-1', 'cotton-2')

    expect(consumed.players[0].flippedPlayerBoardTileIds).toEqual([])
    expect(restored.players[0].flippedPlayerBoardTileIds).toEqual(['cotton-2'])
    expect(consumeFlippedPlayerBoardIndustryTile(restored, 'player-1', 'cotton-3')).toEqual(restored)
  })

  it('updates one player score counter without changing other players', () => {
    const game = createGameState(2)
    const afterVp = updatePlayerScore(game, 'player-1', 'victoryPoints', 3)
    const afterIncome = updatePlayerScore(afterVp, 'player-2', 'income', -2)

    expect(afterIncome.players[0]).toMatchObject({
      id: 'player-1',
      victoryPoints: 3,
      income: 10,
    })
    expect(afterIncome.players[1]).toMatchObject({
      id: 'player-2',
      victoryPoints: 0,
      income: 8,
    })
  })

  it('updates one player money without changing other players', () => {
    const game = createGameState(2)
    const afterGain = updatePlayerMoney(game, 'player-1', 10)
    const afterSpend = updatePlayerMoney(afterGain, 'player-1', -5)

    expect(afterSpend.players[0]).toMatchObject({
      id: 'player-1',
      money: 22,
    })
    expect(afterSpend.players[1]).toMatchObject({
      id: 'player-2',
      money: 17,
    })
  })

  it('updates one player round spending and adjusts money without changing other players', () => {
    const game = createGameState(2)
    const afterSpend = updatePlayerRoundSpending(game, 'player-1', 7)
    const afterRefund = updatePlayerRoundSpending(afterSpend, 'player-1', -2)
    const afterBelowZero = updatePlayerRoundSpending(afterRefund, 'player-2', -3)

    expect(afterBelowZero.players[0]).toMatchObject({
      id: 'player-1',
      money: 12,
      moneySpentThisRound: 5,
    })
    expect(afterBelowZero.players[1]).toMatchObject({
      id: 'player-2',
      money: 17,
      moneySpentThisRound: 0,
    })
  })

  it('ignores money updates for unknown players', () => {
    const game = createGameState(2)

    expect(updatePlayerMoney(game, 'missing-player', 1)).toEqual(game)
  })

  it('ignores round spending updates for unknown players', () => {
    const game = createGameState(2)

    expect(updatePlayerRoundSpending(game, 'missing-player', 1)).toEqual(game)
  })

  it('ignores score updates for unknown players', () => {
    const game = createGameState(2)

    expect(updatePlayerScore(game, 'missing-player', 'income', 1)).toEqual(game)
  })

  it('moves a discarded standard card from a player hand to the shared discard pile', () => {
    const game = createGameState(4)
    const card = game.stacks.standard[0]
    const startingDiscardPile = game.discardPile
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
    expect(result.discardPile).toEqual([...startingDiscardPile, card])
    expect(result.stacks.standard).toEqual(gameWithHand.stacks.standard)
  })

  it('returns a discarded wild location card to the wild location stack', () => {
    const game = createGameState(4)
    const card = game.stacks.wildLocation[0]
    const startingDiscardPile = game.discardPile
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
    expect(result.discardPile).toEqual(startingDiscardPile)
    expect(result.stacks.wildLocation).toEqual([...gameWithHand.stacks.wildLocation, card])
  })

  it('returns a discarded wild industry card to the wild industry stack', () => {
    const game = createGameState(4)
    const card = game.stacks.wildIndustry[0]
    const startingDiscardPile = game.discardPile
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
    expect(result.discardPile).toEqual(startingDiscardPile)
    expect(result.stacks.wildIndustry).toEqual([...gameWithHand.stacks.wildIndustry, card])
  })
})

describe('Brass: Birmingham turn passing', () => {
  it('requires seven cards to pass during the first round', () => {
    const game = createGameState(3)
    const activeCard = game.players[0].hand[0]
    const readyToPass = discardCardFromPlayerHand(game, 'player-1', activeCard.id)

    expect(getRequiredEndTurnHandSize(game)).toBe(7)
    expect(passTurn(game)).toBe(game)
    expect(passTurn(readyToPass).activePlayerIndex).toBe(1)
  })

  it('refills the active player from the standard deck and advances to the next player', () => {
    const game = createGameState(3)
    const activeCard = game.players[0].hand[0]
    const readyToPass = discardCardFromPlayerHand(game, 'player-1', activeCard.id)
    const result = passTurn(readyToPass)

    expect(result.players[0].hand).toHaveLength(HAND_LIMIT)
    expect(result.players[0].hand.at(-1)).toEqual(readyToPass.stacks.standard[0])
    expect(result.stacks.standard).toEqual(readyToPass.stacks.standard.slice(1))
    expect(result.activePlayerIndex).toBe(1)
    expect(result.turnsTakenThisRound).toBe(1)
    expect(result.turnStartHandCount).toBe(HAND_LIMIT)
  })

  it('requires two fewer cards than the turn start hand count after the first round', () => {
    const game = {
      ...createGameState(2),
      roundNumber: 2,
      turnsTakenThisRound: 0,
      turnStartHandCount: 8,
      players: createGameState(2).players.map((player, index) =>
        index === 0 ? { ...player, hand: player.hand.slice(0, 6) } : player,
      ),
    }

    expect(getRequiredEndTurnHandSize(game)).toBe(6)
    expect(passTurn(game).activePlayerIndex).toBe(1)
  })

  it('allows a partial refill when the standard deck has fewer cards than needed', () => {
    const game = {
      ...createGameState(2),
      roundNumber: 2,
      turnsTakenThisRound: 0,
      turnStartHandCount: 8,
      stacks: {
        ...createGameState(2).stacks,
        standard: createGameState(2).stacks.standard.slice(0, 1),
      },
      players: createGameState(2).players.map((player, index) =>
        index === 0 ? { ...player, hand: player.hand.slice(0, 6) } : player,
      ),
    }

    const result = passTurn(game)

    expect(result.players[0].hand).toHaveLength(7)
    expect(result.stacks.standard).toEqual([])
    expect(result.activePlayerIndex).toBe(1)
  })

  it('resolves income and starts the next round after every player passes', () => {
    const baseGame = createGameState(2)
    const game = {
      ...baseGame,
      players: baseGame.players.map((player, index) => ({
        ...player,
        income: index === 0 ? 11 : 9,
        hand: player.hand.slice(0, 7),
      })),
    }

    const afterPlayerOne = passTurn(game)
    const afterRound = passTurn(afterPlayerOne)

    expect(afterRound.players.map((player) => player.money)).toEqual([18, 16])
    expect(afterRound.roundNumber).toBe(2)
    expect(afterRound.turnsTakenThisRound).toBe(0)
    expect(afterRound.activePlayerIndex).toBe(0)
    expect(afterRound.turnStartHandCount).toBe(HAND_LIMIT)
  })

  it('orders the next round by least money spent and preserves previous order for ties', () => {
    const baseGame = createGameState(4)
    const game = {
      ...baseGame,
      players: [baseGame.players[2], baseGame.players[0], baseGame.players[3], baseGame.players[1]].map(
        (player) => ({
          ...player,
          hand: player.hand.slice(0, 7),
          moneySpentThisRound:
            player.id === 'player-1'
              ? 5
              : player.id === 'player-2'
                ? 1
                : player.id === 'player-3'
                  ? 1
                  : 8,
        }),
      ),
    }

    const afterOne = passTurn(game)
    const afterTwo = passTurn(afterOne)
    const afterThree = passTurn(afterTwo)
    const afterRound = passTurn(afterThree)

    expect(afterRound.players.map((player) => player.id)).toEqual([
      'player-3',
      'player-2',
      'player-1',
      'player-4',
    ])
    expect(afterRound.players.map((player) => player.moneySpentThisRound)).toEqual([0, 0, 0, 0])
    expect(afterRound.activePlayerIndex).toBe(0)
  })

  it('moves the lowest spender first and keeps previous order for tied higher spenders', () => {
    const baseGame = createGameState(3)
    const game = {
      ...baseGame,
      players: baseGame.players.map((player, index) => ({
        ...player,
        hand: player.hand.slice(0, 7),
        moneySpentThisRound: index === 1 ? 5 : 10,
      })),
    }

    const afterOne = passTurn(game)
    const afterTwo = passTurn(afterOne)
    const afterRound = passTurn(afterTwo)

    expect(afterRound.players.map((player) => player.id)).toEqual([
      'player-2',
      'player-1',
      'player-3',
    ])
  })

  it('shows spend labels only for players whose turn has started this round', () => {
    const baseGame = createGameState(4)
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      turnsTakenThisRound: 1,
      players: baseGame.players.map((player, index) => ({
        ...player,
        moneySpentThisRound: [4, 0, 7, 0][index],
      })),
    }

    expect(game.players.map((_, index) => getTurnOrderSpendLabel(game, index))).toEqual([
      '4',
      '0',
      '',
      '',
    ])
  })

  it('enters rail era after canal cards and hands are exhausted at round end', () => {
    const railDeck = getDeckForPlayerCount(2)
    const baseGame = createGameState(2)
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      roundNumber: 4,
      turnsTakenThisRound: 1,
      turnStartHandCount: 2,
      stacks: {
        ...baseGame.stacks,
        standard: [],
      },
      players: baseGame.players.map((player, index) => ({
        ...player,
        income: index === 0 ? 10 : 11,
        hand: [],
      })),
    }

    const result = passTurn(game, { railDeck })

    expect(result.era).toBe('rail')
    expect(result.status).toBe('playing')
    expect(result.players.map((player) => player.money)).toEqual([17, 18])
    expect(result.players.map((player) => player.hand)).toEqual([
      railDeck.slice(0, 8),
      railDeck.slice(8, 16),
    ])
    expect(result.discardPile).toEqual([])
    expect(result.stacks.standard).toEqual(railDeck.slice(16))
    expect(result.activePlayerIndex).toBe(0)
    expect(result.turnsTakenThisRound).toBe(0)
    expect(result.turnStartHandCount).toBe(HAND_LIMIT)
  })

  it('ends the game after rail cards and hands are exhausted without final income', () => {
    const baseGame = createGameState(2)
    const game = {
      ...baseGame,
      era: 'rail' as const,
      activePlayerIndex: 1,
      roundNumber: 12,
      turnsTakenThisRound: 1,
      turnStartHandCount: 2,
      stacks: {
        ...baseGame.stacks,
        standard: [],
      },
      players: baseGame.players.map((player) => ({
        ...player,
        income: 11,
        hand: [],
      })),
    }

    const result = passTurn(game)

    expect(result.status).toBe('ended')
    expect(result.era).toBe('rail')
    expect(result.players.map((player) => player.money)).toEqual([17, 17])
  })
})
