import { describe, expect, it } from 'vitest'

import {
  applyEraScoring,
  countLinkSymbolsAtLocation,
  scoreFlippedIndustryVictoryPoints,
  scoreLinkVictoryPoints,
} from './eraScoring'
import { flipIndustryTile, placeIndustryTile, placeLinkTile } from './board'
import { createGameState, passTurn } from './game'
import { getDeckForPlayerCount } from './deck'

describe('eraScoring', () => {
  it('counts merchant cities as two link symbols', () => {
    const board = createGameState(2).board

    expect(countLinkSymbolsAtLocation(board, 'Oxford')).toBe(2)
    expect(countLinkSymbolsAtLocation(board, 'Birmingham')).toBe(0)
  })

  it('counts link symbols only from flipped industries at a location', () => {
    const baseBoard = createGameState(2).board
    const withUnflipped = placeIndustryTile(baseBoard, 'birmingham-3', {
      id: 'iron-tile',
      industry: 'iron',
      ownerId: 'player-1',
      tileId: 'iron-1',
    })
    const withFlipped = flipIndustryTile(withUnflipped, 'birmingham-3')

    expect(countLinkSymbolsAtLocation(withUnflipped, 'Birmingham')).toBe(0)
    expect(countLinkSymbolsAtLocation(withFlipped, 'Birmingham')).toBe(1)
  })

  it('scores each link from its adjacent endpoints only, counting shared cities once per link', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
    const withBirminghamIron = flipIndustryTile(
      placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'birmingham-iron',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-2',
      }),
      'birmingham-3',
    )
    const withCoventryIron = flipIndustryTile(
      placeIndustryTile(withBirminghamIron, 'coventry-3', {
        id: 'coventry-iron',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-2',
      }),
      'coventry-3',
    )
    const board = placeLinkTile(
      placeLinkTile(withCoventryIron, 'walsall-birmingham', {
        id: 'canal-walsall-birmingham',
        kind: 'canal',
        ownerId: playerId,
      }),
      'birmingham-coventry',
      {
        id: 'canal-birmingham-coventry',
        kind: 'canal',
        ownerId: playerId,
      },
    )

    // Walsall-Birmingham: Walsall(0) + Birmingham(1) = 1
    // Birmingham-Coventry: Birmingham(1) + Coventry(1) = 2
    // Total = W + B + B + C = 0 + 1 + 1 + 1 = 3 (not a full-network sum)
    expect(scoreLinkVictoryPoints(board, playerId, 'canal')).toBe(3)
  })

  it('scores canal links from adjacent link symbols and flipped industry victory points', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
    const board = flipIndustryTile(
      placeIndustryTile(
        placeLinkTile(baseGame.board, 'birmingham-oxford', {
          id: 'canal-link',
          kind: 'canal',
          ownerId: playerId,
        }),
        'birmingham-3',
        {
          id: 'iron-tile',
          industry: 'iron',
          ownerId: playerId,
          tileId: 'iron-1',
        },
      ),
      'birmingham-3',
    )
    const game = {
      ...baseGame,
      board,
    }

    expect(scoreLinkVictoryPoints(board, playerId, 'canal')).toBe(3)
    expect(scoreFlippedIndustryVictoryPoints(board, playerId)).toBe(3)
    expect(scoreLinkVictoryPoints(board, playerId, 'rail')).toBe(0)

    const afterScoring = applyEraScoring(game, 'canal')

    expect(afterScoring.players[0].victoryPoints).toBe(6)
    expect(afterScoring.board.linkPlacements['birmingham-oxford']).toBeUndefined()
    expect(afterScoring.board.industryPlacements['birmingham-3']).toBeUndefined()
    expect(afterScoring.outdatedIndustries).toHaveLength(1)
    expect(afterScoring.outdatedIndustries[0]).toMatchObject({
      tileId: 'iron-1',
      ownerId: playerId,
    })
  })

  it('leaves rail links on the board during canal scoring and scores them during rail scoring', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
    const withLinks = placeLinkTile(
      placeLinkTile(baseGame.board, 'birmingham-oxford', {
        id: 'canal-link',
        kind: 'canal',
        ownerId: playerId,
      }),
      'birmingham-coventry',
      {
        id: 'rail-link',
        kind: 'rail',
        ownerId: playerId,
      },
    )
    const withBirminghamIron = flipIndustryTile(
      placeIndustryTile(withLinks, 'birmingham-3', {
        id: 'birmingham-iron',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-2',
      }),
      'birmingham-3',
    )
    const board = flipIndustryTile(
      placeIndustryTile(withBirminghamIron, 'coventry-3', {
        id: 'coventry-iron',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-2',
      }),
      'coventry-3',
    )
    const afterCanalScoring = applyEraScoring(
      {
        ...baseGame,
        board,
      },
      'canal',
    )

    expect(afterCanalScoring.board.linkPlacements['birmingham-oxford']).toBeUndefined()
    expect(afterCanalScoring.board.linkPlacements['birmingham-coventry']).toBeDefined()
    expect(afterCanalScoring.players[0].victoryPoints).toBe(13)

    const afterRailScoring = applyEraScoring(
      {
        ...afterCanalScoring,
        era: 'rail',
      },
      'rail',
    )

    expect(afterRailScoring.board.linkPlacements['birmingham-coventry']).toBeUndefined()
    expect(afterRailScoring.players[0].victoryPoints).toBe(25)
  })

  it('voids resources when removing level one industries after canal scoring', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
    const board = {
      ...placeIndustryTile(baseGame.board, 'cannock-2', {
        id: 'coal-tile',
        industry: 'coal',
        ownerId: playerId,
        tileId: 'coal-1',
      }),
      industryResourcePlacements: {
        'cannock-2': [
          {
            id: 'coal-cube',
            kind: 'coal' as const,
            spaceId: 'cannock-2',
          },
        ],
      },
    }
    const afterScoring = applyEraScoring(
      {
        ...baseGame,
        board,
      },
      'canal',
    )

    expect(afterScoring.board.industryPlacements['cannock-2']).toBeUndefined()
    expect(afterScoring.board.industryResourcePlacements['cannock-2']).toBeUndefined()
    expect(afterScoring.outdatedIndustries).toHaveLength(1)
  })

  it('does not remove level two or higher industries after canal scoring', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
    const board = flipIndustryTile(
      placeIndustryTile(baseGame.board, 'birmingham-3', {
        id: 'iron-tile',
        industry: 'iron',
        ownerId: playerId,
        tileId: 'iron-2',
      }),
      'birmingham-3',
    )
    const afterScoring = applyEraScoring(
      {
        ...baseGame,
        board,
      },
      'canal',
    )

    expect(afterScoring.board.industryPlacements['birmingham-3']).toBeDefined()
    expect(afterScoring.players[0].victoryPoints).toBe(5)
  })
})

describe('passTurn era transitions with scoring', () => {
  it('scores canal era before entering rail era', () => {
    const railDeck = getDeckForPlayerCount(2)
    const baseGame = createGameState(2)
    const playerId = baseGame.players[0].id
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
      board: placeLinkTile(baseGame.board, 'birmingham-oxford', {
        id: 'canal-link',
        kind: 'canal',
        ownerId: playerId,
      }),
      players: baseGame.players.map((player, index) => ({
        ...player,
        income: index === 0 ? 10 : 11,
        hand: [],
      })),
    }

    const result = passTurn(game, { railDeck })

    expect(result.era).toBe('rail')
    expect(result.players[0].victoryPoints).toBe(2)
    expect(result.board.linkPlacements['birmingham-oxford']).toBeUndefined()
  })

  it('scores rail era before ending the game', () => {
    const baseGame = createGameState(2)
    const playerId = baseGame.players[1].id
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
      board: flipIndustryTile(
        placeIndustryTile(
          placeLinkTile(baseGame.board, 'birmingham-coventry', {
            id: 'rail-link',
            kind: 'rail',
            ownerId: playerId,
          }),
          'coventry-3',
          {
            id: 'iron-tile',
            industry: 'iron',
            ownerId: playerId,
            tileId: 'iron-2',
          },
        ),
        'coventry-3',
      ),
      players: baseGame.players.map((player, index) => ({
        ...player,
        income: 11,
        hand: [],
        victoryPoints: index === 1 ? 4 : 0,
      })),
    }

    const result = passTurn(game)

    expect(result.status).toBe('ended')
    expect(result.players[1].victoryPoints).toBe(10)
    expect(result.board.linkPlacements['birmingham-coventry']).toBeUndefined()
    expect(result.board.industryPlacements['coventry-3']).toBeDefined()
  })
})
