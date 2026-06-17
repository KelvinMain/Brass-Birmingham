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

export function getPlayerBoardTileCount(tileId: string): number {
  return playerBoardIndustryTiles.find((tile) => tile.id === tileId)?.count ?? 1
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
