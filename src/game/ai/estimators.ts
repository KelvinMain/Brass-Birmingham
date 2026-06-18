import type { Industry } from '../cards'
import {
  getVisibleMerchantTilePlacements,
  industrySpaces,
  linkSpaces,
  marketLocations,
  removeIndustryResourceCube,
  removeMarketResourceCube,
} from '../board'
import type { BoardState } from '../board'
import type { GameCard } from '../deck'
import { getIncomeMoneyDelta } from '../game'
import type { GameState } from '../game'
import {
  getCheapestMarketResourcePlacement,
  getMarketResourceCost,
  MARKET_GENERAL_SUPPLY_COST,
} from '../market'
import { getPlayerBoardIndustryTileRule } from '../playerBoard'
import type { AiCandidateAction } from '../aiActions'

export const PREFERRED_INCOME_TRACK = 10

const sellableIndustries = ['cotton', 'manufacturer', 'pottery'] as const
type SellableIndustry = (typeof sellableIndustries)[number]

const merchantLocationBySpaceId = {
  'merchant-tile-1': 'Warrington',
  'merchant-tile-2': 'Warrington',
  'merchant-tile-3': 'Nottingham',
  'merchant-tile-4': 'Nottingham',
  'merchant-tile-5': 'Shrewsbury',
  'merchant-tile-6': 'Oxford',
  'merchant-tile-7': 'Oxford',
  'merchant-tile-8': 'Gloucester',
  'merchant-tile-9': 'Gloucester',
} as const

export function scoreIncomeTrackPreference(income: number): number {
  return -Math.abs(getIncomeMoneyDelta(income)) * 4
}

export function scoreIncomeTrackChange(before: number, after: number): number {
  return scoreIncomeTrackPreference(after) - scoreIncomeTrackPreference(before)
}

function getIndustrySpaceCity(spaceId: string): string {
  return industrySpaces.find((space) => space.id === spaceId)?.city ?? spaceId
}

function getUnflippedIndustryResourceSources(
  board: BoardState,
  resourceKind: 'coal' | 'iron' | 'beer',
) {
  return Object.entries(board.industryPlacements)
    .filter(([, placement]) => !placement.flipped)
    .map(([spaceId]) => {
      const resources = board.industryResourcePlacements[spaceId] ?? []
      const matchingResources = resources.filter((resource) => resource.kind === resourceKind)

      return {
        spaceId,
        cityName: getIndustrySpaceCity(spaceId),
        resourceIds: matchingResources.map((resource) => resource.id),
      }
    })
    .filter((source) => source.resourceIds.length > 0)
}

function countAvailableIronCubes(board: BoardState): number {
  return getUnflippedIndustryResourceSources(board, 'iron').reduce(
    (total, source) => total + source.resourceIds.length,
    0,
  )
}

export function estimateIronPurchaseCost(game: GameState, ironCount: number): number {
  let cost = 0
  let board = game.board
  let remaining = Math.max(0, ironCount - countAvailableIronCubes(board))

  for (let index = 0; index < remaining; index += 1) {
    const marketSpace = getCheapestMarketResourcePlacement(board, 'iron')

    if (marketSpace) {
      cost += getMarketResourceCost('iron', marketSpace.space.marketIndex)
      board = removeMarketResourceCube(board, marketSpace.resource.spaceId)
      continue
    }

    cost += MARKET_GENERAL_SUPPLY_COST.iron
  }

  return cost
}

function areLocationsConnected(board: BoardState, fromLocation: string, toLocation: string): boolean {
  if (fromLocation === toLocation) {
    return true
  }

  const visited = new Set<string>()
  const queue = [fromLocation]

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current || visited.has(current)) {
      continue
    }

    if (current === toLocation) {
      return true
    }

    visited.add(current)

    for (const linkSpace of linkSpaces) {
      const placement = board.linkPlacements[linkSpace.id]

      if (!placement) {
        continue
      }

      const locations = [linkSpace.from, linkSpace.to, linkSpace.via].filter(Boolean) as string[]

      if (!locations.includes(current)) {
        continue
      }

      for (const location of locations) {
        if (!visited.has(location)) {
          queue.push(location)
        }
      }
    }
  }

  return false
}

function isConnectedToMarket(board: BoardState, locationName: string): boolean {
  return marketLocations.some((marketLocation) =>
    areLocationsConnected(board, locationName, marketLocation),
  )
}

export function estimateCoalPurchaseCost(game: GameState, coalCount: number, cityName: string): number {
  let cost = 0
  let board = game.board

  for (let index = 0; index < coalCount; index += 1) {
    const coalSource = getUnflippedIndustryResourceSources(board, 'coal').find(
      (source) =>
        source.resourceIds.length > 0 &&
        areLocationsConnected(board, cityName, source.cityName),
    )

    if (coalSource) {
      board = removeIndustryResourceCube(board, coalSource.spaceId, coalSource.resourceIds[0])
      continue
    }

    if (!isConnectedToMarket(board, cityName)) {
      return Number.POSITIVE_INFINITY
    }

    const marketSpace = getCheapestMarketResourcePlacement(board, 'coal')

    if (marketSpace) {
      cost += getMarketResourceCost('coal', marketSpace.space.marketIndex)
      board = removeMarketResourceCube(board, marketSpace.resource.spaceId)
      continue
    }

    cost += MARKET_GENERAL_SUPPLY_COST.coal
  }

  return cost
}

export function estimateBuildMoneyCost(game: GameState, tileId: string, cityName: string): number {
  const rule = getPlayerBoardIndustryTileRule(tileId)

  if (!rule) {
    return Number.POSITIVE_INFINITY
  }

  let cost = rule.buildCost.money
  const resources = rule.buildCost.resources ?? {}

  if (resources.coal) {
    cost += estimateCoalPurchaseCost(game, resources.coal, cityName)
  }

  if (resources.iron) {
    cost += estimateIronPurchaseCost(game, resources.iron)
  }

  return cost
}

export function estimateNetworkMoneyCost(
  game: GameState,
  candidate: Extract<AiCandidateAction, { kind: 'network' }>,
): number {
  let cost = candidate.cost

  for (const link of candidate.linkPlacements) {
    if (link.coalLocationName) {
      const coalCost = estimateCoalPurchaseCost(game, 1, link.coalLocationName)
      cost += Number.isFinite(coalCost) ? coalCost : 8
      continue
    }

    if (link.linkKind === 'rail') {
      cost += 6
    }
  }

  return cost
}

function getSellableIndustry(industry: Industry): SellableIndustry | null {
  return sellableIndustries.includes(industry as SellableIndustry)
    ? (industry as SellableIndustry)
    : null
}

function getMerchantLocation(merchantSpaceId: string): string | undefined {
  return merchantLocationBySpaceId[merchantSpaceId as keyof typeof merchantLocationBySpaceId]
}

function getMerchantBeerSpaceId(merchantSpaceId: string): string {
  return `board-beer-${merchantSpaceId.replace('merchant-tile-', '')}`
}

function consumeBeer(
  game: GameState,
  playerId: string,
  count: number,
  cityName: string,
): boolean {
  let remaining = count

  for (const [spaceId, resources] of Object.entries(game.board.industryResourcePlacements)) {
    if (remaining === 0) {
      break
    }

    const placement = game.board.industryPlacements[spaceId]

    if (!placement || placement.industry !== 'brewery') {
      continue
    }

    const breweryCity = getIndustrySpaceCity(spaceId)
    const isOwn = placement.ownerId === playerId
    const isConnected =
      isOwn || areLocationsConnected(game.board, cityName, breweryCity)

    if (!isConnected) {
      continue
    }

    const beerCount = resources.filter((resource) => resource.kind === 'beer').length
    remaining -= beerCount
  }

  if (remaining <= 0) {
    return true
  }

  for (const merchantBeerSpaceId of Object.keys(game.board.beerResourcePlacements)) {
    if (remaining <= 0) {
      break
    }

    void merchantBeerSpaceId
    remaining -= 1
  }

  return remaining <= 0
}

export function estimatePlannedTileFlipLikelihood(
  game: GameState,
  playerId: string,
  industry: Industry,
  tileId: string,
  cityName: string,
): number {
  if (industry === 'coal' || industry === 'iron') {
    return isConnectedToMarket(game.board, cityName) ? 0.95 : 0.4
  }

  if (industry === 'brewery') {
    const beerOnBoard = Object.values(game.board.industryResourcePlacements).reduce(
      (total, resources) => total + resources.filter((resource) => resource.kind === 'beer').length,
      0,
    )

    return beerOnBoard > 3 ? 0.45 : 0.62
  }

  const sellIndustry = getSellableIndustry(industry)

  if (!sellIndustry) {
    return 0
  }

  const rule = getPlayerBoardIndustryTileRule(tileId)
  const merchants = Object.values(getVisibleMerchantTilePlacements(game.board))

  for (const merchant of merchants) {
    const merchantLocation = getMerchantLocation(merchant.spaceId)

    if (
      !merchantLocation ||
      merchant.kind !== sellIndustry ||
      !areLocationsConnected(game.board, cityName, merchantLocation)
    ) {
      continue
    }

    const beerNeeded = rule?.sellBeer ?? 0

    if (beerNeeded === 0) {
      return 0.82
    }

    const merchantBeerSpaceId = getMerchantBeerSpaceId(merchant.spaceId)

    if (game.board.beerResourcePlacements[merchantBeerSpaceId]) {
      return 0.72
    }

    if (consumeBeer(game, playerId, beerNeeded, cityName)) {
      return 0.65
    }

    return 0.28
  }

  return 0.08
}

export function finiteMoneyCost(cost: number): number {
  return Number.isFinite(cost) ? cost : 120
}

export function scoreNetworkLinkPlacement(spaceId: string): {
  brewery: number
  birmingham: number
  market: number
} {
  const space = linkSpaces.find((linkSpace) => linkSpace.id === spaceId)

  if (!space) {
    return { brewery: 0, birmingham: 0, market: 0 }
  }

  return {
    brewery: [space.from, space.to].some((city) => city.startsWith('Brewery')) ? 1 : 0,
    birmingham: [space.from, space.to].includes('Birmingham') ? 1 : 0,
    market: [space.from, space.to].some((city) =>
      marketLocations.includes(city as (typeof marketLocations)[number]),
    )
      ? 1
      : 0,
  }
}

export function scoreDiscardCard(card: GameCard | undefined): number {
  if (!card) {
    return 0
  }

  if (card.kind === 'wild-location' || card.kind === 'wild-industry') {
    return -400
  }

  if (card.kind === 'industry') {
    const keepsBricOption = card.industries.some(
      (industry) => industry === 'brewery' || industry === 'coal' || industry === 'iron',
    )

    return keepsBricOption ? -250 : -80
  }

  return 40
}

export function getBuildSpacePriority(spaceId: string, industry: Industry): number {
  const space = industrySpaces.find((currentSpace) => currentSpace.id === spaceId)

  return space?.allowedIndustries.length === 1 && space.allowedIndustries[0] === industry ? 0 : 1
}

export function getPlayerMoney(game: GameState, playerId: string): number {
  return game.players.find((player) => player.id === playerId)?.money ?? 0
}

export function getLoanIncomeAfterReduction(income: number): number | null {
  const targetIncomeLevel = getIncomeMoneyDelta(income) - 3

  if (targetIncomeLevel < -10) {
    return null
  }

  for (let trackValue = income - 1; trackValue >= 0; trackValue -= 1) {
    if (getIncomeMoneyDelta(trackValue) === targetIncomeLevel) {
      return trackValue
    }
  }

  return null
}
