import type { GameState } from '../game'
import { getIncomeMoneyDelta } from '../game'
import type { AiCandidateAction } from '../aiActions'
import {
  estimateBuildLocationValue,
  estimateCanalBeerDemand,
  estimateDevelopUnlockValue,
  estimateIronPurchaseCost,
  estimateNetworkActionValue,
  estimateSellableIndustryBuildAppeal,
  getPlayerMoney,
  PREFERRED_INCOME_TRACK,
  scoreIncomeAnchorPreference,
} from './estimators'
import { getPlayerBoardIndustryTileRule } from '../playerBoard'

const sellableIndustries = ['cotton', 'manufacturer', 'pottery'] as const

export function scoreStrategicAdjustment(
  game: GameState,
  playerId: string,
  candidate: AiCandidateAction,
  _baseScore: number,
): number {
  const player = game.players.find((entry) => entry.id === playerId)

  if (!player) {
    return 0
  }

  let adjustment = scoreIncomeAnchorPreference(player.income, game)

  switch (candidate.kind) {
    case 'network': {
      const networkValue = estimateNetworkActionValue(
        game,
        playerId,
        candidate.linkPlacements.map((link) => link.spaceId),
      )

      adjustment += (networkValue - 0.55) * 70

      if (game.era === 'rail' && networkValue < 0.35) {
        adjustment -= 140
      }

      if (game.era === 'rail' && networkValue >= 1) {
        adjustment += 35
      }

      break
    }
    case 'develop': {
      const ironCost = estimateIronPurchaseCost(game, candidate.tiles.length)
      const moneyAfter = player.money - ironCost
      const incomeDelta = getIncomeMoneyDelta(player.income)
      const unlockValue = estimateDevelopUnlockValue(
        game,
        playerId,
        candidate.tiles.map((tile) => tile.playerBoardTileId),
      )

      adjustment += unlockValue * 65

      if (ironCost === 0) {
        adjustment += 110
      } else if (ironCost <= 2) {
        adjustment += 75
      } else if (ironCost <= 5) {
        adjustment += 35
      }

      if (ironCost >= 6) {
        adjustment -= (ironCost - 6) * 10
      }

      if (ironCost >= 10) {
        adjustment -= 50
      }

      if (candidate.tiles.length >= 2) {
        adjustment -= 35

        if (ironCost >= 10) {
          adjustment -= 80
        }
      }

      if (moneyAfter < 14 && ironCost > 2) {
        adjustment -= 40
      }

      if (moneyAfter < 12 && ironCost > 5) {
        adjustment -= 70
      }

      if (moneyAfter < 6) {
        adjustment -= 160
      }

      if (incomeDelta < 0 && ironCost > 5) {
        adjustment -= 50
      }

      if (Math.abs(incomeDelta) > 2 && moneyAfter < 14 && ironCost > 5) {
        adjustment -= Math.abs(incomeDelta) * 14
      }

      break
    }
    case 'build-industry': {
      if (getPlayerMoney(game, playerId) < 14 && game.era === 'canal') {
        adjustment -= 40
      }

      adjustment +=
        estimateBuildLocationValue(game, playerId, candidate.cityName, candidate.playerBoardTileId) *
        45

      if (sellableIndustries.includes(candidate.industry as (typeof sellableIndustries)[number])) {
        adjustment +=
          estimateSellableIndustryBuildAppeal(
            game,
            playerId,
            candidate.industry,
            candidate.cityName,
            candidate.playerBoardTileId,
          ) * 55
      }

      if (game.era === 'canal') {
        const tileRule = getPlayerBoardIndustryTileRule(candidate.playerBoardTileId)

        if (tileRule?.level === 1 && candidate.industry === 'brewery') {
          const canalBeerDemand = estimateCanalBeerDemand(game, playerId, candidate.cityName)

          if (canalBeerDemand < 0.35) {
            adjustment -= 220
          }
        }
      }

      break
    }
    case 'sell': {
      let runningIncome = player.income

      for (const sale of candidate.sales) {
        const nextIncome = runningIncome + sale.incomeIncrease
        const beforeDistance = Math.abs(getIncomeMoneyDelta(runningIncome))
        const afterDistance = Math.abs(getIncomeMoneyDelta(nextIncome))

        if (afterDistance < beforeDistance) {
          adjustment += 35
        }

        if (
          beforeDistance > 0 &&
          afterDistance <= 1 &&
          Math.abs(nextIncome - PREFERRED_INCOME_TRACK) <= 2
        ) {
          adjustment += 25
        }

        runningIncome = nextIncome
      }

      adjustment += candidate.sales.length >= 2 ? 25 : 10

      break
    }
    case 'loan': {
      const incomeDelta = getIncomeMoneyDelta(player.income)

      if (getPlayerMoney(game, playerId) >= 12 && incomeDelta >= 0) {
        adjustment -= 100
      }

      if (incomeDelta > 2) {
        adjustment -= 80 + incomeDelta * 15
      }

      if (
        player.income >= PREFERRED_INCOME_TRACK - 1 &&
        player.income <= PREFERRED_INCOME_TRACK + 3 &&
        getPlayerMoney(game, playerId) >= 12
      ) {
        adjustment -= 60
      }

      break
    }
    default:
      break
  }

  return adjustment
}
