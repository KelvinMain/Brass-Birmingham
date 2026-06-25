import type { AiParamName } from './params'

export type AiScoringParams = Record<AiParamName, number>

export const FEATURE_NORM: Record<AiParamName, number> = {
  biasBuild: 1,
  biasNetwork: 1,
  biasDevelop: 1,
  biasSell: 1,
  biasLoan: 1,
  biasScout: 1,
  developLevel: 24,
  buildBrewery: 1,
  buildCoal: 1,
  buildIron: 1,
  buildCotton: 1,
  buildManufacturer: 1,
  buildPottery: 1,
  buildVpFlip: 20,
  buildIncomeFlip: 10,
  buildMoneyCost: 120,
  buildCanalL1Reward: 1,
  buildCanalL1Risk: 1,
  buildCanalBreweryBonus: 1,
  buildCanalBricBonus: 1,
  buildRailHighLevel: 8,
  buildLocationQuality: 1,
  networkDoubleLink: 1,
  networkSingleRail: 1,
  networkSingleCanal: 1,
  networkToBrewery: 2,
  networkToBirmingham: 2,
  networkToMarket: 2,
  networkMoneyCost: 120,
  developOneBase: 1,
  developTwoBase: 1,
  developBrewery: 2,
  developCoal: 2,
  developIron: 2,
  developCotton: 2,
  developManufacturer: 2,
  developPottery: 2,
  developIronCost: 120,
  sellMulti: 1,
  sellVp: 30,
  sellIncome: 15,
  sellMerchantBeerBonus: 2,
  sellIncomeTrackChange: 80,
  loanHighIncomePenalty: 1,
  loanMidIncomePenalty: 1,
  loanBroke: 1,
  loanLowMoney: 1,
  loanRailBuffer: 1,
  loanComfortablePenalty: 1,
  biasBuildLink: 1,
  biasConsumeResource: 1,
  buildFlipLikelihood: 1,
  buildOverbuild: 1,
  buildCoalResourceCost: 120,
  buildIronResourceCost: 120,
  buildBeerResourceCost: 3,
  buildConnectedToMarket: 1,
  buildLinkCanal: 1,
  buildLinkRail: 1,
  buildLinkMoneyCost: 12,
  buildLinkToMarket: 1,
  buildLinkToBrewery: 1,
  networkCoalCost: 120,
  networkBlocksOpponent: 2,
  networkExtendsOwnNetwork: 2,
  sellCotton: 2,
  sellManufacturer: 2,
  sellPottery: 2,
  sellBeerCost: 3,
  sellMerchantReach: 3,
  loanIncomeFloorPenalty: 1,
  scoutRailValue: 1,
  scoutCanalPenalty: 1,
  consumeBeer: 3,
  consumeCoal: 5,
  consumeIron: 5,
  developSellableIndustry: 2,
}

export const DEFAULT_UNIT_WEIGHTS: Record<AiParamName, number> = {
  biasBuild: 1,
  biasNetwork: 1,
  biasDevelop: 0.95,
  biasSell: 1,
  biasLoan: 1,
  biasScout: -35,
  developLevel: 1,
  buildBrewery: 75,
  buildCoal: 70,
  buildIron: 65,
  buildCotton: 38,
  buildManufacturer: 35,
  buildPottery: 28,
  buildVpFlip: 4,
  buildIncomeFlip: 5,
  buildMoneyCost: 1.8,
  buildCanalL1Reward: 25,
  buildCanalL1Risk: 400,
  buildCanalBreweryBonus: 15,
  buildCanalBricBonus: 20,
  buildRailHighLevel: 6,
  buildLocationQuality: 8,
  networkDoubleLink: 155,
  networkSingleRail: 48,
  networkSingleCanal: 22,
  networkToBrewery: 28,
  networkToBirmingham: 14,
  networkToMarket: 12,
  networkMoneyCost: 1.5,
  developOneBase: -220,
  developTwoBase: 35,
  developBrewery: 40,
  developCoal: 28,
  developIron: 24,
  developCotton: 18,
  developManufacturer: 16,
  developPottery: 14,
  developIronCost: 3.5,
  sellMulti: 220,
  sellVp: 6,
  sellIncome: 4,
  sellMerchantBeerBonus: 18,
  sellIncomeTrackChange: 4,
  loanHighIncomePenalty: 120,
  loanMidIncomePenalty: 45,
  loanBroke: 70,
  loanLowMoney: 45,
  loanRailBuffer: 30,
  loanComfortablePenalty: 15,
  biasBuildLink: 0,
  biasConsumeResource: 0.6,
  buildFlipLikelihood: 45,
  buildOverbuild: 0,
  buildCoalResourceCost: 1.5,
  buildIronResourceCost: 1.5,
  buildBeerResourceCost: 1.5,
  buildConnectedToMarket: 20,
  buildLinkCanal: 38,
  buildLinkRail: 62,
  buildLinkMoneyCost: 1.5,
  buildLinkToMarket: 12,
  buildLinkToBrewery: 28,
  networkCoalCost: 1.2,
  networkBlocksOpponent: 35,
  networkExtendsOwnNetwork: 15,
  sellCotton: 60,
  sellManufacturer: 70,
  sellPottery: 50,
  sellBeerCost: 2,
  sellMerchantReach: 18,
  loanIncomeFloorPenalty: -50,
  scoutRailValue: -35,
  scoutCanalPenalty: 35,
  consumeBeer: 28,
  consumeCoal: 22,
  consumeIron: 22,
  developSellableIndustry: 14,
}

/** @deprecated Use DEFAULT_UNIT_WEIGHTS */
export const LEGACY_UNIT_WEIGHTS = DEFAULT_UNIT_WEIGHTS

export type SerializedUnitWeights = {
  version: 1
  unitWeights: Record<AiParamName, number>
}

export function normalizeFeatureValue(name: AiParamName, rawValue: number): number {
  const norm = FEATURE_NORM[name]

  if (norm <= 0) {
    return 0
  }

  return rawValue / norm
}

export function buildDefaultParams(
  paramNames: readonly AiParamName[],
): Record<AiParamName, number> {
  return Object.fromEntries(
    paramNames.map((name) => [name, DEFAULT_UNIT_WEIGHTS[name] * FEATURE_NORM[name]]),
  ) as Record<AiParamName, number>
}

export function buildParamsFromUnitWeights(
  weights: Record<AiParamName, number>,
  paramNames: readonly AiParamName[],
): AiScoringParams {
  return Object.fromEntries(
    paramNames.map((name) => [name, weights[name] * FEATURE_NORM[name]]),
  ) as AiScoringParams
}

export function cloneUnitWeights(
  weights: Record<AiParamName, number>,
): Record<AiParamName, number> {
  return { ...weights }
}

export function unitWeightsToVector(
  weights: Record<AiParamName, number>,
  paramNames: readonly AiParamName[],
): Float32Array {
  return Float32Array.from(paramNames.map((name) => weights[name]))
}

export function vectorToUnitWeights(
  vector: Float32Array | number[],
  base: Record<AiParamName, number> = DEFAULT_UNIT_WEIGHTS,
): Record<AiParamName, number> {
  return Object.fromEntries(
    Object.keys(base).map((name, index) => [name, vector[index] ?? base[name as AiParamName]]),
  ) as Record<AiParamName, number>
}

export function serializeUnitWeights(
  weights: Record<AiParamName, number>,
): SerializedUnitWeights {
  return {
    version: 1,
    unitWeights: cloneUnitWeights(weights),
  }
}

export function deserializeUnitWeights(
  serialized: SerializedUnitWeights | Record<AiParamName, number>,
): Record<AiParamName, number> {
  if ('unitWeights' in serialized) {
    return cloneUnitWeights({ ...DEFAULT_UNIT_WEIGHTS, ...serialized.unitWeights })
  }

  return cloneUnitWeights({ ...DEFAULT_UNIT_WEIGHTS, ...serialized })
}
