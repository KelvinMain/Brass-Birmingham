import type { Industry } from '../cards'
import type { GameCard } from '../deck'
import type { GameState } from '../game'
import { getPlayerBoardIndustryTileRule, playerBoardIndustryTiles } from '../playerBoard'
import type { AiCandidateAction } from '../aiActions'
import { getLoanIncomeAfterReduction } from './estimators'
import {
  estimateBuildMoneyCost,
  estimateIronPurchaseCost,
  estimateNetworkMoneyCost,
  estimatePlannedTileFlipLikelihood,
  finiteMoneyCost,
  getBuildSpacePriority,
  getPlayerMoney,
  PREFERRED_INCOME_TRACK,
  scoreDiscardCard,
  scoreIncomeTrackChange,
  scoreNetworkLinkPlacement,
} from './estimators'
import { AI_PARAM_COUNT, AI_PARAM_NAMES, type AiParamName } from './params'

export function createEmptyFeatureVector(): Float32Array {
  return new Float32Array(AI_PARAM_COUNT)
}

function setFeature(features: Float32Array, name: AiParamName, value: number): void {
  const index = AI_PARAM_NAMES.indexOf(name)

  if (index >= 0) {
    features[index] = value
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

      const rule = getPlayerBoardIndustryTileRule(candidate.playerBoardTileId)
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

      setFeature(features, 'buildVpFlip', (rule?.victoryPoints ?? 0) * flipLikelihood)
      setFeature(features, 'buildIncomeFlip', (rule?.incomeIncrease ?? 0) * flipLikelihood)
      setFeature(
        features,
        'buildMoneyCost',
        -finiteMoneyCost(
          estimateBuildMoneyCost(game, candidate.playerBoardTileId, candidate.cityName),
        ),
      )

      if (game.era === 'canal') {
        if (candidate.industry === 'brewery') {
          setFeature(features, 'buildCanalBreweryBonus', 1)
        }

        if (candidate.industry === 'coal' || candidate.industry === 'iron') {
          setFeature(features, 'buildCanalBricBonus', 1)
        }

        if (tile?.level === 1) {
          if (flipLikelihood >= 0.55) {
            setFeature(features, 'buildCanalL1Reward', 1)
          } else {
            setFeature(features, 'buildCanalL1Risk', -(1 - flipLikelihood))
          }
        }
      }

      if (game.era === 'rail' && tile && tile.level >= 2) {
        setFeature(features, 'buildRailHighLevel', tile.level * Math.max(0.45, flipLikelihood))
      }

      if (getBuildSpacePriority(candidate.spaceId, candidate.industry) === 0) {
        setFeature(features, 'buildLocationQuality', 1)
      }

      if (rule?.incomeIncrease) {
        setFeature(
          features,
          'sellIncomeTrackChange',
          scoreIncomeTrackChange(
            projectedIncome,
            projectedIncome + Math.round(rule.incomeIncrease * flipLikelihood),
          ),
        )
      }

      break
    }
    case 'network': {
      setFeature(features, 'biasNetwork', 1)

      if (candidate.linkPlacements.length === 2) {
        setFeature(features, 'networkDoubleLink', 1)
      } else if (game.era === 'rail') {
        setFeature(features, 'networkSingleRail', 1)
      } else {
        setFeature(features, 'networkSingleCanal', 1)
      }

      let breweryLinks = 0
      let birminghamLinks = 0
      let marketLinks = 0

      for (const link of candidate.linkPlacements) {
        const placementScore = scoreNetworkLinkPlacement(link.spaceId)
        breweryLinks += placementScore.brewery
        birminghamLinks += placementScore.birmingham
        marketLinks += placementScore.market
      }

      setFeature(features, 'networkToBrewery', breweryLinks)
      setFeature(features, 'networkToBirmingham', birminghamLinks)
      setFeature(features, 'networkToMarket', marketLinks)
      setFeature(
        features,
        'networkMoneyCost',
        -finiteMoneyCost(estimateNetworkMoneyCost(game, candidate)),
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

      for (const sale of candidate.sales) {
        const rule = getPlayerBoardIndustryTileRule(sale.tileId)
        vpTotal += rule?.victoryPoints ?? 0
        incomeTotal += rule?.incomeIncrease ?? 0

        if (sale.merchantBeerBonus) {
          merchantBeerBonusCount += 1
        }

        incomeTrackChange += scoreIncomeTrackChange(
          runningIncome,
          runningIncome + sale.incomeIncrease,
        )
        runningIncome += sale.incomeIncrease
      }

      setFeature(features, 'sellVp', vpTotal)
      setFeature(features, 'sellIncome', incomeTotal)
      setFeature(features, 'sellMerchantBeerBonus', merchantBeerBonusCount)
      setFeature(features, 'sellIncomeTrackChange', incomeTrackChange)
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

      if (incomeAfter !== null) {
        setFeature(
          features,
          'sellIncomeTrackChange',
          scoreIncomeTrackChange(projectedIncome, incomeAfter),
        )
      }

      break
    }
    case 'scout':
      setFeature(features, 'biasScout', 1)
      break
    case 'discard': {
      setFeature(features, 'biasDiscard', 1)
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

export function extractDiscardAdjustment(card: GameCard | undefined): number {
  return scoreDiscardCard(card)
}
