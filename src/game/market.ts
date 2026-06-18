import { marketResourceSpaces, moveResourceCubeToMarket, placeMarketResourceCube } from './board'
import type { MarketResourceSpace, ResourceCubeKind } from './board'
import type { BoardState } from './board'

export type MarketResourceKind = Extract<ResourceCubeKind, 'coal' | 'iron'>

export const MARKET_GENERAL_SUPPLY_COST: Record<MarketResourceKind, number> = {
  coal: 8,
  iron: 6,
}

export function getMarketResourceCost(resourceKind: MarketResourceKind, marketIndex: number): number {
  return Math.max(1, Math.ceil(marketIndex / 2))
}

export function getMarketResourceSpacesForKind(resourceKind: MarketResourceKind): MarketResourceSpace[] {
  return marketResourceSpaces.filter((space) => space.kind === resourceKind)
}

export function getCheapestMarketResourcePlacement(
  board: BoardState,
  resourceKind: MarketResourceKind,
):
  | {
      resource: { id: string; kind: ResourceCubeKind; spaceId: string }
      space: MarketResourceSpace
    }
  | undefined {
  return Object.values(board.marketResourcePlacements)
    .filter((resource) => resource.kind === resourceKind)
    .map((resource) => ({
      resource,
      space: marketResourceSpaces.find((space) => space.id === resource.spaceId),
    }))
    .filter(
      (
        entry,
      ): entry is {
        resource: { id: string; kind: ResourceCubeKind; spaceId: string }
        space: MarketResourceSpace
      } => Boolean(entry.space),
    )
    .sort((left, right) => left.space.marketIndex - right.space.marketIndex)[0]
}

export function getMostExpensiveEmptyMarketSpace(
  board: BoardState,
  resourceKind: MarketResourceKind,
): MarketResourceSpace | undefined {
  return marketResourceSpaces
    .filter((space) => space.kind === resourceKind && !board.marketResourcePlacements[space.id])
    .sort((left, right) => right.marketIndex - left.marketIndex)[0]
}

export function sellResourceCubeToHighestEmptyMarket(
  board: BoardState,
  resourceKind: MarketResourceKind,
  cube: { id: string; kind: ResourceCubeKind; spaceId: string },
  source?: { industrySpaceId?: string },
): { board: BoardState; space: MarketResourceSpace; revenue: number } | null {
  const marketSpace = getMostExpensiveEmptyMarketSpace(board, resourceKind)

  if (!marketSpace) {
    return null
  }

  const cubeOnMarket = {
    ...cube,
    kind: resourceKind,
    spaceId: marketSpace.id,
  }
  const nextBoard = source?.industrySpaceId
    ? moveResourceCubeToMarket(board, marketSpace.id, cubeOnMarket, source)
    : placeMarketResourceCube(board, marketSpace.id, cubeOnMarket)

  if (nextBoard === board) {
    return null
  }

  return {
    board: nextBoard,
    space: marketSpace,
    revenue: getMarketResourceCost(resourceKind, marketSpace.marketIndex),
  }
}
