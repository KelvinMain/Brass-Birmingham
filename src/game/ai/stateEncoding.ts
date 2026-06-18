import type { Industry } from '../cards'
import {
  beerResourceSpaces,
  getIndustryTileResourceCapacity,
  getVisibleMerchantTilePlacements,
  industrySpaces,
  linkSpaces,
  marketLocations,
  marketResourceSpaces,
  merchantTileSpaces,
  type MerchantTileKind,
} from '../board'
import type { GameCard } from '../deck'
import { HAND_LIMIT } from '../deck'
import type { GameState, LocalPlayer } from '../game'
import {
  getActionsPerTurn,
  getIncomeMoneyDelta,
  getRequiredEndTurnHandSize,
} from '../game'
import {
  getPlayerBoardIndustryTileRule,
  getPlayerBoardTileCount,
  isPlayerBoardIndustryTileUsable,
  playerBoardIndustryTiles,
} from '../playerBoard'

const MAX_PLAYER_SLOTS = 4
const TRACKED_INDUSTRIES: Industry[] = [
  'brewery',
  'coal',
  'iron',
  'cotton',
  'manufacturer',
  'pottery',
]
const MERCHANT_KINDS: MerchantTileKind[] = [
  'cotton',
  'manufacturer',
  'pottery',
  'all',
  'none',
]
const LOCATION_CITY_NAMES = [
  'Belper',
  'Derby',
  'Leek',
  'Stoke-on-Trent',
  'Stone',
  'Uttoxeter',
  'Stafford',
  'Burton-on-Trent',
  'Cannock',
  'Tamworth',
  'Walsall',
  'Coalbrookdale',
  'Dudley',
  'Kidderminster',
  'Wolverhampton',
  'Worcester',
  'Birmingham',
  'Coventry',
  'Nuneaton',
  'Redditch',
] as const

export const STATE_ENCODING_LAYOUT = {
  global: 16,
  perPlayer: 14,
  maxPlayers: MAX_PLAYER_SLOTS,
  industrySpaceFeatures: 14,
  linkSpaceFeatures: 5,
  marketSlotFeatures: 1,
  beerSlotFeatures: 1,
  merchantSlotFeatures: 6,
  playerBoardTileFeatures: 7,
  handSlotFeatures: 13,
  handSlots: HAND_LIMIT,
  marketConnectivity: marketLocations.length,
  boardAggregates: 8,
  developedStackByIndustry: TRACKED_INDUSTRIES.length,
  outdatedStackByIndustry: TRACKED_INDUSTRIES.length,
} as const

export const AI_STATE_FEATURE_COUNT =
  STATE_ENCODING_LAYOUT.global +
  STATE_ENCODING_LAYOUT.perPlayer * STATE_ENCODING_LAYOUT.maxPlayers +
  STATE_ENCODING_LAYOUT.industrySpaceFeatures * industrySpaces.length +
  STATE_ENCODING_LAYOUT.linkSpaceFeatures * linkSpaces.length +
  STATE_ENCODING_LAYOUT.marketSlotFeatures * marketResourceSpaces.length +
  STATE_ENCODING_LAYOUT.beerSlotFeatures * beerResourceSpaces.length +
  STATE_ENCODING_LAYOUT.merchantSlotFeatures * merchantTileSpaces.length +
  STATE_ENCODING_LAYOUT.playerBoardTileFeatures * playerBoardIndustryTiles.length +
  STATE_ENCODING_LAYOUT.handSlotFeatures * STATE_ENCODING_LAYOUT.handSlots +
  STATE_ENCODING_LAYOUT.marketConnectivity +
  STATE_ENCODING_LAYOUT.boardAggregates +
  STATE_ENCODING_LAYOUT.developedStackByIndustry +
  STATE_ENCODING_LAYOUT.outdatedStackByIndustry

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalize(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return clamp01(value / max)
}

function normalizeSigned(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return Math.max(-1, Math.min(1, value / max))
}

function getCityIndex(cityName: string): number {
  const index = LOCATION_CITY_NAMES.indexOf(cityName as (typeof LOCATION_CITY_NAMES)[number])

  return index >= 0 ? index : LOCATION_CITY_NAMES.length
}

function getTileLevel(tileId: string | undefined): number {
  if (!tileId) {
    return 0
  }

  const match = tileId.match(/-(\d+)$/)

  return match ? Number(match[1]) : 0
}

function areLocationsConnected(
  game: GameState,
  fromLocation: string,
  toLocation: string,
): boolean {
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
      const placement = game.board.linkPlacements[linkSpace.id]

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

function isConnectedToMarket(game: GameState, locationName: string): boolean {
  return marketLocations.some((marketLocation) =>
    areLocationsConnected(game, locationName, marketLocation),
  )
}

function getOrderedPlayerSlots(
  game: GameState,
  playerId: string,
): Array<LocalPlayer | undefined> {
  const selfIndex = game.players.findIndex((player) => player.id === playerId)

  if (selfIndex < 0) {
    return Array.from({ length: MAX_PLAYER_SLOTS }, () => undefined)
  }

  return Array.from({ length: MAX_PLAYER_SLOTS }, (_, offset) => {
    const playerIndex = (selfIndex + offset) % game.players.length

    return offset < game.players.length ? game.players[playerIndex] : undefined
  })
}

function getPlacedPlayerBoardTileCount(
  game: GameState,
  playerId: string,
  tileId: string,
): number {
  return (
    Object.values(game.board.industryPlacements).filter(
      (placement) => placement.ownerId === playerId && placement.tileId === tileId,
    ).length +
    game.developedIndustries.filter((tile) => tile.ownerId === playerId && tile.tileId === tileId)
      .length +
    game.outdatedIndustries.filter((tile) => tile.ownerId === playerId && tile.tileId === tileId)
      .length
  )
}

function getRemainingPlayerBoardTileCount(
  game: GameState,
  playerId: string,
  tileId: string,
): number {
  return Math.max(
    0,
    getPlayerBoardTileCount(tileId) - getPlacedPlayerBoardTileCount(game, playerId, tileId),
  )
}

function getRemainingTileCounts(
  game: GameState,
  playerId: string,
): Record<string, number> {
  return Object.fromEntries(
    playerBoardIndustryTiles.map((tile) => [
      tile.id,
      getRemainingPlayerBoardTileCount(game, playerId, tile.id),
    ]),
  )
}

function countPlayerIndustries(game: GameState, playerId: string): number {
  return Object.values(game.board.industryPlacements).filter(
    (placement) => placement.ownerId === playerId,
  ).length
}

function countPlayerFlippedIndustries(game: GameState, playerId: string): number {
  return Object.values(game.board.industryPlacements).filter(
    (placement) => placement.ownerId === playerId && placement.flipped,
  ).length
}

function countPlayerLinks(
  game: GameState,
  playerId: string,
  kind?: 'canal' | 'rail',
): number {
  return Object.values(game.board.linkPlacements).filter(
    (placement) => placement.ownerId === playerId && (kind ? placement.kind === kind : true),
  ).length
}

function countAccessibleBeer(game: GameState, playerId: string): number {
  const playerCities = new Set(
    Object.entries(game.board.industryPlacements)
      .filter(([, placement]) => placement.ownerId === playerId)
      .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
      .filter(Boolean) as string[],
  )

  let total = 0

  for (const [spaceId, resources] of Object.entries(game.board.industryResourcePlacements)) {
    const placement = game.board.industryPlacements[spaceId]

    if (!placement || placement.industry !== 'brewery') {
      continue
    }

    const breweryCity = industrySpaces.find((space) => space.id === spaceId)?.city

    if (!breweryCity) {
      continue
    }

    const isOwn = placement.ownerId === playerId
    const isConnected = isOwn || [...playerCities].some((city) =>
      areLocationsConnected(game, city, breweryCity),
    )

    if (isConnected) {
      total += resources.filter((resource) => resource.kind === 'beer').length
    }
  }

  total += Object.keys(game.board.beerResourcePlacements).length

  return total
}

function countResourcesOnBoard(game: GameState, kind: 'coal' | 'iron' | 'beer'): number {
  if (kind === 'beer') {
    return (
      Object.values(game.board.industryResourcePlacements).reduce(
        (total, resources) =>
          total + resources.filter((resource) => resource.kind === 'beer').length,
        0,
      ) + Object.keys(game.board.beerResourcePlacements).length
    )
  }

  return Object.values(game.board.industryResourcePlacements).reduce(
    (total, resources) => total + resources.filter((resource) => resource.kind === kind).length,
    0,
  )
}

function getLowestFilledMarketIndex(game: GameState, kind: 'coal' | 'iron'): number {
  const filled = marketResourceSpaces
    .filter((space) => space.kind === kind && game.board.marketResourcePlacements[space.id])
    .map((space) => space.marketIndex)

  return filled.length > 0 ? Math.min(...filled) : 0
}

function encodeGlobalState(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const selfIndex = game.players.findIndex((player) => player.id === playerId)
  const turnOrderIndex =
    selfIndex < 0
      ? 0
      : (selfIndex - game.activePlayerIndex + game.players.length) % game.players.length

  features[index++] = game.era === 'canal' ? 1 : 0
  features[index++] = game.era === 'rail' ? 1 : 0
  features[index++] = normalize(game.playerCount, 4)
  features[index++] = normalize(game.roundNumber, 12)
  features[index++] = normalize(game.turnsTakenThisRound, 4)
  features[index++] = normalize(getActionsPerTurn(game), 6)
  features[index++] = game.players[game.activePlayerIndex]?.id === playerId ? 1 : 0
  features[index++] = normalize(turnOrderIndex, 3)
  features[index++] = normalize(game.developedIndustries.length, 20)
  features[index++] = normalize(game.outdatedIndustries.length, 12)
  features[index++] = normalize(game.discardPile.length, 80)
  features[index++] = normalize(game.stacks.standard.length, 120)
  features[index++] = normalize(game.stacks.wildLocation.length, 4)
  features[index++] = normalize(game.stacks.wildIndustry.length, 4)
  features[index++] = normalize(getRequiredEndTurnHandSize(game), 8)
  features[index++] = normalize(game.turnStartHandCount, 8)

  return index
}

function encodePlayerSlots(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const slots = getOrderedPlayerSlots(game, playerId)

  for (let slot = 0; slot < MAX_PLAYER_SLOTS; slot += 1) {
    const player = slots[slot]

    if (!player) {
      index += STATE_ENCODING_LAYOUT.perPlayer
      continue
    }

    features[index++] = normalize(player.money, 60)
    features[index++] = normalize(player.income, 99)
    features[index++] = normalize(player.victoryPoints, 150)
    features[index++] = normalize(player.moneySpentThisRound, 40)
    features[index++] = normalize(player.hand.length, HAND_LIMIT)
    features[index++] = normalize(countPlayerIndustries(game, player.id), 20)
    features[index++] = normalize(
      Object.values(game.board.linkPlacements).filter(
        (placement) => placement.ownerId === player.id,
      ).length,
      25,
    )
    features[index++] = normalize(countPlayerFlippedIndustries(game, player.id), 12)
    features[index++] = normalize(countPlayerLinks(game, player.id, 'canal'), 10)
    features[index++] = normalize(countPlayerLinks(game, player.id, 'rail'), 20)
    features[index++] = slot === 0 ? 1 : 0
    features[index++] = normalizeSigned(getIncomeMoneyDelta(player.income), 30)
    features[index++] = playerCitiesConnectedToMarket(game, player.id) ? 1 : 0
    features[index++] = normalize(countAccessibleBeer(game, player.id), 12)
  }

  return index
}

function playerCitiesConnectedToMarket(game: GameState, playerId: string): boolean {
  const cities = new Set(
    Object.entries(game.board.industryPlacements)
      .filter(([, placement]) => placement.ownerId === playerId)
      .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
      .filter(Boolean) as string[],
  )

  return [...cities].some((city) => isConnectedToMarket(game, city))
}

function encodeIndustrySpaces(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const slots = getOrderedPlayerSlots(game, playerId)
  const slotIds = slots.map((player) => player?.id)

  for (const space of industrySpaces) {
    const placement = game.board.industryPlacements[space.id]
    const resources = game.board.industryResourcePlacements[space.id] ?? []
    const capacity = placement ? getIndustryTileResourceCapacity(placement.industry) : 0
    const resourceRatio =
      capacity > 0
        ? resources.filter((resource) => resource.kind !== 'beer').length / capacity
        : resources.filter((resource) => resource.kind === 'beer').length /
          Math.max(1, getIndustryTileResourceCapacity('brewery'))

    features[index++] = placement ? 1 : 0

    for (let slot = 0; slot < MAX_PLAYER_SLOTS; slot += 1) {
      const ownerId = slotIds[slot]
      features[index++] = placement && ownerId && placement.ownerId === ownerId ? 1 : 0
    }

    features[index++] = placement?.flipped ? 1 : 0

    for (const industry of TRACKED_INDUSTRIES) {
      features[index++] = placement?.industry === industry ? 1 : 0
    }

    features[index++] = normalize(resourceRatio, 1)
    features[index++] = normalize(getTileLevel(placement?.tileId), 8)
    features[index++] = normalize(space.allowedIndustries.length, 6)
  }

  return index
}

function encodeLinkSpaces(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex

  for (const space of linkSpaces) {
    const placement = game.board.linkPlacements[space.id]

    features[index++] = placement ? 1 : 0
    features[index++] = placement?.ownerId === playerId ? 1 : 0
    features[index++] =
      placement && placement.ownerId !== playerId && game.players.some((player) => player.id === placement.ownerId)
        ? 1
        : 0
    features[index++] = placement?.kind === 'canal' ? 1 : 0
    features[index++] = placement?.kind === 'rail' ? 1 : 0
  }

  return index
}

function encodeMarketSlots(features: Float32Array, game: GameState, startIndex: number): number {
  let index = startIndex

  for (const space of marketResourceSpaces) {
    features[index++] = game.board.marketResourcePlacements[space.id] ? 1 : 0
  }

  return index
}

function encodeBeerSlots(features: Float32Array, game: GameState, startIndex: number): number {
  let index = startIndex

  for (const space of beerResourceSpaces) {
    features[index++] = game.board.beerResourcePlacements[space.id] ? 1 : 0
  }

  return index
}

function encodeMerchantSlots(features: Float32Array, game: GameState, startIndex: number): number {
  let index = startIndex
  const visibleMerchants = getVisibleMerchantTilePlacements(game.board)

  for (const space of merchantTileSpaces) {
    const merchant = visibleMerchants[space.id]

    features[index++] = merchant ? 1 : 0

    for (const kind of MERCHANT_KINDS) {
      features[index++] = merchant?.kind === kind ? 1 : 0
    }
  }

  return index
}

function encodePlayerBoard(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const remainingCountByTileId = getRemainingTileCounts(game, playerId)
  const player = game.players.find((entry) => entry.id === playerId)

  for (const tile of playerBoardIndustryTiles) {
    const rule = getPlayerBoardIndustryTileRule(tile.id)
    const remaining = remainingCountByTileId[tile.id] ?? 0

    features[index++] = normalize(remaining, tile.count)
    features[index++] = player?.flippedPlayerBoardTileIds.includes(tile.id) ? 1 : 0
    features[index++] = isPlayerBoardIndustryTileUsable(tile.id, remainingCountByTileId) ? 1 : 0
    features[index++] = normalize(rule?.victoryPoints ?? 0, 20)
    features[index++] = normalize(rule?.incomeIncrease ?? 0, 10)
    features[index++] = normalize(rule?.buildCost.money ?? 0, 25)
    features[index++] = normalize(rule?.sellBeer ?? 0, 3)
  }

  return index
}

function encodeHandCard(features: Float32Array, card: GameCard | undefined, startIndex: number): number {
  let index = startIndex

  features[index++] = card ? 1 : 0

  if (!card) {
    return startIndex + STATE_ENCODING_LAYOUT.handSlotFeatures
  }

  features[index++] = card.kind === 'industry' ? 1 : 0
  features[index++] = card.kind === 'location' ? 1 : 0
  features[index++] = card.kind === 'wild-industry' ? 1 : 0
  features[index++] = card.kind === 'wild-location' ? 1 : 0

  if (card.kind === 'industry') {
    for (const industry of TRACKED_INDUSTRIES) {
      features[index++] = card.industries.includes(industry) ? 1 : 0
    }
    features[index++] = normalize(card.industries.length, 3)
  } else {
    index += TRACKED_INDUSTRIES.length
    features[index++] = 0
  }

  if (card.kind === 'location') {
    features[index++] = normalize(getCityIndex(card.name), LOCATION_CITY_NAMES.length)
  } else {
    features[index++] = 0
  }

  return index
}

function encodeHand(features: Float32Array, player: LocalPlayer, startIndex: number): number {
  let index = startIndex
  const paddedHand = Array.from({ length: HAND_LIMIT }, (_, slot) => player.hand[slot])

  for (const card of paddedHand) {
    index = encodeHandCard(features, card, index)
  }

  return index
}

function encodeMarketConnectivity(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const cities = new Set(
    Object.entries(game.board.industryPlacements)
      .filter(([, placement]) => placement.ownerId === playerId)
      .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
      .filter(Boolean) as string[],
  )

  for (const marketLocation of marketLocations) {
    features[index++] = [...cities].some((city) =>
      areLocationsConnected(game, city, marketLocation),
    )
      ? 1
      : 0
  }

  return index
}

function encodeBoardAggregates(
  features: Float32Array,
  game: GameState,
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex
  const openIndustries = industrySpaces.filter(
    (space) => !game.board.industryPlacements[space.id],
  ).length
  const openLinks = linkSpaces.filter((space) => !game.board.linkPlacements[space.id]).length
  const cities = new Set(
    Object.entries(game.board.industryPlacements)
      .filter(([, placement]) => placement.ownerId === playerId)
      .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
      .filter(Boolean) as string[],
  )
  const marketReachCount = marketLocations.filter((marketLocation) =>
    [...cities].some((city) => areLocationsConnected(game, city, marketLocation)),
  ).length

  features[index++] = normalize(countResourcesOnBoard(game, 'coal'), 30)
  features[index++] = normalize(countResourcesOnBoard(game, 'iron'), 20)
  features[index++] = normalize(countResourcesOnBoard(game, 'beer'), 15)
  features[index++] = normalize(openIndustries, industrySpaces.length)
  features[index++] = normalize(openLinks, linkSpaces.length)
  features[index++] = normalize(getLowestFilledMarketIndex(game, 'coal'), 14)
  features[index++] = normalize(getLowestFilledMarketIndex(game, 'iron'), 10)
  features[index++] = normalize(marketReachCount, marketLocations.length)

  return index
}

function encodeIndustryStacks(
  features: Float32Array,
  stacks: GameState['developedIndustries'] | GameState['outdatedIndustries'],
  playerId: string,
  startIndex: number,
): number {
  let index = startIndex

  for (const industry of TRACKED_INDUSTRIES) {
    const count = stacks.filter(
      (tile) => tile.ownerId === playerId && tile.industry === industry,
    ).length
    features[index++] = normalize(count, 6)
  }

  return index
}

export function encodeAiState(game: GameState, playerId: string): Float32Array {
  const features = new Float32Array(AI_STATE_FEATURE_COUNT)
  const player = game.players.find((entry) => entry.id === playerId)

  if (!player) {
    return features
  }

  let index = 0
  index = encodeGlobalState(features, game, playerId, index)
  index = encodePlayerSlots(features, game, playerId, index)
  index = encodeIndustrySpaces(features, game, playerId, index)
  index = encodeLinkSpaces(features, game, playerId, index)
  index = encodeMarketSlots(features, game, index)
  index = encodeBeerSlots(features, game, index)
  index = encodeMerchantSlots(features, game, index)
  index = encodePlayerBoard(features, game, playerId, index)
  index = encodeHand(features, player, index)
  index = encodeMarketConnectivity(features, game, playerId, index)
  index = encodeBoardAggregates(features, game, playerId, index)
  index = encodeIndustryStacks(features, game.developedIndustries, playerId, index)
  encodeIndustryStacks(features, game.outdatedIndustries, playerId, index)

  return features
}
