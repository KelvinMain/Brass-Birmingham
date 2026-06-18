import { describe, expect, it } from 'vitest'

import { createBoardState, marketResourceSpaces, placeMarketResourceCube } from './board'
import {
  getCheapestMarketResourcePlacement,
  getMarketResourceCost,
  getMostExpensiveEmptyMarketSpace,
  MARKET_GENERAL_SUPPLY_COST,
  sellResourceCubeToHighestEmptyMarket,
} from './market'

describe('coal and iron market pricing', () => {
  it('charges coal market slots in paired price tiers', () => {
    const coalCosts = Object.fromEntries(
      marketResourceSpaces
        .filter((space) => space.kind === 'coal')
        .map((space) => [space.id, getMarketResourceCost('coal', space.marketIndex)]),
    )

    expect(coalCosts).toEqual({
      'coal-market-1': 1,
      'coal-market-2': 1,
      'coal-market-3': 2,
      'coal-market-4': 2,
      'coal-market-5': 3,
      'coal-market-6': 3,
      'coal-market-7': 4,
      'coal-market-8': 4,
      'coal-market-9': 5,
      'coal-market-10': 5,
      'coal-market-11': 6,
      'coal-market-12': 6,
      'coal-market-13': 7,
      'coal-market-14': 7,
    })
  })

  it('charges iron market slots in paired price tiers', () => {
    const ironCosts = Object.fromEntries(
      marketResourceSpaces
        .filter((space) => space.kind === 'iron')
        .map((space) => [space.id, getMarketResourceCost('iron', space.marketIndex)]),
    )

    expect(ironCosts).toEqual({
      'iron-market-1': 1,
      'iron-market-2': 1,
      'iron-market-3': 2,
      'iron-market-4': 2,
      'iron-market-5': 3,
      'iron-market-6': 3,
      'iron-market-7': 4,
      'iron-market-8': 4,
      'iron-market-9': 5,
      'iron-market-10': 5,
    })
  })

  it('uses the general supply fallback costs when the market is empty', () => {
    expect(MARKET_GENERAL_SUPPLY_COST).toEqual({
      coal: 8,
      iron: 6,
    })
  })
})

describe('coal and iron market slot selection', () => {
  it('buys from the cheapest stocked market slot first', () => {
    const board = createBoardState(2)

    expect(getCheapestMarketResourcePlacement(board, 'coal')?.space.id).toBe('coal-market-1')
    expect(getCheapestMarketResourcePlacement(board, 'iron')?.space.id).toBe('iron-market-3')
  })

  it('sells into the most expensive empty market slot first', () => {
    const board = createBoardState(2)

    expect(getMostExpensiveEmptyMarketSpace(board, 'coal')?.id).toBe('coal-market-2')
    expect(getMostExpensiveEmptyMarketSpace(board, 'iron')?.id).toBe('iron-market-2')
  })

  it('sells into the highest empty slot on a mostly full market', () => {
    const stockedCoalSpaces = marketResourceSpaces.filter(
      (space) => space.kind === 'coal' && space.marketIndex < 14,
    )
    let board = {
      ...createBoardState(2),
      marketResourcePlacements: Object.fromEntries(
        Object.entries(createBoardState(2).marketResourcePlacements).filter(
          ([, placement]) => placement.kind !== 'coal',
        ),
      ),
    }

    for (const space of stockedCoalSpaces) {
      board = placeMarketResourceCube(board, space.id, {
        id: `${space.id}-stock`,
        kind: 'coal',
        spaceId: space.id,
      })
    }

    expect(getMostExpensiveEmptyMarketSpace(board, 'coal')?.id).toBe('coal-market-14')
  })

  it('targets coal-market-3 before coal-market-2 when slots 1 through 3 are empty', () => {
    let board = createBoardState(2)
    const placements = { ...board.marketResourcePlacements }

    delete placements['coal-market-1']
    delete placements['coal-market-2']
    delete placements['coal-market-3']
    board = {
      ...board,
      marketResourcePlacements: placements,
    }

    expect(getMostExpensiveEmptyMarketSpace(board, 'coal')?.id).toBe('coal-market-3')

    const firstSale = sellResourceCubeToHighestEmptyMarket(board, 'coal', {
      id: 'overflow-coal-1',
      kind: 'coal',
      spaceId: 'coal-market-3',
    })

    expect(firstSale?.space.id).toBe('coal-market-3')
    expect(firstSale?.revenue).toBe(2)

    const secondSale = sellResourceCubeToHighestEmptyMarket(firstSale!.board, 'coal', {
      id: 'overflow-coal-2',
      kind: 'coal',
      spaceId: 'coal-market-2',
    })

    expect(secondSale?.space.id).toBe('coal-market-2')
    expect(secondSale?.revenue).toBe(1)
    expect(secondSale?.board.marketResourcePlacements['coal-market-1']).toBeUndefined()
    expect(secondSale?.board.marketResourcePlacements['coal-market-3']).toBeDefined()
    expect(secondSale?.board.marketResourcePlacements['coal-market-2']).toBeDefined()
  })
})
