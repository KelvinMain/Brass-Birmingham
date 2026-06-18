import { applyGameAction } from './actions'
import type { Industry } from './cards'
import {
  flipIndustryTile,
  getVisibleMerchantTilePlacements,
  industrySpaces,
  linkSpaces,
  marketLocations,
  marketResourceSpaces,
  moveResourceCubeToMarket,
  placeIndustryTile,
  removeBeerResourceCube,
  removeIndustryResourceCube,
  removeMarketResourceCube,
} from './board'
import type {
  BoardState,
  IndustryTilePlacement,
  LinkTilePlacement,
  MarketResourceSpace,
  ResourceCubeKind,
} from './board'
import type { GameCard } from './deck'
import {
  developIndustryTile,
  discardCardFromPlayerHand,
  getActionsPerTurn,
  getIncomeMoneyDelta,
  getRequiredEndTurnHandSize,
  updatePlayerMoney,
  updatePlayerRoundSpending,
  updatePlayerScore,
} from './game'
import type { GameState } from './game'
import { clientDebugLog } from '../debug/clientLog'
import { summarizeGameState } from '../debug/gameContext'
import {
  getPlayerBoardIndustryTileRule,
  getPlayerBoardTileCount,
  isPlayerBoardIndustryTileUsable,
  isPlayerBoardTileDevelopable,
  playerBoardIndustryTiles,
} from './playerBoard'

export type AiActionKind =
  | 'build-industry'
  | 'build-link'
  | 'network'
  | 'develop'
  | 'loan'
  | 'scout'
  | 'sell'
  | 'discard'
  | 'consume-resource'

type AiDevelopTile = {
  playerBoardTileId: string
  industry: Industry
  level: number
}

type AiNetworkLinkPlacement = {
  coalLocationName?: string
  linkKind: LinkTilePlacement['kind']
  routeLabel: string
  spaceId: string
}

type AiSellableIndustry = Extract<Industry, 'cotton' | 'manufacturer' | 'pottery'>

type AiMerchantBeerBonus = 'develop' | 'income' | 'money' | 'victory-points-3' | 'victory-points-4'

type AiSellTile = {
  beerCount: number
  incomeIncrease: number
  industry: AiSellableIndustry
  merchantBeerBonus?: AiMerchantBeerBonus
  merchantBeerSpaceId?: string
  merchantLabel: string
  merchantSpaceId: string
  spaceId: string
  tileId: string
}

export type AiCandidateAction =
  | {
      kind: 'build-industry'
      cardId: string
      spaceId: string
      playerBoardTileId: string
      industry: Industry
      cityName: string
      description: string
    }
  | {
      kind: 'build-link'
      cardId: string
      spaceId: string
      linkKind: LinkTilePlacement['kind']
      routeLabel: string
      description: string
    }
  | {
      kind: 'network'
      cardId: string
      cost: number
      linkPlacements: AiNetworkLinkPlacement[]
      beerLocationName?: string
      description: string
    }
  | {
      kind: 'develop'
      cardId: string
      tiles: AiDevelopTile[]
      description: string
    }
  | {
      kind: 'loan'
      cardId: string
      incomeBefore: number
      incomeAfter: number
      description: string
    }
  | {
      kind: 'scout'
      cardIds: string[]
      description: string
    }
  | {
      kind: 'sell'
      cardId: string
      sales: AiSellTile[]
      description: string
    }
  | {
      kind: 'discard'
      cardId: string
      description: string
    }
  | {
      kind: 'consume-resource'
      resourceKind: ResourceCubeKind
      count: number
      locationName?: string
      merchantSpaceId?: string
      description: string
    }

type AiActionExecution = {
  game: GameState
  description: string
}

export type AiLogEntry = {
  id: string
  playerName: string
  roundNumber: number
  actionNumber: number
  description: string
}

export type AiTurnResult = {
  game: GameState
  logEntries: AiLogEntry[]
}

export type AiAgent = {
  chooseAction: (candidates: AiCandidateAction[]) => AiCandidateAction | undefined
}

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

const merchantBeerBonusBySpaceId = {
  'merchant-tile-1': 'money',
  'merchant-tile-2': 'money',
  'merchant-tile-3': 'victory-points-3',
  'merchant-tile-4': 'victory-points-3',
  'merchant-tile-5': 'victory-points-4',
  'merchant-tile-6': 'income',
  'merchant-tile-7': 'income',
  'merchant-tile-8': 'develop',
  'merchant-tile-9': 'develop',
} satisfies Record<keyof typeof merchantLocationBySpaceId, AiMerchantBeerBonus>

const boardCities = [...new Set(industrySpaces.map((space) => space.city))].filter(
  (city) => !city.startsWith('Brewery'),
)
const marketResourcePurchaseCostByKind = {
  coal: (marketIndex: number) => Math.max(1, Math.ceil(marketIndex / 2)),
  iron: (marketIndex: number) => Math.max(1, Math.ceil((marketIndex - 2) / 2)),
} as const
const buildResourceCountByTileId: Partial<Record<string, number>> = {
  'iron-1': 4,
  'iron-2': 4,
  'iron-3': 5,
  'iron-4': 6,
  'coal-1': 2,
  'coal-2': 3,
  'coal-3': 4,
  'coal-4': 5,
}
const canalOnlyTileIds = new Set(['coal-1', 'brewery-1', 'iron-1', 'cotton-1', 'manufacturer-1'])
const railOnlyTileIds = new Set(['brewery-4', 'pottery-5'])

export function createRandomAiAgent(random = Math.random): AiAgent {
  return {
    chooseAction: (candidates) => {
      if (candidates.length === 0) {
        return undefined
      }

      const chosenIndex = Math.floor(random() * candidates.length)

      return candidates[Math.min(chosenIndex, candidates.length - 1)]
    },
  }
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatIndustry(industry: Industry): string {
  return industry
    .split('-')
    .map(capitalize)
    .join(' ')
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

function formatCardLabel(card: GameCard): string {
  if (card.kind === 'location') {
    return card.name
  }

  if (card.kind === 'industry') {
    return card.industries.join(' / ')
  }

  return card.kind === 'wild-location' ? 'Wild location' : 'Wild industry'
}

function getPlacedPlayerBoardTileCount(game: GameState, playerId: string, tileId: string): number {
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

function getUsableBuildTiles(game: GameState, playerId: string, industry: Industry) {
  const remainingCountByTileId = getRemainingTileCounts(game, playerId)

  return playerBoardIndustryTiles.filter(
    (tile) =>
      tile.industry === industry &&
      getRemainingPlayerBoardTileCount(game, playerId, tile.id) > 0 &&
      isPlayerBoardIndustryTileUsable(tile.id, remainingCountByTileId) &&
      isTileBuildableInEra(tile.id, game.era),
  )
}

function isTileBuildableInEra(tileId: string, era: GameState['era']): boolean {
  if (era === 'canal') {
    return !railOnlyTileIds.has(tileId)
  }

  return !canalOnlyTileIds.has(tileId)
}

function getBuildResourceCount(tileId: string, industry: Industry, era: GameState['era']): number {
  if (industry === 'brewery') {
    return era === 'rail' ? 2 : 1
  }

  return buildResourceCountByTileId[tileId] ?? 0
}

function getNetworkCities(game: GameState, playerId: string): string[] {
  return boardCities.filter((cityName) => isLocationInPlayerNetwork(game, playerId, cityName))
}

function hasPlayerIndustryInCity(game: GameState, playerId: string, cityName: string): boolean {
  return Object.entries(game.board.industryPlacements).some(
    ([spaceId, placement]) =>
      placement.ownerId === playerId && getIndustrySpaceCity(spaceId) === cityName,
  )
}

function getBuildSpacePriority(spaceId: string, industry: Industry): number {
  const space = industrySpaces.find((currentSpace) => currentSpace.id === spaceId)

  return space?.allowedIndustries.length === 1 && space.allowedIndustries[0] === industry ? 0 : 1
}

function getCandidateBuildSpaceIds(
  game: GameState,
  playerId: string,
  cityName: string,
  industry: Industry,
): string[] {
  const emptySpaces = industrySpaces.filter(
    (space) =>
      space.city === cityName &&
      space.allowedIndustries.includes(industry) &&
      !game.board.industryPlacements[space.id],
  )

  const prioritizedEmptySpaces = emptySpaces
    .filter((space) => getBuildSpacePriority(space.id, industry) === 0)
    .concat(emptySpaces.filter((space) => getBuildSpacePriority(space.id, industry) === 1))

  if (prioritizedEmptySpaces.length > 0) {
    return prioritizedEmptySpaces.map((space) => space.id)
  }

  return industrySpaces
    .filter((space) => {
      const placement = game.board.industryPlacements[space.id]

      return (
        space.city === cityName &&
        space.allowedIndustries.includes(industry) &&
        Boolean(placement) &&
        canOverbuildIndustry(game, playerId, space.id, industry)
      )
    })
    .map((space) => space.id)
}

function canOverbuildIndustry(
  game: GameState,
  playerId: string,
  spaceId: string,
  industry: Industry,
): boolean {
  const existingPlacement = game.board.industryPlacements[spaceId]

  if (!existingPlacement || existingPlacement.industry !== industry) {
    return false
  }

  if (existingPlacement.ownerId === playerId) {
    return true
  }

  if (industry !== 'coal' && industry !== 'iron') {
    return false
  }

  const resourceKind = industry
  const matchingIndustryResources = Object.entries(game.board.industryPlacements).some(
    ([currentSpaceId, placement]) =>
      placement.industry === industry &&
      (game.board.industryResourcePlacements[currentSpaceId] ?? []).some(
        (resource) => resource.kind === resourceKind,
      ),
  )
  const matchingMarketResources = Object.values(game.board.marketResourcePlacements).some(
    (resource) => resource.kind === resourceKind,
  )

  return !matchingIndustryResources && !matchingMarketResources
}

function getLowestDevelopableTile(
  game: GameState,
  playerId: string,
  industry: Industry,
  alreadySelectedTileIds: string[] = [],
): AiDevelopTile | null {
  const selectedCounts = alreadySelectedTileIds.reduce<Record<string, number>>((counts, tileId) => {
    counts[tileId] = (counts[tileId] ?? 0) + 1
    return counts
  }, {})
  const tile = playerBoardIndustryTiles.find((currentTile) => {
    const remainingCount =
      getRemainingPlayerBoardTileCount(game, playerId, currentTile.id) -
      (selectedCounts[currentTile.id] ?? 0)

    return (
      currentTile.industry === industry &&
      isPlayerBoardTileDevelopable(currentTile.id) &&
      remainingCount > 0
    )
  })

  return tile
    ? {
        playerBoardTileId: tile.id,
        industry: tile.industry,
        level: tile.level,
      }
    : null
}

function getDevelopSequences(game: GameState, playerId: string, industries: Industry[]): AiDevelopTile[][] {
  const sequences: AiDevelopTile[][] = []

  for (const firstIndustry of industries) {
    const firstTile = getLowestDevelopableTile(game, playerId, firstIndustry)

    if (!firstTile) {
      continue
    }

    sequences.push([firstTile])

    for (const secondIndustry of industries) {
      const secondTile = getLowestDevelopableTile(game, playerId, secondIndustry, [
        firstTile.playerBoardTileId,
      ])

      if (secondTile) {
        sequences.push([firstTile, secondTile])
      }
    }
  }

  return sequences
}

function canBuildIndustry(
  game: GameState,
  spaceId: string,
  tile: IndustryTilePlacement,
): boolean {
  return placeIndustryTile(game.board, spaceId, tile) !== game.board
}

function getLocationNamesForCard(card: GameCard): string[] {
  if (card.kind === 'location') {
    return [card.name]
  }

  if (card.kind === 'wild-location') {
    return boardCities
  }

  return []
}

function getIndustriesForCard(card: GameCard): Industry[] {
  if (card.kind === 'industry') {
    return card.industries
  }

  if (card.kind === 'wild-industry') {
    return [...new Set(playerBoardIndustryTiles.map((tile) => tile.industry))]
  }

  return []
}

function getVisibleMerchants(game: GameState) {
  return Object.values(getVisibleMerchantTilePlacements(game.board))
}

function merchantAcceptsIndustry(
  merchantKind: string,
  industry: SellableIndustry,
): boolean {
  return merchantKind === 'all' || merchantKind === industry
}

function getMerchantLocation(merchantSpaceId: string): string | undefined {
  return merchantLocationBySpaceId[merchantSpaceId as keyof typeof merchantLocationBySpaceId]
}

function getMerchantBeerSpaceId(merchantSpaceId: string): string {
  return `board-beer-${merchantSpaceId.replace('merchant-tile-', '')}`
}

function getSellableIndustry(industry: Industry): SellableIndustry | null {
  return sellableIndustries.includes(industry as SellableIndustry)
    ? (industry as SellableIndustry)
    : null
}

function formatSellDescription(sales: AiSellTile[]): string {
  const saleParts = sales.map((sale) => {
    const cityName = getIndustrySpaceCity(sale.spaceId)
    const tile = playerBoardIndustryTiles.find((boardTile) => boardTile.id === sale.tileId)
    const level = tile ? ` (level ${tile.level})` : ''

    return `${formatIndustry(sale.industry)}${level} in ${cityName} to ${sale.merchantLabel}`
  })

  return `Sold ${saleParts.join(' and ')}`
}

function applyMerchantBeerBonus(game: GameState, playerId: string, bonus: AiMerchantBeerBonus): GameState {
  if (bonus === 'money') {
    return updatePlayerMoney(game, playerId, 5)
  }

  if (bonus === 'income') {
    return updatePlayerScore(game, playerId, 'income', 2)
  }

  if (bonus === 'victory-points-3') {
    return updatePlayerScore(game, playerId, 'victoryPoints', 3)
  }

  if (bonus === 'victory-points-4') {
    return updatePlayerScore(game, playerId, 'victoryPoints', 4)
  }

  const developTile = playerBoardIndustryTiles
    .map((tile) => getLowestDevelopableTile(game, playerId, tile.industry))
    .find((tile): tile is AiDevelopTile => Boolean(tile))

  return developTile
    ? developIndustryTile(game, {
        id: `${playerId}-${developTile.playerBoardTileId}-merchant-bonus-${game.developedIndustries.length + 1}`,
        industry: developTile.industry,
        ownerId: playerId,
        tileId: developTile.playerBoardTileId,
      })
    : game
}

function applySellSale(game: GameState, playerId: string, sale: AiSellTile): GameState | null {
  const placement = game.board.industryPlacements[sale.spaceId]

  if (
    !placement ||
    placement.ownerId !== playerId ||
    placement.flipped ||
    placement.tileId !== sale.tileId ||
    placement.industry !== sale.industry
  ) {
    return null
  }

  let currentGame = game
  let remainingBeer = sale.beerCount

  if (sale.merchantBeerSpaceId) {
    if (!currentGame.board.beerResourcePlacements[sale.merchantBeerSpaceId]) {
      return null
    }

    currentGame = {
      ...currentGame,
      board: removeBeerResourceCube(currentGame.board, sale.merchantBeerSpaceId),
    }
    remainingBeer -= 1

    if (sale.merchantBeerBonus) {
      currentGame = applyMerchantBeerBonus(currentGame, playerId, sale.merchantBeerBonus)
    }
  }

  if (remainingBeer > 0) {
    const cityName = getIndustrySpaceCity(sale.spaceId)
    const beerResult = consumeBeer(currentGame, playerId, remainingBeer, cityName)

    if (!beerResult) {
      return null
    }

    currentGame = beerResult.game
  }

  const flippedBoard = flipIndustryTile(currentGame.board, sale.spaceId)

  if (flippedBoard === currentGame.board) {
    return null
  }

  currentGame = {
    ...currentGame,
    board: flippedBoard,
  }

  return updatePlayerScore(currentGame, playerId, 'income', sale.incomeIncrease)
}

function getLegalSingleSellOptions(game: GameState, playerId: string): AiSellTile[] {
  const merchants = getVisibleMerchants(game)
  const options: AiSellTile[] = []

  for (const [spaceId, placement] of Object.entries(game.board.industryPlacements)) {
    const industry = getSellableIndustry(placement.industry)

    if (!industry || placement.ownerId !== playerId || placement.flipped || !placement.tileId) {
      continue
    }

    const rule = getPlayerBoardIndustryTileRule(placement.tileId)

    if (!rule) {
      continue
    }

    const cityName = getIndustrySpaceCity(spaceId)

    for (const merchant of merchants) {
      const merchantLocation = getMerchantLocation(merchant.spaceId)

      if (
        !merchantLocation ||
        !merchantAcceptsIndustry(merchant.kind, industry) ||
        !areLocationsConnected(game.board, cityName, merchantLocation)
      ) {
        continue
      }

      const beerCount = rule.sellBeer ?? 0
      const baseSale = {
        beerCount,
        incomeIncrease: rule.incomeIncrease,
        industry,
        merchantLabel: merchant.label,
        merchantSpaceId: merchant.spaceId,
        spaceId,
        tileId: placement.tileId,
      }

      if (beerCount === 0) {
        options.push(baseSale)
        continue
      }

      const merchantBeerSpaceId = getMerchantBeerSpaceId(merchant.spaceId)

      if (game.board.beerResourcePlacements[merchantBeerSpaceId]) {
        options.push({
          ...baseSale,
          merchantBeerBonus:
            merchantBeerBonusBySpaceId[merchant.spaceId as keyof typeof merchantBeerBonusBySpaceId],
          merchantBeerSpaceId,
        })
      }

      if (consumeBeer(game, playerId, beerCount, cityName)) {
        options.push(baseSale)
      }
    }
  }

  return options
}

function getSellSequences(game: GameState, playerId: string): AiSellTile[][] {
  const sequences: AiSellTile[][] = []

  for (const sale of getLegalSingleSellOptions(game, playerId)) {
    const afterSale = applySellSale(game, playerId, sale)

    if (!afterSale) {
      continue
    }

    sequences.push([sale])

    for (const rest of getSellSequences(afterSale, playerId)) {
      sequences.push([sale, ...rest])
    }
  }

  return sequences
}

function getIndustrySpaceCity(spaceId: string): string {
  return industrySpaces.find((space) => space.id === spaceId)?.city ?? spaceId
}

function getPlayerMoney(game: GameState, playerId: string): number {
  return game.players.find((player) => player.id === playerId)?.money ?? 0
}

function getPlacedLinkSpaces(board: BoardState) {
  return Object.keys(board.linkPlacements)
    .map((spaceId) => linkSpaces.find((space) => space.id === spaceId))
    .filter((space): space is (typeof linkSpaces)[number] => Boolean(space))
}

function areLocationsConnected(board: BoardState, fromLocation: string, toLocation: string): boolean {
  if (fromLocation === toLocation) {
    return true
  }

  const visited = new Set<string>()
  const queue = [fromLocation]
  const placedLinks = getPlacedLinkSpaces(board)

  while (queue.length > 0) {
    const location = queue.shift()

    if (!location || visited.has(location)) {
      continue
    }

    visited.add(location)

    for (const link of placedLinks) {
      const nextLocation =
        link.from === location ? link.to : link.to === location ? link.from : undefined

      if (!nextLocation || visited.has(nextLocation)) {
        continue
      }

      if (nextLocation === toLocation) {
        return true
      }

      queue.push(nextLocation)
    }
  }

  return false
}

function isConnectedToMarket(board: BoardState, locationName: string): boolean {
  return marketLocations.some((marketLocation) =>
    areLocationsConnected(board, locationName, marketLocation),
  )
}

function playerHasNetwork(game: GameState, playerId: string): boolean {
  return (
    Object.values(game.board.industryPlacements).some((placement) => placement.ownerId === playerId) ||
    Object.values(game.board.linkPlacements).some((placement) => placement.ownerId === playerId)
  )
}

function isLocationInPlayerNetwork(game: GameState, playerId: string, locationName: string): boolean {
  const hasIndustryAtLocation = Object.entries(game.board.industryPlacements).some(
    ([spaceId, placement]) =>
      placement.ownerId === playerId && getIndustrySpaceCity(spaceId) === locationName,
  )

  if (hasIndustryAtLocation) {
    return true
  }

  return Object.entries(game.board.linkPlacements).some(([spaceId, placement]) => {
    if (placement.ownerId !== playerId) {
      return false
    }

    const link = linkSpaces.find((space) => space.id === spaceId)

    return Boolean(link && (link.from === locationName || link.to === locationName))
  })
}

function isNetworkLinkLegal(game: GameState, playerId: string, linkSpaceId: string): boolean {
  if (!playerHasNetwork(game, playerId)) {
    return true
  }

  const link = linkSpaces.find((space) => space.id === linkSpaceId)

  return Boolean(
    link &&
      (isLocationInPlayerNetwork(game, playerId, link.from) ||
        isLocationInPlayerNetwork(game, playerId, link.to)),
  )
}

function placeNetworkLink(
  game: GameState,
  playerId: string,
  link: AiNetworkLinkPlacement,
): GameState | null {
  const withLink = applyGameAction(game, {
    type: 'place-link-tile',
    playerId,
    spaceId: link.spaceId,
    tile: {
      id: `${playerId}-${link.spaceId}-${link.linkKind}`,
      kind: link.linkKind,
      ownerId: playerId,
    },
  })

  return withLink === game ? null : withLink
}

function cardCombinations<T>(cards: T[], size: number): T[][] {
  if (size === 0) {
    return [[]]
  }

  if (cards.length < size) {
    return []
  }

  return cards.flatMap((card, index) =>
    cardCombinations(cards.slice(index + 1), size - 1).map((rest) => [card, ...rest]),
  )
}

function getUnflippedIndustryResourceSources(
  board: BoardState,
  resourceKind: ResourceCubeKind,
): {
  cityName: string
  ownerId: string
  resourceIds: string[]
  spaceId: string
}[] {
  const sourceIndustry = resourceKind === 'beer' ? 'brewery' : resourceKind

  return Object.entries(board.industryPlacements)
    .filter(([, placement]) => placement.industry === sourceIndustry && !placement.flipped)
    .map(([spaceId, placement]) => ({
      cityName: getIndustrySpaceCity(spaceId),
      ownerId: placement.ownerId,
      resourceIds: (board.industryResourcePlacements[spaceId] ?? [])
        .filter((resource) => resource.kind === resourceKind)
        .map((resource) => resource.id),
      spaceId,
    }))
    .filter((source) => source.resourceIds.length > 0)
}

function removeIndustryResource(
  game: GameState,
  spaceId: string,
  resourceId: string,
): GameState {
  return {
    ...game,
    board: removeIndustryResourceCube(game.board, spaceId, resourceId),
  }
}

function flipIndustryIfEmpty(game: GameState, spaceId: string): GameState {
  const placement = game.board.industryPlacements[spaceId]
  const resources = game.board.industryResourcePlacements[spaceId] ?? []
  const rule = placement?.tileId ? getPlayerBoardIndustryTileRule(placement.tileId) : undefined

  if (!placement || placement.flipped || resources.length > 0 || !rule) {
    return game
  }

  const flippedBoard = flipIndustryTile(game.board, spaceId)

  if (flippedBoard === game.board) {
    return game
  }

  return updatePlayerScore(
    {
      ...game,
      board: flippedBoard,
    },
    placement.ownerId,
    'income',
    rule.incomeIncrease,
  )
}

function buyFromMarket(
  game: GameState,
  playerId: string,
  resourceKind: Extract<ResourceCubeKind, 'coal' | 'iron'>,
): {
  game: GameState
  bought: number
} | null {
  const marketSpace = Object.values(game.board.marketResourcePlacements)
    .filter((resource) => resource.kind === resourceKind)
    .map((resource) => ({
      resource,
      space: marketResourceSpaces.find((space) => space.id === resource.spaceId),
    }))
    .filter((entry): entry is { resource: { id: string; kind: ResourceCubeKind; spaceId: string }; space: MarketResourceSpace } =>
      Boolean(entry.space),
    )
    .sort((left, right) => left.space.marketIndex - right.space.marketIndex)[0]

  if (!marketSpace) {
    const generalSupplyCost = resourceKind === 'coal' ? 8 : 6

    if (getPlayerMoney(game, playerId) < generalSupplyCost) {
      return null
    }

    return {
      game: updatePlayerRoundSpending(game, playerId, generalSupplyCost),
      bought: 1,
    }
  }

  const cost = marketResourcePurchaseCostByKind[resourceKind](marketSpace.space.marketIndex)

  if (getPlayerMoney(game, playerId) < cost) {
    return null
  }

  return {
    game: {
      ...updatePlayerRoundSpending(game, playerId, cost),
      board: removeMarketResourceCube(game.board, marketSpace.resource.spaceId),
    },
    bought: 1,
  }
}

function consumeIndustryResource(
  game: GameState,
  source: ReturnType<typeof getUnflippedIndustryResourceSources>[number],
): GameState {
  return flipIndustryIfEmpty(
    removeIndustryResource(game, source.spaceId, source.resourceIds[0]),
    source.spaceId,
  )
}

function summarizeResourceSources(
  resourceKind: ResourceCubeKind,
  consumedFromIndustry: Map<string, { cityName: string; count: number }>,
  boughtFromMarket: number,
): string {
  const industryParts = [...consumedFromIndustry.values()].map(
    (source) =>
      `consumed ${source.count} ${resourceKind} from ${resourceKind === 'beer' ? 'brewery' : `${resourceKind} mine`} in ${source.cityName}`,
  )
  const marketPart =
    boughtFromMarket > 0
      ? `bought ${boughtFromMarket}${industryParts.length === 0 ? ` ${resourceKind}` : ''} from the market`
      : null

  return [...industryParts, ...(marketPart ? [marketPart] : [])].join(' and ')
}

function consumeIron(
  game: GameState,
  playerId: string,
  count: number,
): {
  game: GameState
  summary: string
} | null {
  let currentGame = game
  const consumedFromIndustry = new Map<string, { cityName: string; count: number }>()
  let boughtFromMarket = 0

  for (let consumed = 0; consumed < count; consumed += 1) {
    const ironSource = getUnflippedIndustryResourceSources(currentGame.board, 'iron')[0]

    if (ironSource) {
      currentGame = consumeIndustryResource(currentGame, ironSource)
      const currentSummary = consumedFromIndustry.get(ironSource.spaceId)
      consumedFromIndustry.set(ironSource.spaceId, {
        cityName: ironSource.cityName,
        count: (currentSummary?.count ?? 0) + 1,
      })
      continue
    }

    const purchase = buyFromMarket(currentGame, playerId, 'iron')

    if (!purchase) {
      return null
    }

    currentGame = purchase.game
    boughtFromMarket += purchase.bought
  }

  return {
    game: currentGame,
    summary: summarizeResourceSources('iron', consumedFromIndustry, boughtFromMarket),
  }
}

function consumeCoal(
  game: GameState,
  playerId: string,
  count: number,
  locationName?: string,
): {
  game: GameState
  summary: string
} | null {
  let currentGame = game
  const consumedFromIndustry = new Map<string, { cityName: string; count: number }>()
  let boughtFromMarket = 0

  for (let consumed = 0; consumed < count; consumed += 1) {
    const coalSources = getUnflippedIndustryResourceSources(currentGame.board, 'coal').filter(
      (source) =>
        locationName
          ? areLocationsConnected(currentGame.board, locationName, source.cityName)
          : false,
    )
    const coalSource =
      coalSources.find((source) => source.cityName === locationName) ?? coalSources[0]

    if (coalSource) {
      currentGame = consumeIndustryResource(currentGame, coalSource)
      const currentSummary = consumedFromIndustry.get(coalSource.spaceId)
      consumedFromIndustry.set(coalSource.spaceId, {
        cityName: coalSource.cityName,
        count: (currentSummary?.count ?? 0) + 1,
      })
      continue
    }

    if (!locationName || !isConnectedToMarket(currentGame.board, locationName)) {
      return null
    }

    const purchase = buyFromMarket(currentGame, playerId, 'coal')

    if (!purchase) {
      return null
    }

    currentGame = purchase.game
    boughtFromMarket += purchase.bought
  }

  return {
    game: currentGame,
    summary: summarizeResourceSources('coal', consumedFromIndustry, boughtFromMarket),
  }
}

function consumeBeer(
  game: GameState,
  playerId: string,
  count: number,
  locationName?: string,
  merchantSpaceId?: string,
): {
  game: GameState
  summary: string
} | null {
  let currentGame = game
  const consumedFromIndustry = new Map<string, { cityName: string; count: number }>()

  for (let consumed = 0; consumed < count; consumed += 1) {
    const beerSources = getUnflippedIndustryResourceSources(currentGame.board, 'beer')
    const beerSource =
      beerSources.find((source) => source.ownerId === playerId) ??
      beerSources.find(
        (source) =>
          source.ownerId !== playerId &&
          Boolean(locationName) &&
          areLocationsConnected(currentGame.board, locationName!, source.cityName),
      )

    if (beerSource) {
      currentGame = consumeIndustryResource(currentGame, beerSource)
      const currentSummary = consumedFromIndustry.get(beerSource.spaceId)
      consumedFromIndustry.set(beerSource.spaceId, {
        cityName: beerSource.cityName,
        count: (currentSummary?.count ?? 0) + 1,
      })
      continue
    }

    const merchantBeerSpaceId = merchantSpaceId
      ? `board-beer-${merchantSpaceId.replace('merchant-tile-', '')}`
      : undefined
    const boardBeer = merchantBeerSpaceId
      ? currentGame.board.beerResourcePlacements[merchantBeerSpaceId]
      : undefined

    if (!boardBeer) {
      return null
    }

    currentGame = {
      ...currentGame,
      board: {
        ...currentGame.board,
        beerResourcePlacements: Object.fromEntries(
          Object.entries(currentGame.board.beerResourcePlacements).filter(
            ([spaceId]) => spaceId !== boardBeer.spaceId,
          ),
        ),
      },
    }
  }

  return {
    game: currentGame,
    summary: summarizeResourceSources('beer', consumedFromIndustry, 0),
  }
}

function consumeResource(
  game: GameState,
  playerId: string,
  resourceKind: ResourceCubeKind,
  count: number,
  locationName?: string,
  merchantSpaceId?: string,
): {
  game: GameState
  summary: string
} | null {
  if (resourceKind === 'iron') {
    return consumeIron(game, playerId, count)
  }

  if (resourceKind === 'coal') {
    return consumeCoal(game, playerId, count, locationName)
  }

  return consumeBeer(game, playerId, count, locationName, merchantSpaceId)
}

function addBuildIndustryCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
  cities: string[],
): void {
  for (const cityName of cities) {
    if (game.era === 'canal' && hasPlayerIndustryInCity(game, playerId, cityName)) {
      continue
    }

    for (const industry of [...new Set(industrySpaces
      .filter((space) => space.city === cityName)
      .flatMap((space) => space.allowedIndustries))]) {
        const cardIndustries = getIndustriesForCard(card)
        const cardMatchesIndustry =
          card.kind === 'location' ||
          card.kind === 'wild-location' ||
          cardIndustries.includes(industry)

        if (!cardMatchesIndustry) {
          continue
        }

        for (const boardTile of getUsableBuildTiles(game, playerId, industry)) {
          for (const spaceId of getCandidateBuildSpaceIds(game, playerId, cityName, industry)) {
          const placement: IndustryTilePlacement = {
            id: `${playerId}-${boardTile.id}-${spaceId}`,
            industry,
            ownerId: playerId,
            tileId: boardTile.id,
          }

          if (!game.board.industryPlacements[spaceId] && !canBuildIndustry(game, spaceId, placement)) {
            continue
          }

          candidates.push({
            kind: 'build-industry',
            cardId: card.id,
            spaceId,
            playerBoardTileId: boardTile.id,
            industry,
            cityName,
            description: `Built ${industry} in ${cityName} (level ${boardTile.level}) using ${formatCardLabel(card)}`,
          })
        }
      }
    }
  }
}

function getAvailableNetworkLinks(
  game: GameState,
  playerId: string,
  linkKind: LinkTilePlacement['kind'],
): AiNetworkLinkPlacement[] {
  return linkSpaces
    .filter(
      (space) =>
        !game.board.linkPlacements[space.id] &&
        space.allowedKinds.includes(linkKind) &&
        isNetworkLinkLegal(game, playerId, space.id),
    )
    .map((space) => ({
      linkKind,
      routeLabel: `${space.from}-${space.to}`,
      spaceId: space.id,
    }))
}

function getCoalLocationForNetworkLink(
  game: GameState,
  playerId: string,
  link: AiNetworkLinkPlacement,
): string | null {
  const space = linkSpaces.find((currentSpace) => currentSpace.id === link.spaceId)

  if (!space) {
    return null
  }

  return [space.from, space.to].find((locationName) =>
    Boolean(consumeCoal(game, playerId, 1, locationName)),
  ) ?? null
}

function getBeerLocationForNetworkLink(
  game: GameState,
  playerId: string,
  link: AiNetworkLinkPlacement,
): string | null {
  const space = linkSpaces.find((currentSpace) => currentSpace.id === link.spaceId)

  if (!space) {
    return null
  }

  return [space.from, space.to].find((locationName) =>
    Boolean(consumeBeer(game, playerId, 1, locationName)),
  ) ?? null
}

function addCanalNetworkCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  if (getPlayerMoney(game, playerId) < 3) {
    return
  }

  for (const link of getAvailableNetworkLinks(game, playerId, 'canal')) {
    candidates.push({
      kind: 'network',
      cardId: card.id,
      cost: 3,
      linkPlacements: [link],
      description: `Networked ${link.routeLabel} for 3 pounds`,
    })
  }
}

function addRailOneLinkNetworkCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  if (getPlayerMoney(game, playerId) < 5) {
    return
  }

  for (const link of getAvailableNetworkLinks(game, playerId, 'rail')) {
    const afterCost = updatePlayerRoundSpending(game, playerId, 5)
    const withLink = placeNetworkLink(afterCost, playerId, link)

    if (!withLink) {
      continue
    }

    const coalLocationName = getCoalLocationForNetworkLink(withLink, playerId, link)

    if (!coalLocationName) {
      continue
    }

    candidates.push({
      kind: 'network',
      cardId: card.id,
      cost: 5,
      linkPlacements: [{ ...link, coalLocationName }],
      description: `Networked ${link.routeLabel} for 5 pounds`,
    })
  }
}

function addRailTwoLinkNetworkCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  if (getPlayerMoney(game, playerId) < 15) {
    return
  }

  for (const firstLink of getAvailableNetworkLinks(game, playerId, 'rail')) {
    const afterCost = updatePlayerRoundSpending(game, playerId, 15)
    const withFirstLink = placeNetworkLink(afterCost, playerId, firstLink)

    if (!withFirstLink) {
      continue
    }

    const firstCoalLocationName = getCoalLocationForNetworkLink(withFirstLink, playerId, firstLink)

    if (!firstCoalLocationName) {
      continue
    }

    const afterFirstCoal = consumeCoal(withFirstLink, playerId, 1, firstCoalLocationName)

    if (!afterFirstCoal) {
      continue
    }

    for (const secondLink of getAvailableNetworkLinks(afterFirstCoal.game, playerId, 'rail')) {
      if (secondLink.spaceId === firstLink.spaceId) {
        continue
      }

      const withSecondLink = placeNetworkLink(afterFirstCoal.game, playerId, secondLink)

      if (!withSecondLink) {
        continue
      }

      const secondCoalLocationName = getCoalLocationForNetworkLink(withSecondLink, playerId, secondLink)

      if (!secondCoalLocationName) {
        continue
      }

      const afterSecondCoal = consumeCoal(withSecondLink, playerId, 1, secondCoalLocationName)

      if (!afterSecondCoal) {
        continue
      }

      const beerLocationName = getBeerLocationForNetworkLink(afterSecondCoal.game, playerId, secondLink)

      if (!beerLocationName) {
        continue
      }

      candidates.push({
        kind: 'network',
        cardId: card.id,
        cost: 15,
        linkPlacements: [
          { ...firstLink, coalLocationName: firstCoalLocationName },
          { ...secondLink, coalLocationName: secondCoalLocationName },
        ],
        beerLocationName,
        description: `Networked ${firstLink.routeLabel} and ${secondLink.routeLabel} for 15 pounds`,
      })
    }
  }
}

function addNetworkCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  if (game.era === 'canal') {
    addCanalNetworkCandidates(candidates, game, playerId, card)
    return
  }

  addRailOneLinkNetworkCandidates(candidates, game, playerId, card)
  addRailTwoLinkNetworkCandidates(candidates, game, playerId, card)
}

function formatDevelopTile(tile: AiDevelopTile): string {
  return `${formatIndustry(tile.industry)} (level ${tile.level})`
}

function formatDevelopDescription(tiles: AiDevelopTile[], resourceSummary: string): string {
  const tileSummary =
    tiles.length === 1
      ? formatDevelopTile(tiles[0])
      : `${tiles.slice(0, -1).map(formatDevelopTile).join(', ')} and ${formatDevelopTile(tiles.at(-1)!)}`

  return `Developed ${tileSummary}, ${resourceSummary}`
}

function addDevelopCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  const industries = getIndustriesForCard(card)

  for (const tiles of getDevelopSequences(game, playerId, industries)) {
    const ironResult = consumeIron(game, playerId, tiles.length)

    if (!ironResult) {
      continue
    }

    candidates.push({
      kind: 'develop',
      cardId: card.id,
      tiles,
      description: formatDevelopDescription(tiles, ironResult.summary),
    })
  }
}

function addLoanCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)
  const incomeAfter = player ? getLoanIncomeAfterReduction(player.income) : null

  if (!player || incomeAfter === null) {
    return
  }

  candidates.push({
    kind: 'loan',
    cardId: card.id,
    incomeBefore: player.income,
    incomeAfter,
    description: `Took a loan, reduced income level from ${player.income} to ${incomeAfter}`,
  })
}

function addScoutCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
): void {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)

  if (
    !player ||
    player.hand.length < 3 ||
    player.hand.some((card) => card.kind === 'wild-location' || card.kind === 'wild-industry') ||
    game.stacks.wildLocation.length === 0 ||
    game.stacks.wildIndustry.length === 0
  ) {
    return
  }

  for (const cards of cardCombinations(player.hand, 3)) {
    candidates.push({
      kind: 'scout',
      cardIds: cards.map((card) => card.id),
      description: 'Scouted, discarded 3 cards and took wild cards',
    })
  }
}

function addSellCandidates(
  candidates: AiCandidateAction[],
  game: GameState,
  playerId: string,
  card: GameCard,
): void {
  for (const sales of getSellSequences(game, playerId)) {
    candidates.push({
      kind: 'sell',
      cardId: card.id,
      sales,
      description: `${formatSellDescription(sales)} using ${formatCardLabel(card)}`,
    })
  }
}

function dedupeCandidates(candidates: AiCandidateAction[]): AiCandidateAction[] {
  const seen = new Set<string>()

  return candidates.filter((candidate) => {
    const key = JSON.stringify(candidate)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function getAiCandidateActions(game: GameState, playerId: string): AiCandidateAction[] {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)

  if (!player || game.status !== 'playing') {
    return []
  }

  const candidates: AiCandidateAction[] = []

  addScoutCandidates(candidates, game, playerId)

  for (const card of player.hand) {
    const locationNames = getLocationNamesForCard(card)

    addLoanCandidates(candidates, game, playerId, card)
    addNetworkCandidates(candidates, game, playerId, card)
    addSellCandidates(candidates, game, playerId, card)

    if (locationNames.length > 0) {
      addBuildIndustryCandidates(candidates, game, playerId, card, locationNames)
    }

    if (getIndustriesForCard(card).length > 0) {
      const buildCities = playerHasNetwork(game, playerId)
        ? getNetworkCities(game, playerId)
        : boardCities

      addBuildIndustryCandidates(candidates, game, playerId, card, buildCities)
      addDevelopCandidates(candidates, game, playerId, card)
    }
  }

  const meaningful = dedupeCandidates(candidates.filter((candidate) => candidate.kind !== 'discard'))

  if (meaningful.length > 0) {
    return meaningful
  }

  return dedupeCandidates(
    player.hand.map((card) => ({
      kind: 'discard' as const,
      cardId: card.id,
      description: `Discarded ${formatCardLabel(card)}`,
    })),
  )
}

function getDiscardCandidates(game: GameState, playerId: string): AiCandidateAction[] {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)

  return (
    player?.hand.map((card) => ({
      kind: 'discard' as const,
      cardId: card.id,
      description: `Discarded ${formatCardLabel(card)}`,
    })) ?? []
  )
}

function applyScout(game: GameState, playerId: string, cardIds: string[]): GameState {
  const wildLocation = game.stacks.wildLocation[0]
  const wildIndustry = game.stacks.wildIndustry[0]

  if (cardIds.length !== 3 || !wildLocation || !wildIndustry) {
    return game
  }

  const afterDiscard = cardIds.reduce(
    (currentGame, cardId) => discardCardFromPlayerHand(currentGame, playerId, cardId),
    game,
  )

  if (afterDiscard === game) {
    return game
  }

  return {
    ...afterDiscard,
    players: afterDiscard.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            hand: [...player.hand, wildLocation, wildIndustry],
          }
        : player,
    ),
    stacks: {
      ...afterDiscard.stacks,
      wildLocation: afterDiscard.stacks.wildLocation.slice(1),
      wildIndustry: afterDiscard.stacks.wildIndustry.slice(1),
    },
  }
}

function getMarketRevenue(resourceKind: Extract<ResourceCubeKind, 'coal' | 'iron'>, marketIndex: number): number {
  return marketResourcePurchaseCostByKind[resourceKind](marketIndex)
}

function getAvailableMarketSpaces(
  game: GameState,
  resourceKind: Extract<ResourceCubeKind, 'coal' | 'iron'>,
): MarketResourceSpace[] {
  return marketResourceSpaces
    .filter((space) => space.kind === resourceKind && !game.board.marketResourcePlacements[space.id])
    .sort((left, right) => left.marketIndex - right.marketIndex)
}

function autoMoveProducedResourceToMarket(
  game: GameState,
  playerId: string,
  spaceId: string,
  resourceKind: Extract<ResourceCubeKind, 'coal' | 'iron'>,
): GameState {
  let currentGame = game

  while ((currentGame.board.industryResourcePlacements[spaceId] ?? []).length > 0) {
    const marketSpace = getAvailableMarketSpaces(currentGame, resourceKind)[0]
    const resource = currentGame.board.industryResourcePlacements[spaceId]?.[0]

    if (!marketSpace || !resource) {
      break
    }

    const movedBoard = moveResourceCubeToMarket(currentGame.board, marketSpace.id, resource, {
      industrySpaceId: spaceId,
    })

    if (movedBoard === currentGame.board) {
      break
    }

    currentGame = updatePlayerMoney(
      {
        ...currentGame,
        board: movedBoard,
      },
      playerId,
      getMarketRevenue(resourceKind, marketSpace.marketIndex),
    )
  }

  return flipIndustryIfEmpty(currentGame, spaceId)
}

function placeProducedResources(
  game: GameState,
  playerId: string,
  spaceId: string,
  industry: Industry,
  tileId: string,
): GameState {
  const resourceKind =
    industry === 'coal' || industry === 'iron' || industry === 'brewery'
      ? industry === 'brewery'
        ? 'beer'
        : industry
      : null
  const count = resourceKind ? getBuildResourceCount(tileId, industry, game.era) : 0
  let currentGame = game

  if (!resourceKind || count === 0) {
    return currentGame
  }

  for (let index = 0; index < count; index += 1) {
    currentGame = {
      ...currentGame,
      board: {
        ...currentGame.board,
        industryResourcePlacements: {
          ...currentGame.board.industryResourcePlacements,
          [spaceId]: [
            ...(currentGame.board.industryResourcePlacements[spaceId] ?? []),
            {
              id: `${playerId}-${spaceId}-${resourceKind}-${index + 1}`,
              kind: resourceKind,
              spaceId,
            },
          ],
        },
      },
    }
  }

  if (resourceKind === 'iron') {
    return autoMoveProducedResourceToMarket(currentGame, playerId, spaceId, 'iron')
  }

  if (resourceKind === 'coal' && isConnectedToMarket(currentGame.board, getIndustrySpaceCity(spaceId))) {
    return autoMoveProducedResourceToMarket(currentGame, playerId, spaceId, 'coal')
  }

  return currentGame
}

function payBuildCost(
  game: GameState,
  playerId: string,
  tileId: string,
  cityName: string,
): GameState | null {
  const rule = getPlayerBoardIndustryTileRule(tileId)

  if (!rule || getPlayerMoney(game, playerId) < rule.buildCost.money) {
    return null
  }

  let currentGame = updatePlayerRoundSpending(game, playerId, rule.buildCost.money)

  for (const [resourceKind, count] of Object.entries(rule.buildCost.resources ?? {})) {
    if (!count) {
      continue
    }

    const result =
      resourceKind === 'coal'
        ? consumeCoal(currentGame, playerId, count, cityName)
        : resourceKind === 'iron'
          ? consumeIron(currentGame, playerId, count)
          : null

    if (!result) {
      return null
    }

    currentGame = result.game
  }

  return currentGame
}

function placeBuiltIndustry(
  game: GameState,
  playerId: string,
  spaceId: string,
  placement: IndustryTilePlacement,
): GameState | null {
  const existingPlacement = game.board.industryPlacements[spaceId]

  if (!existingPlacement) {
    const board = placeIndustryTile(game.board, spaceId, placement)

    return board === game.board ? null : { ...game, board }
  }

  if (!canOverbuildIndustry(game, playerId, spaceId, placement.industry)) {
    return null
  }

  return {
    ...game,
    board: {
      ...game.board,
      industryPlacements: {
        ...game.board.industryPlacements,
        [spaceId]: placement,
      },
      industryResourcePlacements: Object.fromEntries(
        Object.entries(game.board.industryResourcePlacements).filter(([currentSpaceId]) => currentSpaceId !== spaceId),
      ),
    },
  }
}

function buildIndustryPlacement(
  game: GameState,
  playerId: string,
  action: Extract<AiCandidateAction, { kind: 'build-industry' }>,
): IndustryTilePlacement {
  const boardTile = playerBoardIndustryTiles.find((tile) => tile.id === action.playerBoardTileId)

  return {
    id: `${playerId}-${action.playerBoardTileId}-${action.spaceId}`,
    industry: action.industry,
    ownerId: playerId,
    tileId: action.playerBoardTileId,
    flipped: boardTile ? game.players.find((player) => player.id === playerId)?.flippedPlayerBoardTileIds.includes(boardTile.id) : false,
  }
}

function executeBuildIndustryAction(
  game: GameState,
  playerId: string,
  action: Extract<AiCandidateAction, { kind: 'build-industry' }>,
): GameState {
  const afterDiscard = discardCardFromPlayerHand(game, playerId, action.cardId)

  if (afterDiscard === game) {
    return game
  }

  const afterCost = payBuildCost(afterDiscard, playerId, action.playerBoardTileId, action.cityName)

  if (!afterCost) {
    return game
  }

  const placement = buildIndustryPlacement(afterCost, playerId, action)
  const withIndustry = placeBuiltIndustry(afterCost, playerId, action.spaceId, placement)

  if (!withIndustry) {
    return game
  }

  return placeProducedResources(
    withIndustry,
    playerId,
    action.spaceId,
    action.industry,
    action.playerBoardTileId,
  )
}

function discardPlayedCard(game: GameState, playerId: string, cardId: string): GameState {
  return applyGameAction(game, {
    type: 'discard-card',
    playerId,
    cardId,
  })
}

function executeNetworkAction(
  game: GameState,
  playerId: string,
  action: Extract<AiCandidateAction, { kind: 'network' }>,
): GameState {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)

  if (!player || player.money < action.cost) {
    return game
  }

  let currentGame = discardCardFromPlayerHand(game, playerId, action.cardId)

  if (currentGame === game) {
    return game
  }

  currentGame = updatePlayerRoundSpending(currentGame, playerId, action.cost)

  for (const link of action.linkPlacements) {
    const withLink = placeNetworkLink(currentGame, playerId, link)

    if (!withLink) {
      return game
    }

    currentGame = withLink

    if (link.linkKind === 'rail') {
      const coalResult = consumeCoal(currentGame, playerId, 1, link.coalLocationName)

      if (!coalResult) {
        return game
      }

      currentGame = coalResult.game
    }
  }

  if (action.linkPlacements.length === 2) {
    const beerResult = consumeBeer(currentGame, playerId, 1, action.beerLocationName)

    if (!beerResult) {
      return game
    }

    currentGame = beerResult.game
  }

  return currentGame
}

function executeSellAction(
  game: GameState,
  playerId: string,
  action: Extract<AiCandidateAction, { kind: 'sell' }>,
): GameState {
  let currentGame = discardCardFromPlayerHand(game, playerId, action.cardId)

  if (currentGame === game) {
    return game
  }

  for (const sale of action.sales) {
    const afterSale = applySellSale(currentGame, playerId, sale)

    if (!afterSale) {
      return game
    }

    currentGame = afterSale
  }

  return currentGame
}

export function executeAiCandidateAction(
  game: GameState,
  playerId: string,
  action: AiCandidateAction,
): AiActionExecution {
  switch (action.kind) {
    case 'build-industry': {
      return {
        game: executeBuildIndustryAction(game, playerId, action),
        description: action.description,
      }
    }
    case 'build-link': {
      const withLink = applyGameAction(game, {
        type: 'place-link-tile',
        playerId,
        spaceId: action.spaceId,
        tile: {
          id: `${playerId}-${action.spaceId}-${action.linkKind}`,
          kind: action.linkKind,
          ownerId: playerId,
        },
      })

      return {
        game: discardPlayedCard(withLink, playerId, action.cardId),
        description: action.description,
      }
    }
    case 'network':
      return {
        game: executeNetworkAction(game, playerId, action),
        description: action.description,
      }
    case 'develop': {
      const afterDiscard = discardCardFromPlayerHand(game, playerId, action.cardId)
      const ironResult = consumeIron(afterDiscard, playerId, action.tiles.length)

      if (!ironResult) {
        return {
          game,
          description: action.description,
        }
      }

      const withDevelopedTiles = action.tiles.reduce(
        (currentGame, tile) =>
          developIndustryTile(currentGame, {
            id: `${playerId}-${tile.playerBoardTileId}-developed-${currentGame.developedIndustries.length + 1}`,
            industry: tile.industry,
            ownerId: playerId,
            tileId: tile.playerBoardTileId,
          }),
        ironResult.game,
      )

      return {
        game: withDevelopedTiles,
        description: formatDevelopDescription(action.tiles, ironResult.summary),
      }
    }
    case 'loan': {
      const afterDiscard = discardCardFromPlayerHand(game, playerId, action.cardId)
      const afterMoney = updatePlayerMoney(afterDiscard, playerId, 30)
      const afterIncome = updatePlayerScore(
        afterMoney,
        playerId,
        'income',
        action.incomeAfter - action.incomeBefore,
      )

      return {
        game: afterIncome,
        description: `Took a loan, reduced income level from ${action.incomeBefore} to ${action.incomeAfter}`,
      }
    }
    case 'scout':
      return {
        game: applyScout(game, playerId, action.cardIds),
        description: action.description,
      }
    case 'sell':
      return {
        game: executeSellAction(game, playerId, action),
        description: action.description,
      }
    case 'discard':
      return {
        game: discardPlayedCard(game, playerId, action.cardId),
        description: action.description,
      }
    case 'consume-resource': {
      const result = consumeResource(
        game,
        playerId,
        action.resourceKind,
        action.count,
        action.locationName,
        action.merchantSpaceId,
      )

      return result
        ? {
            game: result.game,
            description: action.description || capitalize(result.summary),
          }
        : {
            game,
            description: action.description,
          }
    }
  }
}

function createLogEntry(
  game: GameState,
  playerName: string,
  actionNumber: number,
  description: string,
  random = Math.random,
): AiLogEntry {
  return {
    id: `${game.roundNumber}-${actionNumber}-${random().toString(36).slice(2, 10)}`,
    playerName,
    roundNumber: game.roundNumber,
    actionNumber,
    description,
  }
}

export function runAiTurn(game: GameState, random = Math.random): AiTurnResult {
  if (game.status !== 'playing') {
    return { game, logEntries: [] }
  }

  const activePlayer = game.players[game.activePlayerIndex]

  if (!activePlayer) {
    return { game, logEntries: [] }
  }

  let currentGame = game
  const logEntries: AiLogEntry[] = []
  const actionCount = getActionsPerTurn(currentGame)
  const agent = createRandomAiAgent(random)

  for (let actionIndex = 0; actionIndex < actionCount; actionIndex += 1) {
    const candidates = [...getAiCandidateActions(currentGame, activePlayer.id)]
    let execution: AiActionExecution | null = null
    let nextGame: GameState | null = null

    while (candidates.length > 0 && !nextGame) {
      const chosenAction = agent.chooseAction(candidates)

      if (!chosenAction) {
        break
      }

      const candidateIndex = candidates.indexOf(chosenAction)
      candidates.splice(candidateIndex >= 0 ? candidateIndex : 0, 1)

      const candidateExecution = executeAiCandidateAction(
        currentGame,
        activePlayer.id,
        chosenAction,
      )

      if (candidateExecution.game !== currentGame) {
        execution = candidateExecution
        nextGame = candidateExecution.game
      }
    }

    if (!execution || !nextGame) {
      const discardAction = agent.chooseAction(getDiscardCandidates(currentGame, activePlayer.id))

      if (!discardAction) {
        break
      }

      const discardExecution = executeAiCandidateAction(currentGame, activePlayer.id, discardAction)

      if (discardExecution.game === currentGame) {
        break
      }

      execution = discardExecution
      nextGame = discardExecution.game
    }

    if (!execution || !nextGame) {
      break
    }

    currentGame = nextGame
    logEntries.push(
      createLogEntry(
        currentGame,
        activePlayer.name,
        actionIndex + 1,
        execution.description,
        random,
      ),
    )
  }

  let readyToPass = currentGame
  const requiredHandSize = getRequiredEndTurnHandSize(readyToPass)

  while (true) {
    const activeHand = readyToPass.players[readyToPass.activePlayerIndex]?.hand

    if (!activeHand || activeHand.length <= requiredHandSize) {
      break
    }

    const discardCandidates = getDiscardCandidates(readyToPass, activePlayer.id)

    if (discardCandidates.length === 0) {
      break
    }

    const discardAction = agent.chooseAction(discardCandidates)

    if (!discardAction) {
      break
    }

    const discardExecution = executeAiCandidateAction(readyToPass, activePlayer.id, discardAction)

    if (discardExecution.game === readyToPass) {
      break
    }

    readyToPass = discardExecution.game
  }

  const passedGame = applyGameAction(readyToPass, {
    type: 'pass-turn',
    playerId: activePlayer.id,
  })

  if (passedGame === readyToPass) {
    clientDebugLog('ai-turn', 'AI could not pass turn', {
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      requiredHandSize,
      handSize: readyToPass.players[readyToPass.activePlayerIndex]?.hand.length,
      actionLogCount: logEntries.length,
      ...summarizeGameState(readyToPass),
    })
  }

  return {
    game: passedGame,
    logEntries,
  }
}

// Backwards-compatible alias used during the first AI iteration.
export const runSimpleAiTurn = (game: GameState, random = Math.random): GameState =>
  runAiTurn(game, random).game
