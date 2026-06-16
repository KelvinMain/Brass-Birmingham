import { describe, expect, it } from 'vitest'

import {
  beerResourceSpaces,
  boardControlSpaces,
  createBoardState,
  getBoardPointFromClientPosition,
  getVisibleMerchantTilePlacements,
  type IndustrySpace,
  incomeTrackSpaces,
  type LinkKind,
  type LinkSpace,
  industrySpaces,
  linkSpaces,
  marketResourceSpaces,
  merchantTiles,
  merchantTileSpaces,
  flipIndustryTile,
  moveIndustryTile,
  moveResourceCubeToBeer,
  moveResourceCubeToMarket,
  moveLinkTile,
  placeBeerResourceCube,
  placeIndustryResourceCube,
  placeMarketResourceCube,
  placeIndustryTile,
  placeLinkTile,
  removeIndustryTile,
  removeIndustryResourceCube,
  removeLinkTile,
  removeMarketResourceCube,
  removeBeerResourceCube,
  resourceCubeKinds,
  updateBeerResourceSpaceCalibration,
  updateBoardControlSpaceCalibration,
  updateIndustrySpaceCalibration,
  updateIncomeTrackSpaceCalibration,
  updateLinkSpaceCalibration,
  updateMarketResourceSpaceCalibration,
  updateMerchantTileSpaceCalibration,
} from './board'

const getSpaces = (spaceIds: string[]) =>
  spaceIds.map((spaceId) => {
    const space = industrySpaces.find((currentSpace) => currentSpace.id === spaceId)
    expect(space).toBeDefined()
    return space as IndustrySpace
  })

const expectSameCoordinate = (values: number[]) => {
  expect(new Set(values)).toHaveLength(1)
}

const findLink = (spaceId: string) => {
  const space = linkSpaces.find((currentSpace) => currentSpace.id === spaceId)
  expect(space).toBeDefined()
  return space as LinkSpace
}

const linkKindExceptions: Record<string, LinkKind[]> = {
  'leek-belper': ['rail'],
  'uttoxeter-stone': ['rail'],
  'derby-uttoxeter': ['rail'],
  'burton-on-trent-cannock': ['rail'],
  'burton-on-trent-walsall': ['canal'],
  'walsall-tamworth': ['rail'],
  'birmingham-redditch': ['rail'],
  'birmingham-nuneaton': ['rail'],
  'nuneaton-coventry': ['rail'],
}

describe('Brass: Birmingham board placement', () => {
  it('places an industry tile onto an empty city industry space', () => {
    const state = createBoardState()
    const result = placeIndustryTile(state, 'birmingham-1', {
      id: 'tile-cotton-1',
      industry: 'cotton',
      ownerId: 'player-1',
    })

    expect(result.industryPlacements['birmingham-1']).toEqual({
      id: 'tile-cotton-1',
      industry: 'cotton',
      ownerId: 'player-1',
    })
  })

  it('moves a placed industry tile to another valid empty space', () => {
    const state = placeIndustryTile(createBoardState(), 'birmingham-1', {
      id: 'tile-manufacturer-1',
      industry: 'manufacturer',
      ownerId: 'player-1',
      tileId: 'manufacturer-1',
    })

    const result = moveIndustryTile(
      state,
      'birmingham-1',
      'birmingham-2',
      state.industryPlacements['birmingham-1'],
    )

    expect(result.industryPlacements['birmingham-1']).toBeUndefined()
    expect(result.industryPlacements['birmingham-2']).toEqual({
      id: 'tile-manufacturer-1',
      industry: 'manufacturer',
      ownerId: 'player-1',
      tileId: 'manufacturer-1',
    })
  })

  it('removes a placed industry tile and its resource cubes', () => {
    const placed = placeIndustryTile(createBoardState(), 'cannock-2', {
      id: 'tile-coal-1',
      industry: 'coal',
      ownerId: 'player-1',
      tileId: 'coal-1',
    })
    const withResource = placeIndustryResourceCube(placed, 'cannock-2', {
      id: 'coal-cube-1',
      kind: 'coal',
      spaceId: 'cannock-2',
    })

    const result = removeIndustryTile(withResource, 'cannock-2')

    expect(result.industryPlacements['cannock-2']).toBeUndefined()
    expect(result.industryResourcePlacements['cannock-2']).toBeUndefined()
  })

  it('flips an industry tile only when it has no resources on it', () => {
    const placed = placeIndustryTile(createBoardState(), 'cannock-2', {
      id: 'tile-coal-1',
      industry: 'coal',
      ownerId: 'player-1',
      tileId: 'coal-1',
    })
    const flipped = flipIndustryTile(placed, 'cannock-2')
    const withResource = placeIndustryResourceCube(placed, 'cannock-2', {
      id: 'coal-cube-1',
      kind: 'coal',
      spaceId: 'cannock-2',
    })

    expect(flipped.industryPlacements['cannock-2']).toMatchObject({
      flipped: true,
    })
    expect(flipIndustryTile(flipped, 'cannock-2').industryPlacements['cannock-2']).toMatchObject({
      flipped: false,
    })
    expect(flipIndustryTile(withResource, 'cannock-2')).toEqual(withResource)
    expect(
      placeIndustryResourceCube(flipped, 'cannock-2', {
        id: 'coal-cube-2',
        kind: 'coal',
        spaceId: 'cannock-2',
      }),
    ).toEqual(flipped)
  })

  it('contains the supplied build spaces and market endpoints', () => {
    expect(industrySpaces).toHaveLength(49)
    expect(linkSpaces).toHaveLength(39)
    expect(boardControlSpaces).toHaveLength(3)
    expect(marketResourceSpaces).toHaveLength(24)
    expect(beerResourceSpaces).toHaveLength(9)
    expect(merchantTileSpaces).toHaveLength(9)
    expect(incomeTrackSpaces).toHaveLength(100)
    expect(industrySpaces.find((space) => space.id === 'belper-1')).toMatchObject({
      city: 'Belper',
      allowedIndustries: ['cotton', 'manufacturer'],
    })
    expect(industrySpaces.find((space) => space.id === 'birmingham-3')).toMatchObject({
      city: 'Birmingham',
      allowedIndustries: ['iron'],
    })
    expect(industrySpaces.find((space) => space.id === 'brewery-2')).toMatchObject({
      city: 'Brewery-2',
      allowedIndustries: ['brewery'],
    })
    expect(boardControlSpaces.map((space) => space.stack)).toEqual([
      'standard',
      'wildLocation',
      'wildIndustry',
    ])
    expect(boardControlSpaces.map((space) => space.x)).toEqual([13.98, 13.98, 13.98])
    expect(boardControlSpaces.map((space) => space.y)).toEqual([15.81, 29.61, 43.17])
    expect(marketResourceSpaces.filter((space) => space.kind === 'coal')).toHaveLength(14)
    expect(marketResourceSpaces.filter((space) => space.kind === 'iron')).toHaveLength(10)
    expect(marketResourceSpaces.find((space) => space.id === 'coal-market-1')).toMatchObject({
      kind: 'coal',
      marketIndex: 1,
      x: 83.96,
      y: 50.42,
    })
    expect(marketResourceSpaces.find((space) => space.id === 'coal-market-5')).toMatchObject({
      kind: 'coal',
      marketIndex: 5,
      x: 83.96,
      y: 44.52,
    })
    expect(marketResourceSpaces.find((space) => space.id === 'iron-market-10')).toMatchObject({
      kind: 'iron',
      marketIndex: 10,
      x: 91.41,
      y: 38.62,
    })
    expect(resourceCubeKinds).toEqual(['coal', 'iron', 'beer'])
  })

  it('defines nine calibratable board beer spots', () => {
    expect(beerResourceSpaces.map((space) => space.id)).toEqual([
      'board-beer-1',
      'board-beer-2',
      'board-beer-3',
      'board-beer-4',
      'board-beer-5',
      'board-beer-6',
      'board-beer-7',
      'board-beer-8',
      'board-beer-9',
    ])
    expect(beerResourceSpaces.every((space) => space.kind === 'beer')).toBe(true)
    expect(
      beerResourceSpaces.map((space) => ({
        id: space.id,
        x: space.x,
        y: space.y,
      })),
    ).toEqual([
      { id: 'board-beer-1', x: 24.39, y: 17.4 },
      { id: 'board-beer-2', x: 30.81, y: 17.27 },
      { id: 'board-beer-3', x: 87.35, y: 22.84 },
      { id: 'board-beer-4', x: 93.77, y: 22.84 },
      { id: 'board-beer-5', x: 12.65, y: 59.28 },
      { id: 'board-beer-6', x: 78.87, y: 82.17 },
      { id: 'board-beer-7', x: 85.29, y: 82.29 },
      { id: 'board-beer-8', x: 57.08, y: 89.43 },
      { id: 'board-beer-9', x: 63.5, y: 89.31 },
    ])
  })

  it('defines nine calibratable merchant tile spots', () => {
    expect(merchantTileSpaces.map((space) => space.id)).toEqual([
      'merchant-tile-1',
      'merchant-tile-2',
      'merchant-tile-3',
      'merchant-tile-4',
      'merchant-tile-5',
      'merchant-tile-6',
      'merchant-tile-7',
      'merchant-tile-8',
      'merchant-tile-9',
    ])
    expect(merchantTileSpaces.map((space) => space.merchantIndex)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ])
    expect(
      merchantTileSpaces.map((space) => ({
        id: space.id,
        x: space.x,
        y: space.y,
      })),
    ).toEqual([
      { id: 'merchant-tile-1', x: 25.44, y: 13.43 },
      { id: 'merchant-tile-2', x: 29.91, y: 13.43 },
      { id: 'merchant-tile-3', x: 88, y: 18.99 },
      { id: 'merchant-tile-4', x: 92.84, y: 18.99 },
      { id: 'merchant-tile-5', x: 8.86, y: 60.26 },
      { id: 'merchant-tile-6', x: 79.65, y: 85.91 },
      { id: 'merchant-tile-7', x: 84.12, y: 85.91 },
      { id: 'merchant-tile-8', x: 57.99, y: 93.05 },
      { id: 'merchant-tile-9', x: 62.46, y: 93.05 },
    ])
  })

  it('defines merchant tiles in player-count order', () => {
    expect(merchantTiles.map((tile) => tile.kind)).toEqual([
      'manufacturer',
      'cotton',
      'all',
      'none',
      'none',
      'pottery',
      'none',
      'manufacturer',
      'cotton',
    ])
  })

  it('defines income track spaces from 0 through 99', () => {
    expect(incomeTrackSpaces.map((space) => space.value)).toEqual(
      Array.from({ length: 100 }, (_, index) => index),
    )
    expect(incomeTrackSpaces[0]).toMatchObject({
      id: 'income-0',
      value: 0,
    })
    expect(incomeTrackSpaces[99]).toMatchObject({
      id: 'income-99',
      value: 99,
    })
  })

  it('initializes two-player merchant tiles on the five always-used merchant spots', () => {
    const state = createBoardState(2, () => 0.99)

    expect(Object.keys(state.merchantTilePlacements)).toEqual([
      'merchant-tile-5',
      'merchant-tile-6',
      'merchant-tile-7',
      'merchant-tile-8',
      'merchant-tile-9',
    ])
    expect(Object.values(state.merchantTilePlacements).map((tile) => tile.kind)).toEqual([
      'manufacturer',
      'cotton',
      'all',
      'none',
      'none',
    ])
    expect(Object.keys(state.beerResourcePlacements)).toEqual([
      'board-beer-5',
      'board-beer-6',
      'board-beer-7',
    ])
  })

  it('adds the 3-4 player merchant spots for three-player games', () => {
    const state = createBoardState(3, () => 0.99)

    expect(Object.keys(state.merchantTilePlacements)).toEqual([
      'merchant-tile-1',
      'merchant-tile-2',
      'merchant-tile-5',
      'merchant-tile-6',
      'merchant-tile-7',
      'merchant-tile-8',
      'merchant-tile-9',
    ])
    expect(Object.values(state.merchantTilePlacements).map((tile) => tile.kind)).toEqual([
      'manufacturer',
      'cotton',
      'all',
      'none',
      'none',
      'pottery',
      'none',
    ])
    expect(Object.keys(state.beerResourcePlacements)).toEqual([
      'board-beer-1',
      'board-beer-2',
      'board-beer-5',
      'board-beer-8',
    ])
  })

  it('uses every merchant spot for four-player games and randomizes tile order', () => {
    const state = createBoardState(4, () => 0)

    expect(Object.keys(state.merchantTilePlacements)).toEqual([
      'merchant-tile-1',
      'merchant-tile-2',
      'merchant-tile-3',
      'merchant-tile-4',
      'merchant-tile-5',
      'merchant-tile-6',
      'merchant-tile-7',
      'merchant-tile-8',
      'merchant-tile-9',
    ])
    expect(Object.values(state.merchantTilePlacements).map((tile) => tile.tileIndex)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 1,
    ])
    expect(Object.keys(state.beerResourcePlacements)).toEqual([
      'board-beer-1',
      'board-beer-2',
      'board-beer-5',
      'board-beer-7',
      'board-beer-8',
      'board-beer-9',
    ])
  })

  it('excludes None merchant tiles from visible merchant placements', () => {
    const state = createBoardState(2, () => 0.99)

    expect(Object.keys(getVisibleMerchantTilePlacements(state))).toEqual([
      'merchant-tile-5',
      'merchant-tile-6',
      'merchant-tile-7',
    ])
  })

  it('aligns coal and iron market slots into calibrated grids', () => {
    const coalSlots = marketResourceSpaces.filter((space) => space.kind === 'coal')
    const ironSlots = marketResourceSpaces.filter((space) => space.kind === 'iron')

    expect(new Set(coalSlots.map((space) => space.x))).toEqual(new Set([83.96, 86.14]))
    expect(new Set(ironSlots.map((space) => space.x))).toEqual(new Set([89.23, 91.41]))
    expect(new Set(coalSlots.map((space) => space.y))).toHaveLength(7)
    expect(new Set(ironSlots.map((space) => space.y))).toHaveLength(5)
    expect([...new Set(coalSlots.map((space) => space.y))].sort()).toEqual([
      32.72,
      35.67,
      38.62,
      41.57,
      44.52,
      47.47,
      50.42,
    ])
    expect(coalSlots.filter((space) => space.x === 83.96)).toHaveLength(7)
    expect(coalSlots.filter((space) => space.x === 86.14)).toHaveLength(7)
    expect(ironSlots.filter((space) => space.x === 89.23)).toHaveLength(5)
    expect(ironSlots.filter((space) => space.x === 91.41)).toHaveLength(5)
    expect(
      [1, 3, 5, 7, 9].map(
        (index) => coalSlots.find((space) => space.marketIndex === index)?.y,
      ),
    ).toEqual(
      [1, 3, 5, 7, 9].map(
        (index) => ironSlots.find((space) => space.marketIndex === index)?.y,
      ),
    )
  })

  it('contains the supplied connection types', () => {
    expect(linkSpaces.find((space) => space.id === 'leek-belper')).toMatchObject({
      from: 'Leek',
      to: 'Belper',
      allowedKinds: ['rail'],
    })
    expect(linkSpaces.find((space) => space.id === 'burton-on-trent-walsall')).toMatchObject({
      from: 'Burton-on-Trent',
      to: 'Walsall',
      allowedKinds: ['canal'],
    })
    expect(linkSpaces.find((space) => space.id === 'birmingham-coventry')).toMatchObject({
      allowedKinds: ['canal', 'rail'],
    })
    expect(linkSpaces.find((space) => space.id === 'tamworth-birmingham')).toMatchObject({
      from: 'Tamworth',
      to: 'Birmingham',
      allowedKinds: ['canal', 'rail'],
    })
    expect(linkSpaces.find((space) => space.id === 'kidderminster-worcester-brewery-2')).toMatchObject({
      from: 'Kidderminster',
      to: 'Worcester',
      via: 'Brewery-2',
      allowedKinds: ['canal', 'rail'],
    })
  })

  it('treats every non-exception connection as both canal and rail', () => {
    expect(findLink('burton-on-trent-walsall')).toMatchObject({
      from: 'Burton-on-Trent',
      to: 'Walsall',
      allowedKinds: ['canal'],
    })

    linkSpaces.forEach((space) => {
      expect(space.allowedKinds).toEqual(linkKindExceptions[space.id] ?? ['canal', 'rail'])
    })
  })

  it('keeps industry spaces snapped to the calibrated city layout patterns', () => {
    const rowLayouts = [
      ['belper-1', 'belper-2', 'belper-3'],
      ['leek-1', 'leek-2'],
      ['stone-1', 'stone-2'],
      ['uttoxeter-1', 'uttoxeter-2'],
      ['stafford-1', 'stafford-2'],
      ['burton-on-trent-1', 'burton-on-trent-2'],
      ['cannock-1', 'cannock-2'],
      ['tamworth-1', 'tamworth-2'],
      ['walsall-1', 'walsall-2'],
      ['dudley-1', 'dudley-2'],
      ['kidderminster-1', 'kidderminster-2'],
      ['wolverhampton-1', 'wolverhampton-2'],
      ['worcester-1', 'worcester-2'],
      ['nuneaton-1', 'nuneaton-2'],
      ['redditch-1', 'redditch-2'],
    ]

    rowLayouts.forEach((layout) => {
      expectSameCoordinate(getSpaces(layout).map((space) => space.y))
    })

    const triangleLayouts = [
      ['derby-1', 'derby-2', 'derby-3'],
      ['stoke-on-trent-1', 'stoke-on-trent-2', 'stoke-on-trent-3'],
      ['coalbrookdale-1', 'coalbrookdale-2', 'coalbrookdale-3'],
      ['coventry-1', 'coventry-2', 'coventry-3'],
    ]

    triangleLayouts.forEach((layout) => {
      const [top, bottomLeft, bottomRight] = getSpaces(layout)

      expect(bottomLeft.y).toBe(bottomRight.y)
      expect(top.x).toBe((bottomLeft.x + bottomRight.x) / 2)
    })

    const [topLeft, topRight, bottomLeft, bottomRight] = getSpaces([
      'birmingham-1',
      'birmingham-2',
      'birmingham-3',
      'birmingham-4',
    ])

    expect(topLeft.y).toBe(topRight.y)
    expect(bottomLeft.y).toBe(bottomRight.y)
    expect(topLeft.x).toBe(bottomLeft.x)
    expect(topRight.x).toBe(bottomRight.x)
  })

  it('does not replace an occupied industry space', () => {
    const state = placeIndustryTile(createBoardState(), 'birmingham-1', {
      id: 'tile-cotton-1',
      industry: 'cotton',
      ownerId: 'player-1',
    })

    const result = placeIndustryTile(state, 'birmingham-1', {
      id: 'tile-brewery-1',
      industry: 'brewery',
      ownerId: 'player-2',
    })

    expect(result).toEqual(state)
  })

  it('rejects an industry tile that is not allowed on the target space', () => {
    const state = createBoardState()
    const result = placeIndustryTile(state, 'birmingham-3', {
      id: 'tile-cotton-1',
      industry: 'cotton',
      ownerId: 'player-1',
    })

    expect(result).toEqual(state)
  })

  it('places a canal or rail tile onto an empty link space', () => {
    const state = createBoardState()
    const result = placeLinkTile(state, 'birmingham-coventry', {
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })

    expect(result.linkPlacements['birmingham-coventry']).toEqual({
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })
  })

  it('removes link tiles from occupied connection spaces', () => {
    const state = placeLinkTile(createBoardState(), 'birmingham-coventry', {
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })

    expect(removeLinkTile(state, 'birmingham-coventry').linkPlacements).toEqual({})
    expect(removeLinkTile(state, 'missing-link')).toEqual(state)
  })

  it('moves a link tile to another valid empty connection space', () => {
    const state = placeLinkTile(createBoardState(), 'birmingham-coventry', {
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })
    const result = moveLinkTile(state, 'birmingham-coventry', 'birmingham-oxford', {
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })

    expect(result.linkPlacements['birmingham-coventry']).toBeUndefined()
    expect(result.linkPlacements['birmingham-oxford']).toEqual({
      id: 'link-canal-1',
      kind: 'canal',
      ownerId: 'player-1',
    })
  })

  it('starts markets with cubes in every slot except the printed empty slots', () => {
    const state = createBoardState()

    expect(state.marketResourcePlacements['coal-market-1']).toMatchObject({
      kind: 'coal',
      spaceId: 'coal-market-1',
    })
    expect(state.marketResourcePlacements['coal-market-2']).toBeUndefined()
    expect(state.marketResourcePlacements['iron-market-1']).toBeUndefined()
    expect(state.marketResourcePlacements['iron-market-2']).toBeUndefined()
    expect(state.marketResourcePlacements['iron-market-3']).toMatchObject({
      kind: 'iron',
      spaceId: 'iron-market-3',
    })
  })

  it('places and removes market resource cubes', () => {
    const state = createBoardState()
    const withCoal = placeMarketResourceCube(state, 'coal-market-2', {
      id: 'coal-cube-added',
      kind: 'coal',
      spaceId: 'coal-market-2',
    })
    const withoutCoal = removeMarketResourceCube(withCoal, 'coal-market-2')

    expect(withCoal.marketResourcePlacements['coal-market-2']).toEqual({
      id: 'coal-cube-added',
      kind: 'coal',
      spaceId: 'coal-market-2',
    })
    expect(withoutCoal.marketResourcePlacements['coal-market-2']).toBeUndefined()
  })

  it('places and removes beer cubes on board beer spots', () => {
    const state = createBoardState()
    const withBeer = placeBeerResourceCube(state, 'board-beer-1', {
      id: 'beer-cube-1',
      kind: 'beer',
      spaceId: 'board-beer-1',
    })

    expect(withBeer.beerResourcePlacements['board-beer-1']).toEqual({
      id: 'beer-cube-1',
      kind: 'beer',
      spaceId: 'board-beer-1',
    })
    expect(
      placeBeerResourceCube(withBeer, 'board-beer-2', {
        id: 'coal-cube-1',
        kind: 'coal',
        spaceId: 'board-beer-2',
      }),
    ).toEqual(withBeer)
    expect(
      placeBeerResourceCube(withBeer, 'board-beer-1', {
        id: 'beer-cube-2',
        kind: 'beer',
        spaceId: 'board-beer-1',
      }),
    ).toEqual(withBeer)

    expect(removeBeerResourceCube(withBeer, 'board-beer-1').beerResourcePlacements).toEqual({})
  })

  it('moves a resource cube from an industry tile into a board beer spot', () => {
    const state = placeIndustryResourceCube(
      placeIndustryTile(createBoardState(), 'burton-on-trent-2', {
        id: 'brewery-tile',
        industry: 'brewery',
        ownerId: 'player-1',
      }),
      'burton-on-trent-2',
      {
        id: 'beer-cube-1',
        kind: 'beer',
        spaceId: 'burton-on-trent-2',
      },
    )
    const result = moveResourceCubeToBeer(
      state,
      'board-beer-1',
      {
        id: 'beer-cube-1',
        kind: 'beer',
        spaceId: 'board-beer-1',
      },
      { industrySpaceId: 'burton-on-trent-2' },
    )

    expect(result.beerResourcePlacements['board-beer-1']).toEqual({
      id: 'beer-cube-1',
      kind: 'beer',
      spaceId: 'board-beer-1',
    })
    expect(result.industryResourcePlacements['burton-on-trent-2']).toEqual([])
  })

  it('moves a resource cube from an industry tile into a market slot', () => {
    const state = placeIndustryResourceCube(
      placeIndustryTile(createBoardState(), 'cannock-2', {
        id: 'coal-mine-tile',
        industry: 'coal',
        ownerId: 'player-1',
      }),
      'cannock-2',
      {
        id: 'coal-cube-1',
        kind: 'coal',
        spaceId: 'cannock-2',
      },
    )
    const result = moveResourceCubeToMarket(
      state,
      'coal-market-2',
      {
        id: 'coal-cube-1',
        kind: 'coal',
        spaceId: 'coal-market-2',
      },
      { industrySpaceId: 'cannock-2' },
    )

    expect(result.marketResourcePlacements['coal-market-2']).toEqual({
      id: 'coal-cube-1',
      kind: 'coal',
      spaceId: 'coal-market-2',
    })
    expect(result.industryResourcePlacements['cannock-2']).toEqual([])
  })

  it('rejects market resource cubes for occupied, wrong, or unknown spaces', () => {
    const state = createBoardState()

    expect(
      placeMarketResourceCube(state, 'coal-market-2', {
        id: 'iron-cube-added',
        kind: 'iron',
        spaceId: 'coal-market-2',
      }),
    ).toEqual(state)
    expect(
      placeMarketResourceCube(state, 'coal-market-1', {
        id: 'coal-cube-added',
        kind: 'coal',
        spaceId: 'coal-market-1',
      }),
    ).toEqual(state)
    expect(
      placeMarketResourceCube(state, 'missing-market', {
        id: 'coal-cube-added',
        kind: 'coal',
        spaceId: 'missing-market',
      }),
    ).toEqual(state)
  })

  it('places resources on matching built industry tiles up to capacity', () => {
    const state = placeIndustryTile(createBoardState(), 'cannock-2', {
      id: 'coal-mine-tile',
      industry: 'coal',
      ownerId: 'player-1',
    })
    const fullCoalMine = Array.from({ length: 5 }, (_, index) => index + 1).reduce(
      (currentState, index) =>
        placeIndustryResourceCube(currentState, 'cannock-2', {
          id: `coal-cube-${index}`,
          kind: 'coal',
          spaceId: 'cannock-2',
        }),
      state,
    )

    expect(fullCoalMine.industryResourcePlacements['cannock-2']).toHaveLength(5)
    expect(
      placeIndustryResourceCube(fullCoalMine, 'cannock-2', {
        id: 'coal-cube-6',
        kind: 'coal',
        spaceId: 'cannock-2',
      }),
    ).toEqual(fullCoalMine)
  })

  it('places iron and beer on matching built industry tiles', () => {
    const state = placeIndustryTile(
      placeIndustryTile(createBoardState(), 'birmingham-3', {
        id: 'iron-works-tile',
        industry: 'iron',
        ownerId: 'player-1',
      }),
      'burton-on-trent-2',
      {
        id: 'brewery-tile',
        industry: 'brewery',
        ownerId: 'player-1',
      },
    )
    const withIron = placeIndustryResourceCube(state, 'birmingham-3', {
      id: 'iron-cube-1',
      kind: 'iron',
      spaceId: 'birmingham-3',
    })
    const withBeer = placeIndustryResourceCube(withIron, 'burton-on-trent-2', {
      id: 'beer-cube-1',
      kind: 'beer',
      spaceId: 'burton-on-trent-2',
    })

    expect(withBeer.industryResourcePlacements['birmingham-3']).toEqual([
      {
        id: 'iron-cube-1',
        kind: 'iron',
        spaceId: 'birmingham-3',
      },
    ])
    expect(withBeer.industryResourcePlacements['burton-on-trent-2']).toEqual([
      {
        id: 'beer-cube-1',
        kind: 'beer',
        spaceId: 'burton-on-trent-2',
      },
    ])
  })

  it('rejects industry resources for unbuilt, wrong, or full industry spaces', () => {
    const state = placeIndustryTile(createBoardState(), 'cannock-2', {
      id: 'coal-mine-tile',
      industry: 'coal',
      ownerId: 'player-1',
    })

    expect(
      placeIndustryResourceCube(state, 'cannock-2', {
        id: 'iron-cube-1',
        kind: 'iron',
        spaceId: 'cannock-2',
      }),
    ).toEqual(state)
    expect(
      placeIndustryResourceCube(state, 'birmingham-3', {
        id: 'iron-cube-1',
        kind: 'iron',
        spaceId: 'birmingham-3',
      }),
    ).toEqual(state)
  })

  it('removes resource cubes from built industry spaces', () => {
    const state = placeIndustryResourceCube(
      placeIndustryTile(createBoardState(), 'burton-on-trent-2', {
        id: 'brewery-tile',
        industry: 'brewery',
        ownerId: 'player-1',
      }),
      'burton-on-trent-2',
      {
        id: 'beer-cube-1',
        kind: 'beer',
        spaceId: 'burton-on-trent-2',
      },
    )
    const result = removeIndustryResourceCube(state, 'burton-on-trent-2', 'beer-cube-1')

    expect(result.industryResourcePlacements['burton-on-trent-2']).toEqual([])
  })

  it('rejects a link tile kind that is not allowed on the target connection', () => {
    const state = createBoardState()

    expect(
      placeLinkTile(state, 'leek-belper', {
        id: 'link-canal-1',
        kind: 'canal',
        ownerId: 'player-1',
      }),
    ).toEqual(state)
  })

  it('ignores unknown target spaces', () => {
    const state = createBoardState()

    expect(
      placeIndustryTile(state, linkSpaces[0].id, {
        id: 'tile-iron-1',
        industry: 'iron',
        ownerId: 'player-1',
      }),
    ).toEqual(state)
    expect(
      placeLinkTile(state, industrySpaces[0].id, {
        id: 'link-rail-1',
        kind: 'rail',
        ownerId: 'player-1',
      }),
    ).toEqual(state)
  })

  it('converts a board click into percentage coordinates', () => {
    expect(
      getBoardPointFromClientPosition(
        { left: 100, top: 200, width: 400, height: 800 },
        300,
        600,
      ),
    ).toEqual({ x: 50, y: 50 })
  })

  it('updates an industry space calibration point', () => {
    const result = updateIndustrySpaceCalibration(industrySpaces, 'birmingham-1', {
      x: 61.25,
      y: 70.5,
    })

    expect(result.find((space) => space.id === 'birmingham-1')).toMatchObject({
      x: 61.25,
      y: 70.5,
    })
  })

  it('updates a link space calibration point and rotation', () => {
    const result = updateLinkSpaceCalibration(linkSpaces, 'birmingham-coventry', {
      x: 71,
      y: 74,
      rotation: 32,
    })

    expect(result.find((space) => space.id === 'birmingham-coventry')).toMatchObject({
      x: 71,
      y: 74,
      rotation: 32,
    })
  })

  it('updates board stack control and market resource calibration points', () => {
    expect(
      updateBoardControlSpaceCalibration(boardControlSpaces, 'standard-draw-stack', {
        x: 12.5,
        y: 88.25,
      }).find((space) => space.id === 'standard-draw-stack'),
    ).toMatchObject({
      x: 12.5,
      y: 88.25,
    })
    expect(
      updateMarketResourceSpaceCalibration(marketResourceSpaces, 'coal-market-1', {
        x: 18.75,
        y: 91.5,
      }).find((space) => space.id === 'coal-market-1'),
    ).toMatchObject({
      x: 18.75,
      y: 91.5,
    })
    expect(
      updateBeerResourceSpaceCalibration(beerResourceSpaces, 'board-beer-4', {
        x: 31.25,
        y: 45.75,
      }).find((space) => space.id === 'board-beer-4'),
    ).toMatchObject({
      x: 31.25,
      y: 45.75,
    })
    expect(
      updateMerchantTileSpaceCalibration(merchantTileSpaces, 'merchant-tile-4', {
        x: 42.5,
        y: 61.25,
      }).find((space) => space.id === 'merchant-tile-4'),
    ).toMatchObject({
      x: 42.5,
      y: 61.25,
    })
    expect(
      updateIncomeTrackSpaceCalibration(incomeTrackSpaces, 'income-42', {
        x: 12.25,
        y: 34.5,
      }).find((space) => space.id === 'income-42'),
    ).toMatchObject({
      x: 12.25,
      y: 34.5,
      value: 42,
    })
  })

})
