import { describe, expect, it } from 'vitest'

import {
  createRandomAiAgent,
  executeAiCandidateAction,
  getAiCandidateActions,
  getLoanIncomeAfterReduction,
  runAiTurn,
} from './aiActions'
import type { AiCandidateAction } from './aiActions'
import {
  placeIndustryResourceCube,
  placeIndustryTile,
  placeLinkTile,
} from './board'
import type { BoardState } from './board'
import { createGameState, discardCardFromPlayerHand, getActionsPerTurn, getRequiredEndTurnHandSize, passTurn } from './game'

function connectCannockToMarket(board: BoardState, ownerId: string): BoardState {
  const link = { kind: 'canal' as const, ownerId }

  return placeLinkTile(
    placeLinkTile(
      placeLinkTile(board, 'cannock-walsall', { id: 'cannock-walsall-link', ...link }),
      'walsall-birmingham',
      { id: 'walsall-birmingham-link', ...link },
    ),
    'birmingham-oxford',
    { id: 'birmingham-oxford-link', ...link },
  )
}

describe('getActionsPerTurn', () => {
  it('requires one action during canal round 1', () => {
    const game = createGameState(2)

    expect(getActionsPerTurn(game)).toBe(1)
    expect(getRequiredEndTurnHandSize(game)).toBe(7)
  })

  it('requires two actions after canal round 1', () => {
    const game = {
      ...createGameState(2),
      roundNumber: 2,
      turnStartHandCount: 8,
    }

    expect(getActionsPerTurn(game)).toBe(2)
  })
})

describe('getAiCandidateActions', () => {
  it('offers scout only when the AI can discard three non-wild-blocked cards', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const hand = game.players[1].hand
    const withTwoCards = {
      ...game,
      activePlayerIndex: 1,
      players: game.players.map((player, index) =>
        index === 1 ? { ...player, hand: hand.slice(0, 2) } : player,
      ),
    }
    const withWildCard = {
      ...game,
      activePlayerIndex: 1,
      players: game.players.map((player, index) =>
        index === 1
          ? { ...player, hand: [...hand.slice(0, 2), game.stacks.wildLocation[0]] }
          : player,
      ),
    }

    expect(getAiCandidateActions(game, playerId).some((candidate) => candidate.kind === 'scout')).toBe(true)
    expect(getAiCandidateActions(withTwoCards, playerId).some((candidate) => candidate.kind === 'scout')).toBe(false)
    expect(getAiCandidateActions(withWildCard, playerId).some((candidate) => candidate.kind === 'scout')).toBe(false)
  })

  it('offers sell actions only for own connected unflipped tiles with required beer available', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const boardWithCotton = {
      ...placeIndustryTile(baseGame.board, 'birmingham-1', {
        id: 'cotton-mill',
        industry: 'cotton',
        ownerId: playerId,
        tileId: 'cotton-1',
      }),
      merchantTilePlacements: {
        'merchant-tile-6': {
          id: 'merchant-tile-face-cotton',
          tileIndex: 2,
          kind: 'cotton' as const,
          label: 'Cotton',
          spaceId: 'merchant-tile-6',
        },
      },
      beerResourcePlacements: {
        'board-beer-6': {
          id: 'merchant-beer',
          kind: 'beer' as const,
          spaceId: 'board-beer-6',
        },
      },
    }
    const connectedGame = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeLinkTile(boardWithCotton, 'birmingham-oxford', {
        id: 'market-link',
        kind: 'canal',
        ownerId: playerId,
      }),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card] } : player,
      ),
    }
    const disconnectedGame = {
      ...connectedGame,
      board: boardWithCotton,
    }
    const noBeerGame = {
      ...connectedGame,
      board: {
        ...connectedGame.board,
        beerResourcePlacements: {},
      },
    }

    const sellActions = getAiCandidateActions(connectedGame, playerId).filter(
      (candidate) => candidate.kind === 'sell',
    )

    expect(sellActions.some((action) => action.sales[0].spaceId === 'birmingham-1')).toBe(true)
    expect(getAiCandidateActions(disconnectedGame, playerId).some((action) => action.kind === 'sell')).toBe(false)
    expect(getAiCandidateActions(noBeerGame, playerId).some((action) => action.kind === 'sell')).toBe(false)
  })

  it('offers pottery sell actions when a matching merchant is connected', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeLinkTile(
        placeLinkTile(
          {
            ...placeIndustryTile(baseGame.board, 'coventry-1', {
              id: 'pottery',
              industry: 'pottery',
              ownerId: playerId,
              tileId: 'pottery-2',
            }),
            merchantTilePlacements: {
              'merchant-tile-6': {
                id: 'merchant-tile-face-pottery',
                tileIndex: 6,
                kind: 'pottery' as const,
                label: 'Pottery',
                spaceId: 'merchant-tile-6',
              },
            },
            beerResourcePlacements: {
              'board-beer-6': {
                id: 'merchant-beer',
                kind: 'beer' as const,
                spaceId: 'board-beer-6',
              },
            },
          },
          'birmingham-coventry',
          {
            id: 'coventry-link',
            kind: 'canal',
            ownerId: playerId,
          },
        ),
        'birmingham-oxford',
        {
          id: 'market-link',
          kind: 'canal',
          ownerId: playerId,
        },
      ),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card] } : player,
      ),
    }

    const candidates = getAiCandidateActions(game, playerId)

    expect(candidates.some((candidate) => candidate.kind === 'sell')).toBe(true)
  })

  it('restricts build candidates by card type and player network', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const industryCard = baseGame.stacks.standard.find(
      (card) => card.kind === 'industry' && card.industries.includes('pottery'),
    )
    const locationCard = baseGame.stacks.standard.find(
      (card) => card.kind === 'location' && card.name === 'Coventry',
    )

    expect(industryCard).toBeDefined()
    expect(locationCard).toBeDefined()

    const gameWithNetwork = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'iron-works',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-1',
      }),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [industryCard!, locationCard!] } : player,
      ),
    }
    const gameWithoutNetwork = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [industryCard!] } : player,
      ),
    }

    const networkedBuilds = getAiCandidateActions(gameWithNetwork, playerId).filter(
      (candidate) => candidate.kind === 'build-industry',
    )
    const firstIndustryBuilds = getAiCandidateActions(gameWithoutNetwork, playerId).filter(
      (candidate) => candidate.kind === 'build-industry',
    )

    expect(
      networkedBuilds.some(
        (action) => action.cardId === industryCard!.id && action.cityName === 'Coventry',
      ),
    ).toBe(false)
    expect(
      networkedBuilds.some(
        (action) => action.cardId === locationCard!.id && action.cityName === 'Coventry',
      ),
    ).toBe(true)
    expect(firstIndustryBuilds.some((action) => action.cityName === 'Coventry')).toBe(true)
  })

  it('offers a loan only when income can drop three income levels', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
      players: createGameState(2).players.map((player, index) =>
        index === 1 ? { ...player, income: 10 } : player,
      ),
    }
    const noLoanGame = {
      ...game,
      players: game.players.map((player, index) =>
        index === 1 ? { ...player, income: 2 } : player,
      ),
    }

    expect(getLoanIncomeAfterReduction(30)).toBe(24)
    expect(getLoanIncomeAfterReduction(10)).toBe(7)
    expect(getAiCandidateActions(game, game.players[1].id).some((action) => action.kind === 'loan')).toBe(true)
    expect(getAiCandidateActions(noLoanGame, noLoanGame.players[1].id).some((action) => action.kind === 'loan')).toBe(false)
  })

  it('offers canal network actions only when payable and adjacent to the player network', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withPlayerNetwork = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'iron-works-tile',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-1',
      }),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 3 } : player,
      ),
    }
    const cannotPay = {
      ...withPlayerNetwork,
      players: withPlayerNetwork.players.map((player, index) =>
        index === 1 ? { ...player, money: 2 } : player,
      ),
    }

    const networkActions = getAiCandidateActions(withPlayerNetwork, playerId).filter(
      (action) => action.kind === 'network',
    )
    const unaffordableNetworkActions = getAiCandidateActions(cannotPay, playerId).filter(
      (action) => action.kind === 'network',
    )

    expect(networkActions.some((action) => action.linkPlacements[0].spaceId === 'birmingham-coventry')).toBe(true)
    expect(networkActions.some((action) => action.linkPlacements[0].spaceId === 'cannock-walsall')).toBe(false)
    expect(unaffordableNetworkActions).toEqual([])
  })
})

describe('createRandomAiAgent', () => {
  it('chooses a candidate action using the supplied random source', () => {
    const game = createGameState(2)
    const card = game.players[1].hand[0]
    const candidates: AiCandidateAction[] = [
      {
        kind: 'discard',
        cardId: card.id,
        description: 'Discarded first card',
      },
      {
        kind: 'loan',
        cardId: card.id,
        incomeBefore: 10,
        incomeAfter: 7,
        description: 'Took a loan, reduced income level from 10 to 7',
      },
    ]

    const agent = createRandomAiAgent(() => 0.75)

    expect(agent.chooseAction(candidates)).toBe(candidates[1])
  })
})

describe('executeAiCandidateAction', () => {
  it('takes a loan and logs the income level reduction', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const action: AiCandidateAction = {
      kind: 'loan',
      cardId: card.id,
      incomeBefore: 30,
      incomeAfter: 24,
      description: 'Took a loan, reduced income level from 30 to 24',
    }
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, income: 30, money: 17, hand: [card] } : player,
      ),
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1]).toMatchObject({
      income: 24,
      money: 47,
    })
    expect(result.game.players[1].hand).toEqual([])
    expect(result.description).toBe('Took a loan, reduced income level from 30 to 24')
  })

  it('develops one or two lowest tiles and consumes free iron from iron works first', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withIronWorks = placeIndustryResourceCube(
      placeIndustryResourceCube(
        placeIndustryTile(baseGame.board, 'birmingham-3', {
          id: 'iron-works-tile',
          industry: 'iron',
          ownerId: 'player-1',
          tileId: 'iron-1',
        }),
        'birmingham-3',
        { id: 'iron-cube-1', kind: 'iron', spaceId: 'birmingham-3' },
      ),
      'birmingham-3',
      { id: 'iron-cube-2', kind: 'iron', spaceId: 'birmingham-3' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: withIronWorks,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card] } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'develop',
      cardId: card.id,
      tiles: [
        { playerBoardTileId: 'coal-1', industry: 'coal', level: 1 },
        { playerBoardTileId: 'coal-2', industry: 'coal', level: 2 },
      ],
      description: 'Developed Coal (level 1) and Coal (level 2), consumed 2 iron from iron mine in Birmingham',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.developedIndustries.map((tile) => tile.tileId)).toEqual(['coal-1', 'coal-2'])
    expect(result.game.board.industryResourcePlacements['birmingham-3']).toEqual([])
    expect(result.description).toBe('Developed Coal (level 1) and Coal (level 2), consumed 2 iron from iron mine in Birmingham')
  })

  it('buys remaining develop iron from the market after free iron is exhausted', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withOneIron = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'iron-works-tile',
        industry: 'iron',
        ownerId: 'player-1',
        tileId: 'iron-1',
      }),
      'birmingham-3',
      { id: 'iron-cube-1', kind: 'iron', spaceId: 'birmingham-3' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: withOneIron,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'develop',
      cardId: card.id,
      tiles: [
        { playerBoardTileId: 'coal-1', industry: 'coal', level: 1 },
        { playerBoardTileId: 'coal-2', industry: 'coal', level: 2 },
      ],
      description: 'Developed Coal (level 1) and Coal (level 2), consumed 1 iron from iron mine in Birmingham and bought 1 from the market',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.developedIndustries.map((tile) => tile.tileId)).toEqual(['coal-1', 'coal-2'])
    expect(result.game.board.industryResourcePlacements['birmingham-3']).toEqual([])
    expect(result.game.board.marketResourcePlacements['iron-market-3']).toBeUndefined()
    expect(result.game.players[1].money).toBe(15)
    expect(result.description).toBe('Developed Coal (level 1) and Coal (level 2), consumed 1 iron from iron mine in Birmingham and bought 1 from the market')
  })

  it('can buy develop iron from the market when there are no iron works cubes', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: {
        ...baseGame.board,
        marketResourcePlacements: Object.fromEntries(
          Object.entries(baseGame.board.marketResourcePlacements).filter(
            ([spaceId]) => !spaceId.startsWith('iron-market-') || spaceId === 'iron-market-3',
          ),
        ),
      },
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'develop',
      cardId: card.id,
      tiles: [{ playerBoardTileId: 'coal-1', industry: 'coal', level: 1 }],
      description: 'Developed Coal (level 1), bought 1 iron from the market',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.developedIndustries.map((tile) => tile.tileId)).toEqual(['coal-1'])
    expect(result.game.board.marketResourcePlacements['iron-market-3']).toBeUndefined()
    expect(result.game.players[1].money).toBe(15)
    expect(result.description).toBe('Developed Coal (level 1), bought 1 iron from the market')
  })

  it('can consume coal and beer from matching resource sources', () => {
    const baseGame = createGameState(2)
    const coalBoard = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'cannock-2', {
        id: 'coal-mine-tile',
        industry: 'coal',
        ownerId: 'player-1',
        tileId: 'coal-1',
      }),
      'cannock-2',
      { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
    )
    const beerBoard = placeIndustryResourceCube(
      placeIndustryTile(coalBoard, 'burton-on-trent-2', {
        id: 'brewery-tile',
        industry: 'brewery',
        ownerId: baseGame.players[1].id,
        tileId: 'brewery-1',
      }),
      'burton-on-trent-2',
      { id: 'beer-cube-1', kind: 'beer', spaceId: 'burton-on-trent-2' },
    )
    const game = {
      ...baseGame,
      board: beerBoard,
    }

    const withCoal = executeAiCandidateAction(game, baseGame.players[1].id, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Cannock',
      description: 'Consumed 1 coal from coal mine in Cannock',
    })
    const withBeer = executeAiCandidateAction(withCoal.game, baseGame.players[1].id, {
      kind: 'consume-resource',
      resourceKind: 'beer',
      count: 1,
      locationName: 'Burton-on-Trent',
      description: 'Consumed 1 beer from brewery in Burton-on-Trent',
    })

    expect(withCoal.game.board.industryResourcePlacements['cannock-2']).toEqual([])
    expect(withCoal.description).toBe('Consumed 1 coal from coal mine in Cannock')
    expect(withBeer.game.board.industryResourcePlacements['burton-on-trent-2']).toEqual([])
    expect(withBeer.description).toBe('Consumed 1 beer from brewery in Burton-on-Trent')
  })

  it('scouts by discarding three cards and taking one of each wild card', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const hand = baseGame.players[1].hand.slice(0, 3)
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'scout',
      cardIds: hand.map((card) => card.id),
      description: 'Scouted, discarded 3 cards and took wild cards',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].hand.map((card) => card.kind)).toEqual([
      'wild-location',
      'wild-industry',
    ])
    expect(result.game.stacks.wildLocation).toHaveLength(baseGame.stacks.wildLocation.length - 1)
    expect(result.game.stacks.wildIndustry).toHaveLength(baseGame.stacks.wildIndustry.length - 1)
    expect(result.game.discardPile.slice(-3).map((card) => card.id)).toEqual(hand.map((card) => card.id))
  })

  it('executes a canal network action by discarding a card, paying 3 pounds, and placing one canal', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'iron-works-tile',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-1',
      }),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'network',
      cardId: card.id,
      cost: 3,
      linkPlacements: [
        {
          spaceId: 'birmingham-coventry',
          linkKind: 'canal',
          routeLabel: 'Birmingham-Coventry',
        },
      ],
      description: 'Networked Birmingham-Coventry for 3 pounds',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].money).toBe(14)
    expect(result.game.players[1].moneySpentThisRound).toBe(3)
    expect(result.game.players[1].hand).toEqual([])
    expect(result.game.board.linkPlacements['birmingham-coventry']).toMatchObject({
      kind: 'canal',
      ownerId: playerId,
    })
  })

  it('builds an industry by paying money and required resources', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'worcester-1',
      playerBoardTileId: 'cotton-1',
      industry: 'cotton',
      cityName: 'Worcester',
      description: 'Built cotton in Worcester (level 1)',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].money).toBe(5)
    expect(result.game.players[1].moneySpentThisRound).toBe(12)
    expect(result.game.players[1].hand).toEqual([])
    expect(result.game.board.industryPlacements['worcester-1']).toMatchObject({
      industry: 'cotton',
      ownerId: playerId,
      tileId: 'cotton-1',
    })
  })

  it('places iron cubes, sells to the iron market, and leaves unflipped remaining resources', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeLinkTile(baseGame.board, 'birmingham-oxford', {
        id: 'market-link',
        kind: 'canal',
        ownerId: playerId,
      }),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'birmingham-3',
      playerBoardTileId: 'iron-1',
      industry: 'iron',
      cityName: 'Birmingham',
      description: 'Built iron in Birmingham (level 1)',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].money).toBe(13)
    expect(result.game.board.marketResourcePlacements['iron-market-1']).toBeDefined()
    expect(result.game.board.marketResourcePlacements['iron-market-2']).toBeDefined()
    expect(result.game.board.industryResourcePlacements['birmingham-3']).toHaveLength(2)
    expect(result.game.board.industryPlacements['birmingham-3']).not.toMatchObject({ flipped: true })
  })

  it('sells coal from a connected mine into the highest empty market slots until the market is full', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const marketPlacements = { ...baseGame.board.marketResourcePlacements }

    delete marketPlacements['coal-market-1']
    delete marketPlacements['coal-market-2']
    delete marketPlacements['coal-market-3']

    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: {
        ...connectCannockToMarket(baseGame.board, playerId),
        marketResourcePlacements: marketPlacements,
      },
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'cannock-2',
      playerBoardTileId: 'coal-1',
      industry: 'coal',
      cityName: 'Cannock',
      description: 'Built coal in Cannock (level 1)',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.board.industryResourcePlacements['cannock-2']).toHaveLength(0)
    expect(result.game.board.marketResourcePlacements['coal-market-3']).toBeDefined()
    expect(result.game.board.marketResourcePlacements['coal-market-2']).toBeDefined()
    expect(result.game.board.marketResourcePlacements['coal-market-1']).toBeUndefined()
  })

  it('leaves coal on a connected mine when the market has no empty spaces', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const marketPlacements = {
      ...baseGame.board.marketResourcePlacements,
      'coal-market-2': {
        id: 'coal-market-2-cube',
        kind: 'coal' as const,
        spaceId: 'coal-market-2',
      },
    }

    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: {
        ...connectCannockToMarket(baseGame.board, playerId),
        marketResourcePlacements: marketPlacements,
      },
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'cannock-2',
      playerBoardTileId: 'coal-1',
      industry: 'coal',
      cityName: 'Cannock',
      description: 'Built coal in Cannock (level 1)',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.board.industryResourcePlacements['cannock-2']).toHaveLength(2)
    expect(result.game.board.marketResourcePlacements).toEqual(marketPlacements)
  })

  it('flips a resource industry and advances its owner income when the last cube is consumed', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const coalBoard = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'cannock-2', {
        id: 'coal-mine-tile',
        industry: 'coal',
        ownerId: 'player-1',
        tileId: 'coal-1',
      }),
      'cannock-2',
      { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
    )
    const game = {
      ...baseGame,
      board: placeLinkTile(coalBoard, 'cannock-walsall', {
        id: 'link-canal-1',
        kind: 'canal',
        ownerId: playerId,
      }),
      players: baseGame.players.map((player, index) =>
        index === 0 ? { ...player, income: 10 } : player,
      ),
    }

    const result = executeAiCandidateAction(game, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Walsall',
      description: 'Consumed 1 coal from coal mine in Cannock',
    })

    expect(result.game.board.industryResourcePlacements['cannock-2']).toEqual([])
    expect(result.game.board.industryPlacements['cannock-2']).toMatchObject({ flipped: true })
    expect(result.game.players[0].income).toBe(14)
  })

  it('allows overbuilding the AI own industry with a higher-level tile and removes old resources', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withCoal = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'cannock-2', {
        id: 'old-coal',
        industry: 'coal',
        ownerId: playerId,
        tileId: 'coal-1',
      }),
      'cannock-2',
      { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: withCoal,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'cannock-2',
      playerBoardTileId: 'coal-2',
      industry: 'coal',
      cityName: 'Cannock',
      description: 'Built coal in Cannock (level 2)',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.board.industryPlacements['cannock-2']).toMatchObject({
      tileId: 'coal-2',
      ownerId: playerId,
    })
    expect(result.game.board.industryResourcePlacements['cannock-2']).toHaveLength(3)
  })

  it('executes a one-link rail network action by paying 5 and consuming connected coal', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const board = placeIndustryResourceCube(
      placeIndustryTile(
        placeLinkTile(baseGame.board, 'cannock-walsall', {
          id: 'existing-link',
          kind: 'rail',
          ownerId: playerId,
        }),
        'cannock-2',
        {
          id: 'coal-mine',
          industry: 'coal',
          ownerId: 'player-1',
          tileId: 'coal-1',
        },
      ),
      'cannock-2',
      { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      era: 'rail' as const,
      board,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'network',
      cardId: card.id,
      cost: 5,
      linkPlacements: [
        {
          spaceId: 'wolverhampton-walsall',
          linkKind: 'rail',
          routeLabel: 'Wolverhampton-Walsall',
          coalLocationName: 'Walsall',
        },
      ],
      description: 'Networked Wolverhampton-Walsall for 5 pounds',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].money).toBe(12)
    expect(result.game.board.linkPlacements['wolverhampton-walsall']).toMatchObject({
      kind: 'rail',
      ownerId: playerId,
    })
    expect(result.game.board.industryResourcePlacements['cannock-2']).toEqual([])
  })

  it('executes a two-link rail network action by paying 15 and consuming two coal plus one beer', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withResources = placeIndustryResourceCube(
      placeIndustryResourceCube(
        placeIndustryResourceCube(
          placeIndustryTile(
            placeIndustryTile(
              placeLinkTile(baseGame.board, 'cannock-walsall', {
                id: 'existing-link',
                kind: 'rail',
                ownerId: playerId,
              }),
              'cannock-2',
              {
                id: 'coal-mine',
                industry: 'coal',
                ownerId: 'player-1',
                tileId: 'coal-1',
              },
            ),
            'brewery-1',
            {
              id: 'brewery',
              industry: 'brewery',
              ownerId: playerId,
              tileId: 'brewery-1',
            },
          ),
          'cannock-2',
          { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
        ),
        'cannock-2',
        { id: 'coal-cube-2', kind: 'coal', spaceId: 'cannock-2' },
      ),
      'brewery-1',
      { id: 'beer-cube-1', kind: 'beer', spaceId: 'brewery-1' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      era: 'rail' as const,
      board: withResources,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'network',
      cardId: card.id,
      cost: 15,
      linkPlacements: [
        {
          spaceId: 'wolverhampton-walsall',
          linkKind: 'rail',
          routeLabel: 'Wolverhampton-Walsall',
          coalLocationName: 'Walsall',
        },
        {
          spaceId: 'coalbrookdale-wolverhampton',
          linkKind: 'rail',
          routeLabel: 'Coalbrookdale-Wolverhampton',
          coalLocationName: 'Wolverhampton',
        },
      ],
      beerLocationName: 'Wolverhampton',
      description: 'Networked Wolverhampton-Walsall and Coalbrookdale-Wolverhampton for 15 pounds',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].money).toBe(2)
    expect(result.game.board.linkPlacements['wolverhampton-walsall']).toBeDefined()
    expect(result.game.board.linkPlacements['coalbrookdale-wolverhampton']).toBeDefined()
    expect(result.game.board.industryResourcePlacements['cannock-2']).toEqual([])
    expect(result.game.board.industryResourcePlacements['brewery-1']).toEqual([])
  })

  it('rejects a two-link rail network action when the second rail cannot access coal after the first consumes it', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withResources = placeIndustryResourceCube(
      placeIndustryResourceCube(
        placeIndustryTile(
          placeIndustryTile(
            placeLinkTile(baseGame.board, 'cannock-walsall', {
              id: 'existing-link',
              kind: 'rail',
              ownerId: playerId,
            }),
            'cannock-2',
            {
              id: 'coal-mine',
              industry: 'coal',
              ownerId: 'player-1',
              tileId: 'coal-1',
            },
          ),
          'brewery-1',
          {
            id: 'brewery',
            industry: 'brewery',
            ownerId: playerId,
            tileId: 'brewery-1',
          },
        ),
        'cannock-2',
        { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
      ),
      'brewery-1',
      { id: 'beer-cube-1', kind: 'beer', spaceId: 'brewery-1' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      era: 'rail' as const,
      board: withResources,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'network',
      cardId: card.id,
      cost: 15,
      linkPlacements: [
        {
          spaceId: 'wolverhampton-walsall',
          linkKind: 'rail',
          routeLabel: 'Wolverhampton-Walsall',
          coalLocationName: 'Walsall',
        },
        {
          spaceId: 'coalbrookdale-wolverhampton',
          linkKind: 'rail',
          routeLabel: 'Coalbrookdale-Wolverhampton',
          coalLocationName: 'Wolverhampton',
        },
      ],
      beerLocationName: 'Wolverhampton',
      description: 'Networked Wolverhampton-Walsall and Coalbrookdale-Wolverhampton for 15 pounds',
    }

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game).toBe(game)
  })

  it('sells a connected industry by discarding a card, consuming beer, flipping it, and advancing income', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const withIndustryAndBeer = placeIndustryResourceCube(
      placeIndustryTile(
        placeIndustryTile(baseGame.board, 'birmingham-1', {
          id: 'cotton-mill',
          industry: 'cotton',
          ownerId: playerId,
          tileId: 'cotton-1',
        }),
        'burton-on-trent-2',
        {
          id: 'brewery',
          industry: 'brewery',
          ownerId: playerId,
          tileId: 'brewery-1',
        },
      ),
      'burton-on-trent-2',
      { id: 'beer-cube-1', kind: 'beer', spaceId: 'burton-on-trent-2' },
    )
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeLinkTile(
        {
          ...withIndustryAndBeer,
          merchantTilePlacements: {
            'merchant-tile-6': {
              id: 'merchant-tile-face-cotton',
              tileIndex: 2,
              kind: 'cotton' as const,
              label: 'Cotton',
              spaceId: 'merchant-tile-6',
            },
          },
          beerResourcePlacements: {},
        },
        'birmingham-oxford',
        {
          id: 'market-link',
          kind: 'canal',
          ownerId: playerId,
        },
      ),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], income: 10 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'sell',
      cardId: card.id,
      sales: [
        {
          spaceId: 'birmingham-1',
          tileId: 'cotton-1',
          industry: 'cotton',
          merchantSpaceId: 'merchant-tile-6',
          merchantLabel: 'Cotton',
          beerCount: 1,
          incomeIncrease: 5,
        },
      ],
      description: 'Sold Cotton (level 1) in Birmingham to Cotton',
    } as AiCandidateAction

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.players[1].hand).toEqual([])
    expect(result.game.players[1].income).toBe(19)
    expect(result.game.board.industryPlacements['birmingham-1']).toMatchObject({ flipped: true })
    expect(result.game.board.industryResourcePlacements['burton-on-trent-2']).toEqual([])
  })

  it('uses merchant beer during sell and applies the merchant beer bonus', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const card = baseGame.players[1].hand[0]
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      board: placeLinkTile(
        {
          ...placeIndustryTile(baseGame.board, 'stoke-on-trent-1', {
            id: 'cotton-mill',
            industry: 'cotton',
            ownerId: playerId,
            tileId: 'cotton-1',
          }),
          merchantTilePlacements: {
            'merchant-tile-1': {
              id: 'merchant-tile-face-cotton',
              tileIndex: 2,
              kind: 'cotton' as const,
              label: 'Cotton',
              spaceId: 'merchant-tile-1',
            },
          },
          beerResourcePlacements: {
            'board-beer-1': {
              id: 'merchant-beer',
              kind: 'beer' as const,
              spaceId: 'board-beer-1',
            },
          },
        },
        'warrington-stoke-on-trent',
        {
          id: 'market-link',
          kind: 'canal',
          ownerId: playerId,
        },
      ),
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [card], income: 10, money: 17 } : player,
      ),
    }
    const action: AiCandidateAction = {
      kind: 'sell',
      cardId: card.id,
      sales: [
        {
          spaceId: 'stoke-on-trent-1',
          tileId: 'cotton-1',
          industry: 'cotton',
          merchantSpaceId: 'merchant-tile-1',
          merchantLabel: 'Cotton',
          beerCount: 1,
          incomeIncrease: 5,
          merchantBeerSpaceId: 'board-beer-1',
          merchantBeerBonus: 'money',
        },
      ],
      description: 'Sold Cotton (level 1) in Stoke-on-Trent to Cotton',
    } as AiCandidateAction

    const result = executeAiCandidateAction(game, playerId, action)

    expect(result.game.board.beerResourcePlacements['board-beer-1']).toBeUndefined()
    expect(result.game.players[1].money).toBe(22)
    expect(result.game.players[1].income).toBe(15)
    expect(result.game.board.industryPlacements['stoke-on-trent-1']).toMatchObject({ flipped: true })
  })

  it('does not offer develop actions when market or general-supply iron cannot be paid', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const ironCard = baseGame.stacks.standard.find(
      (card) => card.kind === 'industry' && card.industries.includes('iron'),
    )

    expect(ironCard).toBeDefined()

    const noMoneyForMarketIron = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: [ironCard!], money: 0 } : player,
      ),
    }
    const noMoneyForGeneralSupplyIron = {
      ...noMoneyForMarketIron,
      board: {
        ...noMoneyForMarketIron.board,
        marketResourcePlacements: Object.fromEntries(
          Object.entries(noMoneyForMarketIron.board.marketResourcePlacements).filter(
            ([spaceId]) => !spaceId.startsWith('iron-market-'),
          ),
        ),
      },
      players: noMoneyForMarketIron.players.map((player, index) =>
        index === 1 ? { ...player, money: 5 } : player,
      ),
    }
    const enoughForGeneralSupplyIron = {
      ...noMoneyForGeneralSupplyIron,
      players: noMoneyForGeneralSupplyIron.players.map((player, index) =>
        index === 1 ? { ...player, money: 6 } : player,
      ),
    }

    expect(
      getAiCandidateActions(noMoneyForMarketIron, playerId).some((action) => action.kind === 'develop'),
    ).toBe(false)
    expect(
      getAiCandidateActions(noMoneyForGeneralSupplyIron, playerId).some(
        (action) => action.kind === 'develop',
      ),
    ).toBe(false)
    expect(
      getAiCandidateActions(enoughForGeneralSupplyIron, playerId).some(
        (action) => action.kind === 'develop',
      ),
    ).toBe(true)
  })

  it('requires coal mines to be connected to the target location', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const coalBoard = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'cannock-2', {
        id: 'coal-mine-tile',
        industry: 'coal',
        ownerId: 'player-1',
        tileId: 'coal-1',
      }),
      'cannock-2',
      { id: 'coal-cube-1', kind: 'coal', spaceId: 'cannock-2' },
    )
    const disconnectedGame = {
      ...baseGame,
      board: coalBoard,
    }
    const connectedGame = {
      ...disconnectedGame,
      board: placeLinkTile(coalBoard, 'cannock-walsall', {
        id: 'link-canal-1',
        kind: 'canal',
        ownerId: playerId,
      }),
    }

    const disconnectedResult = executeAiCandidateAction(disconnectedGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Walsall',
      description: 'Consumed 1 coal from coal mine in Cannock',
    })
    const connectedResult = executeAiCandidateAction(connectedGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Walsall',
      description: 'Consumed 1 coal from coal mine in Cannock',
    })

    expect(disconnectedResult.game).toBe(disconnectedGame)
    expect(connectedResult.game.board.industryResourcePlacements['cannock-2']).toEqual([])
  })

  it('requires market or general-supply coal to be connected to a market and affordable', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const withoutCoalMines = {
      ...baseGame,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, money: 1 } : player,
      ),
    }
    const marketConnectedGame = {
      ...withoutCoalMines,
      board: placeLinkTile(withoutCoalMines.board, 'birmingham-oxford', {
        id: 'link-canal-1',
        kind: 'canal',
        ownerId: playerId,
      }),
    }
    const generalSupplyOnly = {
      ...marketConnectedGame,
      board: {
        ...marketConnectedGame.board,
        marketResourcePlacements: Object.fromEntries(
          Object.entries(marketConnectedGame.board.marketResourcePlacements).filter(
            ([spaceId]) => !spaceId.startsWith('coal-market-'),
          ),
        ),
      },
      players: marketConnectedGame.players.map((player, index) =>
        index === 1 ? { ...player, money: 7 } : player,
      ),
    }
    const canAffordGeneralSupply = {
      ...generalSupplyOnly,
      players: generalSupplyOnly.players.map((player, index) =>
        index === 1 ? { ...player, money: 8 } : player,
      ),
    }

    const disconnectedMarket = executeAiCandidateAction(withoutCoalMines, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Birmingham',
      description: 'Bought 1 coal from the market',
    })
    const connectedMarket = executeAiCandidateAction(marketConnectedGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Birmingham',
      description: 'Bought 1 coal from the market',
    })
    const unaffordableGeneral = executeAiCandidateAction(generalSupplyOnly, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Birmingham',
      description: 'Bought 1 coal from the market',
    })
    const affordableGeneral = executeAiCandidateAction(canAffordGeneralSupply, playerId, {
      kind: 'consume-resource',
      resourceKind: 'coal',
      count: 1,
      locationName: 'Birmingham',
      description: 'Bought 1 coal from the market',
    })

    expect(disconnectedMarket.game).toBe(withoutCoalMines)
    expect(connectedMarket.game.players[1].money).toBe(0)
    expect(connectedMarket.game.board.marketResourcePlacements['coal-market-1']).toBeUndefined()
    expect(unaffordableGeneral.game).toBe(generalSupplyOnly)
    expect(affordableGeneral.game.players[1].money).toBe(0)
  })

  it('uses own beer anywhere, connected opponent beer, and only the chosen merchant beer', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const ownBeerBoard = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'burton-on-trent-2', {
        id: 'own-brewery',
        industry: 'brewery',
        ownerId: playerId,
        tileId: 'brewery-1',
      }),
      'burton-on-trent-2',
      { id: 'own-beer-cube', kind: 'beer', spaceId: 'burton-on-trent-2' },
    )
    const ownBeerGame = {
      ...baseGame,
      board: ownBeerBoard,
    }
    const opponentBeerBoard = placeIndustryResourceCube(
      placeIndustryTile(baseGame.board, 'brewery-1', {
        id: 'opponent-brewery',
        industry: 'brewery',
        ownerId: 'player-1',
        tileId: 'brewery-1',
      }),
      'brewery-1',
      { id: 'opponent-beer-cube', kind: 'beer', spaceId: 'brewery-1' },
    )
    const disconnectedOpponentBeerGame = {
      ...baseGame,
      board: opponentBeerBoard,
    }
    const connectedOpponentBeerGame = {
      ...disconnectedOpponentBeerGame,
      board: placeLinkTile(opponentBeerBoard, 'cannock-brewery-1', {
        id: 'link-canal-1',
        kind: 'canal',
        ownerId: playerId,
      }),
    }
    const merchantBeerGame = {
      ...baseGame,
      board: {
        ...baseGame.board,
        beerResourcePlacements: {
          'board-beer-5': {
            id: 'merchant-tile-5-beer-cube',
            kind: 'beer' as const,
            spaceId: 'board-beer-5',
          },
          'board-beer-6': {
            id: 'merchant-tile-6-beer-cube',
            kind: 'beer' as const,
            spaceId: 'board-beer-6',
          },
        },
      },
    }

    const ownBeer = executeAiCandidateAction(ownBeerGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'beer',
      count: 1,
      locationName: 'Birmingham',
      description: 'Consumed 1 beer from brewery in Burton-on-Trent',
    })
    const disconnectedOpponentBeer = executeAiCandidateAction(disconnectedOpponentBeerGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'beer',
      count: 1,
      locationName: 'Cannock',
      description: 'Consumed 1 beer from brewery in Brewery-1',
    })
    const connectedOpponentBeer = executeAiCandidateAction(connectedOpponentBeerGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'beer',
      count: 1,
      locationName: 'Cannock',
      description: 'Consumed 1 beer from brewery in Brewery-1',
    })
    const merchantBeer = executeAiCandidateAction(merchantBeerGame, playerId, {
      kind: 'consume-resource',
      resourceKind: 'beer',
      count: 1,
      merchantSpaceId: 'merchant-tile-6',
      description: 'Consumed 1 beer from merchant tile 6',
    } as AiCandidateAction & { merchantSpaceId: string })

    expect(ownBeer.game.board.industryResourcePlacements['burton-on-trent-2']).toEqual([])
    expect(disconnectedOpponentBeer.game).toBe(disconnectedOpponentBeerGame)
    expect(connectedOpponentBeer.game.board.industryResourcePlacements['brewery-1']).toEqual([])
    expect(merchantBeer.game.board.beerResourcePlacements['board-beer-5']).toBeDefined()
    expect(merchantBeer.game.board.beerResourcePlacements['board-beer-6']).toBeUndefined()
  })
})

describe('runAiTurn', () => {
  it('falls back to discarding when all meaningful candidates fail to execute', () => {
    const baseGame = createGameState(2)
    const locationCard = baseGame.stacks.standard.find(
      (card) => card.kind === 'location' && card.name === 'Coventry',
    )

    expect(locationCard).toBeDefined()

    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1
          ? {
              ...player,
              hand: [locationCard!, baseGame.stacks.wildLocation[0], ...player.hand.slice(0, 6)],
              income: 2,
              money: 0,
            }
          : player,
      ),
    }

    const result = runAiTurn(game, () => 0)

    expect(result.logEntries).toHaveLength(1)
    expect(result.logEntries[0].description).toContain('Discarded')
    expect(result.game.activePlayerIndex).toBe(0)
    expect(result.game.turnsTakenThisRound).toBe(1)
  })

  it('tries another candidate when a random action cannot change the game', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
    const hand = baseGame.players[1].hand
    const game = {
      ...baseGame,
      activePlayerIndex: 1,
      players: baseGame.players.map((player, index) =>
        index === 1 ? { ...player, hand: hand.slice(0, 8), money: 0 } : player,
      ),
    }
    let callCount = 0
    const random = () => {
      callCount += 1
      return callCount === 1 ? 0 : 0.99
    }

    const result = runAiTurn(game, random)

    expect(result.logEntries).toHaveLength(1)
    expect(result.game.activePlayerIndex).toBe(0)
    expect(result.game.players.find((player) => player.id === playerId)?.hand).toHaveLength(8)
  })

  it('uses one action in canal round 1 and passes with seven cards', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
    }
    let randomCall = 0
    const random = () => {
      randomCall += 1
      return 0
    }

    const result = runAiTurn(game, random)

    expect(result.logEntries).toHaveLength(1)
    expect(result.game.activePlayerIndex).toBe(0)
    expect(result.game.turnsTakenThisRound).toBe(1)
  })

  it('uses two actions after canal round 1', () => {
    const game = {
      ...createGameState(2),
      activePlayerIndex: 1,
      roundNumber: 2,
      turnStartHandCount: 8,
    }

    const result = runAiTurn(game, () => 0)

    expect(result.logEntries).toHaveLength(2)
    expect(result.game.activePlayerIndex).toBe(0)
    expect(result.game.turnsTakenThisRound).toBe(1)
  })

  it('advances through all AI seats in a 4-player game after the human passes', () => {
    const baseGame = createGameState(4)
    const humanCardId = baseGame.players[0].hand[0].id
    const afterHumanPass = passTurn(discardCardFromPlayerHand(baseGame, 'player-1', humanCardId))

    expect(afterHumanPass.activePlayerIndex).toBe(1)

    let game = afterHumanPass

    for (let aiTurn = 0; aiTurn < 3; aiTurn += 1) {
      const result = runAiTurn(game, () => 0)

      expect(result.game).not.toBe(game)
      game = result.game
    }

    expect(game.activePlayerIndex).toBe(0)
    expect(game.roundNumber).toBe(2)
  })
})
