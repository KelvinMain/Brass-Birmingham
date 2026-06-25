import type { Industry } from '../cards'
import {
  getVisibleMerchantTilePlacements,
  industrySpaces,
  linkSpaces,
  marketLocations,
} from '../board'
import type { GameState } from '../game'
import { getIncomeMoneyDelta } from '../game'
import { getPlayerBoardIndustryTileRule, playerBoardIndustryTiles } from '../playerBoard'
import type { AiCandidateAction } from '../aiActions'
import { getLoanIncomeAfterReduction } from './estimators'
import { isLateEraPhase } from './eraTiming'
import {
  estimateBuildLocationValue,
  estimateBuildMoneyCost,
  estimateCanalBeerDemand,
  estimateCanalNetworkPurpose,
  estimateCoalPurchaseCost,
  estimateDevelopUnlockValue,
  estimateIronPurchaseCost,
  estimateLinkRaceValue,
  estimateNetworkActionValue,
  estimateNetworkMoneyCost,
  estimatePlannedTileFlipLikelihood,
  estimateRailLinkValue,
  estimateSellableIndustryBuildAppeal,
  finiteMoneyCost,
  getBuildSpacePriority,
  getLinkControlDelta,
  getPlayerMoney,
  PREFERRED_INCOME_TRACK,
  scoreIncomeTrackChange,
  scoreNetworkLinkPlacement,
} from './estimators'
import { AI_PARAM_COUNT, AI_PARAM_NAMES, type AiParamName } from './params'
import { normalizeFeatureValue } from './featureNorm'

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

export function createEmptyFeatureVector(): Float32Array {
  return new Float32Array(AI_PARAM_COUNT)
}

function setFeature(features: Float32Array, name: AiParamName, rawValue: number): void {
  const index = AI_PARAM_NAMES.indexOf(name)

  if (index >= 0) {
    features[index] = normalizeFeatureValue(name, rawValue)
  }
}

function countIndustryInDevelop(
  tiles: Array<{ industry: Industry }>,
  industry: Industry,
): number {
  return tiles.filter((tile) => tile.industry === industry).length
}

function sumDevelopLevels(
  tiles: Array<{ industry: Industry; level: number }>,
  isOneTile: boolean,
): number {
  return tiles.reduce((total, tile) => total + (isOneTile ? tile.level : tile.level * 3), 0)
}

function countSellableInDevelop(tiles: Array<{ industry: Industry }>): number {
  return tiles.filter((tile) =>
    sellableIndustries.includes(tile.industry as SellableIndustry),
  ).length
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

function getBuildResourceCosts(
  game: GameState,
  tileId: string,
  cityName: string,
): { coal: number; iron: number; beer: number } {
  const rule = getPlayerBoardIndustryTileRule(tileId)
  const resources = rule?.buildCost.resources ?? {}

  return {
    coal: resources.coal
      ? finiteMoneyCost(estimateCoalPurchaseCost(game, resources.coal, cityName))
      : 0,
    iron: resources.iron ? finiteMoneyCost(estimateIronPurchaseCost(game, resources.iron)) : 0,
    beer: resources.beer ?? 0,
  }
}

function getNetworkCoalCost(
  game: GameState,
  candidate: Extract<AiCandidateAction, { kind: 'network' }>,
): number {
  let coalCost = 0

  for (const link of candidate.linkPlacements) {
    if (link.coalLocationName) {
      coalCost += finiteMoneyCost(estimateCoalPurchaseCost(game, 1, link.coalLocationName))
    }
  }

  return coalCost
}

function networkExtendsOwnNetwork(
  game: GameState,
  playerId: string,
  candidate: Extract<AiCandidateAction, { kind: 'network' }>,
): number {
  const ownedCities = new Set(
    Object.entries(game.board.industryPlacements)
      .filter(([, placement]) => placement.ownerId === playerId)
      .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
      .filter(Boolean) as string[],
  )

  let extensions = 0

  for (const link of candidate.linkPlacements) {
    const linkSpace = linkSpaces.find((space) => space.id === link.spaceId)

    if (!linkSpace) {
      continue
    }

    const routeCities = [linkSpace.from, linkSpace.to, linkSpace.via].filter(Boolean) as string[]
    const touchesOwned = routeCities.some((city) => ownedCities.has(city))
    const addsNewCity = routeCities.some((city) => !ownedCities.has(city))

    if (touchesOwned && addsNewCity) {
      extensions += 1
    }
  }

  return extensions
}

function networkBlocksOpponent(
  game: GameState,
  playerId: string,
  candidate: Extract<AiCandidateAction, { kind: 'network' }>,
): number {
  let blocks = 0

  for (const link of candidate.linkPlacements) {
    const linkSpace = linkSpaces.find((space) => space.id === link.spaceId)

    if (!linkSpace || game.board.linkPlacements[link.spaceId]) {
      continue
    }

    const routeCities = [linkSpace.from, linkSpace.to, linkSpace.via].filter(Boolean) as string[]

    for (const opponent of game.players) {
      if (opponent.id === playerId) {
        continue
      }

      const opponentCities = new Set(
        Object.entries(game.board.industryPlacements)
          .filter(([, placement]) => placement.ownerId === opponent.id)
          .map(([spaceId]) => industrySpaces.find((space) => space.id === spaceId)?.city)
          .filter(Boolean) as string[],
      )

      const opponentNeedsRoute = [...opponentCities].some((city) =>
        marketLocations.some(
          (market) => !areLocationsConnected(game, city, market) && routeCities.includes(city),
        ),
      )

      if (opponentNeedsRoute) {
        blocks += 1
      }
    }
  }

  return blocks
}

function getSellMerchantReach(
  game: GameState,
  cityName: string,
  industry: Industry,
): number {
  if (!sellableIndustries.includes(industry as SellableIndustry)) {
    return 0
  }

  const merchants = Object.values(getVisibleMerchantTilePlacements(game.board))

  return merchants.filter((merchant) => {
    const merchantLocation =
      merchantLocationBySpaceId[merchant.spaceId as keyof typeof merchantLocationBySpaceId]

    return (
      merchant.kind === industry &&
      Boolean(merchantLocation) &&
      areLocationsConnected(game, cityName, merchantLocation!)
    )
  }).length
}

function getSellBeerCost(game: GameState, tileId: string, cityName: string): number {
  const rule = getPlayerBoardIndustryTileRule(tileId)
  const beerNeeded = rule?.sellBeer ?? 0

  if (beerNeeded === 0) {
    return 0
  }

  return beerNeeded
}

export function extractCandidateFeatures(
  game: GameState,
  playerId: string,
  candidate: AiCandidateAction,
): Float32Array {
  const features = createEmptyFeatureVector()
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)
  const projectedIncome = player?.income ?? PREFERRED_INCOME_TRACK

  switch (candidate.kind) {
    case 'build-industry': {
      setFeature(features, 'biasBuild', 1)

      const industryParam = {
        brewery: 'buildBrewery',
        coal: 'buildCoal',
        iron: 'buildIron',
        cotton: 'buildCotton',
        manufacturer: 'buildManufacturer',
        pottery: 'buildPottery',
      }[candidate.industry] as AiParamName

      setFeature(features, industryParam, 1)

      const tile = playerBoardIndustryTiles.find(
        (boardTile) => boardTile.id === candidate.playerBoardTileId,
      )
      const flipLikelihood = estimatePlannedTileFlipLikelihood(
        game,
        playerId,
        candidate.industry,
        candidate.playerBoardTileId,
        candidate.cityName,
      )
      const rule = getPlayerBoardIndustryTileRule(candidate.playerBoardTileId)
      const resourceCosts = getBuildResourceCosts(
        game,
        candidate.playerBoardTileId,
        candidate.cityName,
      )
      const existingPlacement = game.board.industryPlacements[candidate.spaceId]

      setFeature(features, 'buildFlipLikelihood', flipLikelihood)
      setFeature(features, 'buildVpFlip', (rule?.victoryPoints ?? 0) * flipLikelihood)
      setFeature(features, 'buildIncomeFlip', (rule?.incomeIncrease ?? 0) * flipLikelihood)
      setFeature(
        features,
        'buildMoneyCost',
        -finiteMoneyCost(
          estimateBuildMoneyCost(game, candidate.playerBoardTileId, candidate.cityName),
        ),
      )
      setFeature(features, 'buildCoalResourceCost', -resourceCosts.coal)
      setFeature(features, 'buildIronResourceCost', -resourceCosts.iron)
      setFeature(features, 'buildBeerResourceCost', -resourceCosts.beer)
      setFeature(
        features,
        'buildConnectedToMarket',
        isConnectedToMarket(game, candidate.cityName) ? 1 : 0,
      )
      setFeature(features, 'buildOverbuild', existingPlacement ? 1 : 0)

      if (game.era === 'canal') {
        if (candidate.industry === 'coal' || candidate.industry === 'iron') {
          setFeature(features, 'buildCanalBricBonus', 1)
        }

        const canalBeerDemand = estimateCanalBeerDemand(game, playerId, candidate.cityName)

        if (candidate.industry === 'brewery' && canalBeerDemand >= 0.35) {
          setFeature(features, 'buildCanalBreweryBonus', 1)
        }

        if (tile?.level === 1) {
          if (flipLikelihood >= 0.55) {
            setFeature(features, 'buildCanalL1Reward', 1)
          } else {
            setFeature(features, 'buildCanalL1Risk', -(1 - flipLikelihood))
          }

          if (candidate.industry === 'brewery' && canalBeerDemand < 0.35) {
            setFeature(features, 'buildCanalL1Risk', -1)
          }
        }
      }

      if (isLateEraPhase(game) && flipLikelihood < 0.35) {
        setFeature(features, 'buildFlipLikelihood', flipLikelihood - (0.35 - flipLikelihood))
      }

      if (game.era === 'rail' && tile && tile.level >= 2) {
        setFeature(features, 'buildRailHighLevel', tile.level * Math.max(0.45, flipLikelihood))
      }

      const locationValue = estimateBuildLocationValue(
        game,
        playerId,
        candidate.cityName,
        candidate.playerBoardTileId,
      )

      if (getBuildSpacePriority(candidate.spaceId, candidate.industry) === 0) {
        setFeature(features, 'buildLocationQuality', 1 + locationValue * 0.35)
      } else if (locationValue > 0.35) {
        setFeature(features, 'buildLocationQuality', locationValue * 0.65)
      }

      if (sellableIndustries.includes(candidate.industry as SellableIndustry)) {
        const sellAppeal = estimateSellableIndustryBuildAppeal(
          game,
          playerId,
          candidate.industry,
          candidate.cityName,
          candidate.playerBoardTileId,
        )

        if (sellAppeal > 0) {
          setFeature(features, 'buildVpFlip', (rule?.victoryPoints ?? 0) * flipLikelihood * (1 + sellAppeal))
          setFeature(features, 'buildFlipLikelihood', flipLikelihood * (1 + sellAppeal * 0.35))
          setFeature(
            features,
            'buildConnectedToMarket',
            (isConnectedToMarket(game, candidate.cityName) ? 1 : 0) + sellAppeal * 0.4,
          )
        }
      }

      if (rule?.incomeIncrease) {
        setFeature(
          features,
          'sellIncomeTrackChange',
          scoreIncomeTrackChange(
            projectedIncome,
            projectedIncome + Math.round(rule.incomeIncrease * flipLikelihood),
            game,
          ),
        )
      }

      break
    }
    case 'build-link': {
      setFeature(features, 'biasBuildLink', 1)

      if (candidate.linkKind === 'canal') {
        setFeature(features, 'buildLinkCanal', 1)
      } else {
        setFeature(features, 'buildLinkRail', 1)
      }

      const placementScore = scoreNetworkLinkPlacement(candidate.spaceId)
      setFeature(features, 'buildLinkToBrewery', placementScore.brewery)
      setFeature(features, 'buildLinkToMarket', placementScore.market)
      setFeature(features, 'buildLinkMoneyCost', candidate.linkKind === 'rail' ? -6 : -3)
      break
    }
    case 'network': {
      setFeature(features, 'biasNetwork', 1)

      const linkSpaceIds = candidate.linkPlacements.map((link) => link.spaceId)
      const networkValue = estimateNetworkActionValue(game, playerId, linkSpaceIds)
      const canalPurpose =
        game.era === 'canal' ? estimateCanalNetworkPurpose(game, playerId, linkSpaceIds) : 1
      const linkRaceValue = estimateLinkRaceValue(game, playerId, linkSpaceIds)

      if (candidate.linkPlacements.length === 2) {
        setFeature(features, 'networkDoubleLink', Math.max(0.35, networkValue * 0.75))
      } else if (game.era === 'rail') {
        setFeature(
          features,
          'networkSingleRail',
          Math.max(0.05, networkValue * (1 + linkRaceValue * 0.35)),
        )
      } else {
        setFeature(
          features,
          'networkSingleCanal',
          Math.max(0.05, networkValue * 0.85 * (0.35 + canalPurpose * 0.9)),
        )
      }

      let breweryLinks = 0
      let birminghamLinks = 0
      let marketLinks = 0

      for (const link of candidate.linkPlacements) {
        const placementScore = scoreNetworkLinkPlacement(link.spaceId)
        const linkValue = estimateRailLinkValue(game, playerId, link.spaceId)
        const valueScale = Math.max(0.35, linkValue)

        breweryLinks += placementScore.brewery * valueScale
        marketLinks += placementScore.market * valueScale

        if (placementScore.birmingham > 0) {
          const birminghamControl = getLinkControlDelta(game, playerId, 'Birmingham')
          const birminghamScale =
            birminghamControl < 0 ? 0.35 : birminghamControl === 0 ? 0.75 : 1 + birminghamControl * 0.15
          birminghamLinks += placementScore.birmingham * valueScale * birminghamScale
        }
      }

      setFeature(features, 'networkToBrewery', breweryLinks)
      setFeature(features, 'networkToBirmingham', birminghamLinks)
      setFeature(features, 'networkToMarket', marketLinks)
      setFeature(
        features,
        'networkMoneyCost',
        -finiteMoneyCost(estimateNetworkMoneyCost(game, candidate)),
      )
      setFeature(features, 'networkCoalCost', -getNetworkCoalCost(game, candidate))
      setFeature(
        features,
        'networkExtendsOwnNetwork',
        networkExtendsOwnNetwork(game, playerId, candidate) * Math.max(0.4, networkValue),
      )
      setFeature(
        features,
        'networkBlocksOpponent',
        networkBlocksOpponent(game, playerId, candidate) * (1 + linkRaceValue * 0.5),
      )
      break
    }
    case 'develop': {
      setFeature(features, 'biasDevelop', 1)

      const isOneTile = candidate.tiles.length === 1
      setFeature(features, isOneTile ? 'developOneBase' : 'developTwoBase', 1)
      setFeature(features, 'developBrewery', countIndustryInDevelop(candidate.tiles, 'brewery'))
      setFeature(features, 'developCoal', countIndustryInDevelop(candidate.tiles, 'coal'))
      setFeature(features, 'developIron', countIndustryInDevelop(candidate.tiles, 'iron'))
      setFeature(features, 'developCotton', countIndustryInDevelop(candidate.tiles, 'cotton'))
      setFeature(
        features,
        'developManufacturer',
        countIndustryInDevelop(candidate.tiles, 'manufacturer'),
      )
      setFeature(features, 'developPottery', countIndustryInDevelop(candidate.tiles, 'pottery'))
      setFeature(features, 'developLevel', sumDevelopLevels(candidate.tiles, isOneTile))
      setFeature(
        features,
        'developIronCost',
        -finiteMoneyCost(estimateIronPurchaseCost(game, candidate.tiles.length)),
      )
      setFeature(
        features,
        'developSellableIndustry',
        countSellableInDevelop(candidate.tiles) +
          estimateDevelopUnlockValue(
            game,
            playerId,
            candidate.tiles.map((tile) => tile.playerBoardTileId),
          ),
      )
      break
    }
    case 'sell': {
      setFeature(features, 'biasSell', 1)

      if (candidate.sales.length >= 2) {
        setFeature(features, 'sellMulti', 1)
      }

      let vpTotal = 0
      let incomeTotal = 0
      let merchantBeerBonusCount = 0
      let incomeTrackChange = 0
      let runningIncome = projectedIncome
      let cottonSales = 0
      let manufacturerSales = 0
      let potterySales = 0
      let beerCostTotal = 0
      let merchantReach = 0

      for (const sale of candidate.sales) {
        const rule = getPlayerBoardIndustryTileRule(sale.tileId)
        const industry = playerBoardIndustryTiles.find((tile) => tile.id === sale.tileId)?.industry
        vpTotal += rule?.victoryPoints ?? 0
        incomeTotal += rule?.incomeIncrease ?? 0

        if (sale.merchantBeerBonus) {
          merchantBeerBonusCount += 1
        }

        incomeTrackChange += scoreIncomeTrackChange(
          runningIncome,
          runningIncome + sale.incomeIncrease,
          game,
        )
        runningIncome += sale.incomeIncrease

        if (industry === 'cotton') {
          cottonSales += 1
        } else if (industry === 'manufacturer') {
          manufacturerSales += 1
        } else if (industry === 'pottery') {
          potterySales += 1
        }

        beerCostTotal += getSellBeerCost(
          game,
          sale.tileId,
          industrySpaces.find((space) => space.id === sale.spaceId)?.city ?? sale.spaceId,
        )
        merchantReach += getSellMerchantReach(
          game,
          industrySpaces.find((space) => space.id === sale.spaceId)?.city ?? sale.spaceId,
          industry ?? sale.industry,
        )
      }

      setFeature(features, 'sellVp', vpTotal)
      setFeature(features, 'sellIncome', incomeTotal)
      setFeature(features, 'sellMerchantBeerBonus', merchantBeerBonusCount)
      setFeature(features, 'sellIncomeTrackChange', incomeTrackChange)
      setFeature(features, 'sellCotton', cottonSales)
      setFeature(features, 'sellManufacturer', manufacturerSales)
      setFeature(features, 'sellPottery', potterySales)
      setFeature(features, 'sellBeerCost', -beerCostTotal)
      setFeature(features, 'sellMerchantReach', merchantReach)
      break
    }
    case 'loan': {
      setFeature(features, 'biasLoan', 1)

      const money = getPlayerMoney(game, playerId)

      if (projectedIncome > 20) {
        setFeature(features, 'loanHighIncomePenalty', 1)
      } else if (projectedIncome > 15) {
        setFeature(features, 'loanMidIncomePenalty', 1)
      }

      if (money < 8) {
        setFeature(features, 'loanBroke', 1)
      } else if (money < 15) {
        setFeature(features, 'loanLowMoney', 1)
      } else if (game.era === 'rail' && money < 22) {
        setFeature(features, 'loanRailBuffer', 1)
      } else {
        setFeature(features, 'loanComfortablePenalty', 1)
      }

      const incomeAfter = getLoanIncomeAfterReduction(projectedIncome)

      if (incomeAfter === null) {
        setFeature(features, 'loanIncomeFloorPenalty', 1)
      } else {
        const trackChange = scoreIncomeTrackChange(projectedIncome, incomeAfter, game)
        const incomeDelta = getIncomeMoneyDelta(projectedIncome)

        setFeature(
          features,
          'sellIncomeTrackChange',
          incomeDelta > 1 ? Math.min(trackChange, 0) : trackChange,
        )
      }

      break
    }
    case 'scout': {
      setFeature(features, 'biasScout', 1)

      if (game.era === 'rail') {
        setFeature(features, 'scoutRailValue', 1)
      } else {
        setFeature(features, 'scoutCanalPenalty', 1)
      }

      break
    }
    case 'discard':
      break
    case 'consume-resource': {
      setFeature(features, 'biasConsumeResource', 1)

      if (candidate.resourceKind === 'beer') {
        setFeature(features, 'consumeBeer', candidate.count)
      } else if (candidate.resourceKind === 'coal') {
        setFeature(features, 'consumeCoal', candidate.count)
      } else {
        setFeature(features, 'consumeIron', candidate.count)
      }

      break
    }
    default:
      break
  }

  return features
}

export function dotFeaturesWithParams(
  features: Float32Array,
  params: Float32Array | number[],
): number {
  let score = 0

  for (let index = 0; index < AI_PARAM_COUNT; index += 1) {
    score += features[index] * (params[index] ?? 0)
  }

  return score
}
