import { describe, expect, it } from 'vitest'

import {
  getPlayerBoardAssetColor,
  getPlayerBoardTileCount,
  isPlayerBoardIndustryTileUsable,
  isPlayerBoardTileDevelopable,
  playerBoardIndustryTiles,
  playerBoardTileAssetColors,
  updatePlayerBoardTileCalibration,
} from './playerBoard'

describe('player board tile assets', () => {
  it('maps game player colors to the scanned player board colors', () => {
    expect(playerBoardTileAssetColors).toEqual(['white', 'orange', 'purple', 'yellow'])
    expect(getPlayerBoardAssetColor('white')).toBe('white')
    expect(getPlayerBoardAssetColor('red')).toBe('orange')
    expect(getPlayerBoardAssetColor('blue')).toBe('purple')
    expect(getPlayerBoardAssetColor('green')).toBe('yellow')
  })

  it('defines the 29 buildable industry tiles in scanned sheet order', () => {
    expect(playerBoardIndustryTiles).toHaveLength(29)
    expect(playerBoardIndustryTiles.map((tile) => tile.id)).toEqual([
      'cotton-1',
      'cotton-2',
      'cotton-3',
      'cotton-4',
      'iron-1',
      'iron-2',
      'iron-3',
      'iron-4',
      'brewery-1',
      'brewery-2',
      'brewery-3',
      'brewery-4',
      'coal-1',
      'coal-2',
      'coal-3',
      'coal-4',
      'pottery-1',
      'pottery-2',
      'pottery-3',
      'pottery-4',
      'pottery-5',
      'manufacturer-1',
      'manufacturer-2',
      'manufacturer-3',
      'manufacturer-4',
      'manufacturer-5',
      'manufacturer-6',
      'manufacturer-7',
      'manufacturer-8',
    ])
  })

  it('defines a calibratable board position for every buildable industry tile', () => {
    expect(playerBoardIndustryTiles.every((tile) => typeof tile.x === 'number')).toBe(true)
    expect(playerBoardIndustryTiles.every((tile) => typeof tile.y === 'number')).toBe(true)
  })

  it('defines the number of copies for each player board industry tile', () => {
    expect(getPlayerBoardTileCount('brewery-1')).toBe(2)
    expect(getPlayerBoardTileCount('brewery-2')).toBe(2)
    expect(getPlayerBoardTileCount('brewery-3')).toBe(2)
    expect(getPlayerBoardTileCount('brewery-4')).toBe(1)
    expect(getPlayerBoardTileCount('coal-1')).toBe(1)
    expect(getPlayerBoardTileCount('coal-2')).toBe(2)
    expect(getPlayerBoardTileCount('coal-3')).toBe(2)
    expect(getPlayerBoardTileCount('coal-4')).toBe(2)
    expect(getPlayerBoardTileCount('manufacturer-2')).toBe(2)
    expect(getPlayerBoardTileCount('manufacturer-5')).toBe(2)
    expect(getPlayerBoardTileCount('manufacturer-8')).toBe(2)
    expect(getPlayerBoardTileCount('manufacturer-7')).toBe(1)
    expect(getPlayerBoardTileCount('cotton-1')).toBe(3)
    expect(getPlayerBoardTileCount('cotton-2')).toBe(2)
    expect(getPlayerBoardTileCount('cotton-3')).toBe(3)
    expect(getPlayerBoardTileCount('cotton-4')).toBe(3)
    expect(getPlayerBoardTileCount('iron-4')).toBe(1)
    expect(getPlayerBoardTileCount('pottery-5')).toBe(1)
  })

  it('prevents pottery one and pottery three from being developed', () => {
    expect(isPlayerBoardTileDevelopable('pottery-1')).toBe(false)
    expect(isPlayerBoardTileDevelopable('pottery-3')).toBe(false)
    expect(isPlayerBoardTileDevelopable('pottery-2')).toBe(true)
    expect(isPlayerBoardTileDevelopable('brewery-1')).toBe(true)
  })

  it('blocks player board tiles while lower levels of the same industry remain', () => {
    expect(
      isPlayerBoardIndustryTileUsable('cotton-2', {
        'cotton-1': 1,
        'cotton-2': 2,
      }),
    ).toBe(false)
    expect(
      isPlayerBoardIndustryTileUsable('cotton-2', {
        'cotton-1': 0,
        'cotton-2': 2,
      }),
    ).toBe(true)
    expect(
      isPlayerBoardIndustryTileUsable('manufacturer-5', {
        'manufacturer-1': 0,
        'manufacturer-2': 0,
        'manufacturer-3': 1,
        'manufacturer-4': 0,
        'manufacturer-5': 2,
      }),
    ).toBe(false)
    expect(isPlayerBoardIndustryTileUsable('brewery-1', { 'brewery-1': 2 })).toBe(true)
  })

  it('updates one player board tile calibration without changing the others', () => {
    const result = updatePlayerBoardTileCalibration(playerBoardIndustryTiles, 'iron-2', {
      x: 33.33,
      y: 44.44,
    })

    expect(result.find((tile) => tile.id === 'iron-2')).toMatchObject({
      id: 'iron-2',
      x: 33.33,
      y: 44.44,
    })
    expect(result.find((tile) => tile.id === 'iron-1')).toEqual(
      playerBoardIndustryTiles.find((tile) => tile.id === 'iron-1'),
    )
    expect(playerBoardIndustryTiles.find((tile) => tile.id === 'iron-2')).not.toMatchObject({
      x: 33.33,
      y: 44.44,
    })
  })
})
