import type { Industry } from './cards'
import type { PlayerColor } from './game'

export const playerBoardTileAssetColors = ['white', 'orange', 'purple', 'yellow'] as const

export type PlayerBoardTileAssetColor = (typeof playerBoardTileAssetColors)[number]

export type PlayerBoardIndustryTile = {
  id: string
  industry: Industry
  level: number
  count: number
  x: number
  y: number
}

export type PlayerBoardTileResourceCost = Partial<Record<'beer' | 'coal' | 'iron', number>>

export type PlayerBoardIndustryTileRule = {
  buildCost: {
    money: number
    resources?: PlayerBoardTileResourceCost
  }
  incomeIncrease: number
  sellBeer?: number
  victoryPoints: number
}

export const playerBoardColorByPlayerColor = {
  white: 'white',
  red: 'orange',
  purple: 'purple',
  yellow: 'yellow',
} satisfies Record<PlayerColor, PlayerBoardTileAssetColor>

export const getPlayerBoardAssetColor = (playerColor: PlayerColor): PlayerBoardTileAssetColor =>
  playerBoardColorByPlayerColor[playerColor]

export const playerBoardIndustryTiles: PlayerBoardIndustryTile[] = [
  { id: 'cotton-1', industry: 'cotton', level: 1, count: 3, x: 31.53, y: 69.2 },
  { id: 'cotton-2', industry: 'cotton', level: 2, count: 2, x: 31.53, y: 56.51 },
  { id: 'cotton-3', industry: 'cotton', level: 3, count: 3, x: 31.53, y: 44.39 },
  { id: 'cotton-4', industry: 'cotton', level: 4, count: 3, x: 31.53, y: 32.08 },
  { id: 'iron-1', industry: 'iron', level: 1, count: 1, x: 72.63, y: 69.31 },
  { id: 'iron-2', industry: 'iron', level: 2, count: 1, x: 88.14, y: 69.31 },
  { id: 'iron-3', industry: 'iron', level: 3, count: 1, x: 88.14, y: 56.62 },
  { id: 'iron-4', industry: 'iron', level: 4, count: 1, x: 88.14, y: 44.51 },
  { id: 'brewery-1', industry: 'brewery', level: 1, count: 2, x: 10.84, y: 88.9 },
  { id: 'brewery-2', industry: 'brewery', level: 2, count: 2, x: 10.84, y: 76.7 },
  { id: 'brewery-3', industry: 'brewery', level: 3, count: 2, x: 10.84, y: 64.26 },
  { id: 'brewery-4', industry: 'brewery', level: 4, count: 1, x: 10.84, y: 51.83 },
  { id: 'coal-1', industry: 'coal', level: 1, count: 1, x: 36.22, y: 89.75 },
  { id: 'coal-2', industry: 'coal', level: 2, count: 2, x: 51.82, y: 89.75 },
  { id: 'coal-3', industry: 'coal', level: 3, count: 2, x: 68.01, y: 89.75 },
  { id: 'coal-4', industry: 'coal', level: 4, count: 2, x: 83.61, y: 89.75 },
  { id: 'pottery-1', industry: 'pottery', level: 1, count: 1, x: 51.72, y: 69.2 },
  { id: 'pottery-2', industry: 'pottery', level: 2, count: 1, x: 51.72, y: 56.51 },
  { id: 'pottery-3', industry: 'pottery', level: 3, count: 1, x: 51.72, y: 44.39 },
  { id: 'pottery-4', industry: 'pottery', level: 4, count: 1, x: 51.72, y: 32.08 },
  { id: 'pottery-5', industry: 'pottery', level: 5, count: 1, x: 67.22, y: 32.08 },
  { id: 'manufacturer-1', industry: 'manufacturer', level: 1, count: 1, x: 10.28, y: 35 },
  { id: 'manufacturer-2', industry: 'manufacturer', level: 2, count: 2, x: 10.28, y: 23.29 },
  { id: 'manufacturer-3', industry: 'manufacturer', level: 3, count: 1, x: 10.28, y: 10.49 },
  { id: 'manufacturer-4', industry: 'manufacturer', level: 4, count: 1, x: 26.15, y: 10.49 },
  { id: 'manufacturer-5', industry: 'manufacturer', level: 5, count: 2, x: 41.94, y: 10.49 },
  { id: 'manufacturer-6', industry: 'manufacturer', level: 6, count: 1, x: 57.74, y: 10.49 },
  { id: 'manufacturer-7', industry: 'manufacturer', level: 7, count: 1, x: 73.34, y: 10.49 },
  { id: 'manufacturer-8', industry: 'manufacturer', level: 8, count: 2, x: 89.14, y: 10.49 },
]

export const playerBoardIndustryTileRules: Record<string, PlayerBoardIndustryTileRule> = {
  'manufacturer-1': { buildCost: { money: 8, resources: { coal: 1 } }, incomeIncrease: 5, sellBeer: 1, victoryPoints: 3 },
  'manufacturer-2': { buildCost: { money: 10, resources: { iron: 1 } }, incomeIncrease: 1, sellBeer: 1, victoryPoints: 5 },
  'manufacturer-3': { buildCost: { money: 12, resources: { coal: 2 } }, incomeIncrease: 4, sellBeer: 0, victoryPoints: 4 },
  'manufacturer-4': { buildCost: { money: 14, resources: { iron: 1 } }, incomeIncrease: 6, sellBeer: 1, victoryPoints: 3 },
  'manufacturer-5': { buildCost: { money: 16, resources: { coal: 1 } }, incomeIncrease: 2, sellBeer: 2, victoryPoints: 8 },
  'manufacturer-6': { buildCost: { money: 20 }, incomeIncrease: 6, sellBeer: 1, victoryPoints: 7 },
  'manufacturer-7': { buildCost: { money: 16, resources: { coal: 1, iron: 1 } }, incomeIncrease: 4, sellBeer: 0, victoryPoints: 9 },
  'manufacturer-8': { buildCost: { money: 20, resources: { iron: 2 } }, incomeIncrease: 1, sellBeer: 1, victoryPoints: 11 },
  'cotton-1': { buildCost: { money: 12 }, incomeIncrease: 5, sellBeer: 1, victoryPoints: 5 },
  'cotton-2': { buildCost: { money: 14, resources: { coal: 1 } }, incomeIncrease: 4, sellBeer: 1, victoryPoints: 5 },
  'cotton-3': { buildCost: { money: 16, resources: { coal: 1, iron: 1 } }, incomeIncrease: 3, sellBeer: 1, victoryPoints: 9 },
  'cotton-4': { buildCost: { money: 18, resources: { coal: 1, iron: 1 } }, incomeIncrease: 2, sellBeer: 1, victoryPoints: 12 },
  'pottery-1': { buildCost: { money: 17, resources: { iron: 1 } }, incomeIncrease: 5, sellBeer: 1, victoryPoints: 10 },
  'pottery-2': { buildCost: { money: 0, resources: { coal: 1 } }, incomeIncrease: 1, sellBeer: 1, victoryPoints: 1 },
  'pottery-3': { buildCost: { money: 22, resources: { coal: 2 } }, incomeIncrease: 5, sellBeer: 2, victoryPoints: 11 },
  'pottery-4': { buildCost: { money: 0, resources: { coal: 1 } }, incomeIncrease: 1, sellBeer: 1, victoryPoints: 1 },
  'pottery-5': { buildCost: { money: 24, resources: { coal: 2 } }, incomeIncrease: 5, sellBeer: 2, victoryPoints: 20 },
  'brewery-1': { buildCost: { money: 5, resources: { iron: 1 } }, incomeIncrease: 4, victoryPoints: 4 },
  'brewery-2': { buildCost: { money: 7, resources: { iron: 1 } }, incomeIncrease: 5, victoryPoints: 5 },
  'brewery-3': { buildCost: { money: 9, resources: { iron: 1 } }, incomeIncrease: 5, victoryPoints: 7 },
  'brewery-4': { buildCost: { money: 9, resources: { iron: 1 } }, incomeIncrease: 5, victoryPoints: 10 },
  'iron-1': { buildCost: { money: 5, resources: { coal: 1 } }, incomeIncrease: 3, victoryPoints: 3 },
  'iron-2': { buildCost: { money: 7, resources: { coal: 1 } }, incomeIncrease: 3, victoryPoints: 5 },
  'iron-3': { buildCost: { money: 9, resources: { coal: 1 } }, incomeIncrease: 2, victoryPoints: 7 },
  'iron-4': { buildCost: { money: 12, resources: { coal: 1 } }, incomeIncrease: 1, victoryPoints: 9 },
  'coal-1': { buildCost: { money: 5 }, incomeIncrease: 4, victoryPoints: 1 },
  'coal-2': { buildCost: { money: 7 }, incomeIncrease: 7, victoryPoints: 2 },
  'coal-3': { buildCost: { money: 8, resources: { iron: 1 } }, incomeIncrease: 6, victoryPoints: 3 },
  'coal-4': { buildCost: { money: 10, resources: { iron: 1 } }, incomeIncrease: 5, victoryPoints: 4 },
}

export function getPlayerBoardTileCount(tileId: string): number {
  return playerBoardIndustryTiles.find((tile) => tile.id === tileId)?.count ?? 1
}

export function getPlayerBoardIndustryTileRule(
  tileId: string,
): PlayerBoardIndustryTileRule | undefined {
  return playerBoardIndustryTileRules[tileId]
}

export function isPlayerBoardTileDevelopable(tileId: string): boolean {
  return tileId !== 'pottery-1' && tileId !== 'pottery-3'
}

export function isPlayerBoardIndustryTileUsable(
  tileId: string,
  remainingCountByTileId: Partial<Record<string, number>>,
  tiles: PlayerBoardIndustryTile[] = playerBoardIndustryTiles,
): boolean {
  const tile = tiles.find((currentTile) => currentTile.id === tileId)

  if (!tile) {
    return false
  }

  return tiles
    .filter(
      (currentTile) =>
        currentTile.industry === tile.industry && currentTile.level < tile.level,
    )
    .every((lowerTile) => (remainingCountByTileId[lowerTile.id] ?? 0) === 0)
}

export function updatePlayerBoardTileCalibration(
  tiles: PlayerBoardIndustryTile[],
  tileId: string,
  point: Pick<PlayerBoardIndustryTile, 'x' | 'y'>,
): PlayerBoardIndustryTile[] {
  return tiles.map((tile) =>
    tile.id === tileId
      ? {
          ...tile,
          x: point.x,
          y: point.y,
        }
      : tile,
  )
}
