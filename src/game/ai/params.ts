import { buildDefaultParams } from './featureNorm'

export const AI_PARAM_COUNT = 77

export const AI_PARAM_NAMES = [
  'biasBuild',
  'biasNetwork',
  'biasDevelop',
  'biasSell',
  'biasLoan',
  'biasScout',
  'developLevel',
  'buildBrewery',
  'buildCoal',
  'buildIron',
  'buildCotton',
  'buildManufacturer',
  'buildPottery',
  'buildVpFlip',
  'buildIncomeFlip',
  'buildMoneyCost',
  'buildCanalL1Reward',
  'buildCanalL1Risk',
  'buildCanalBreweryBonus',
  'buildCanalBricBonus',
  'buildRailHighLevel',
  'buildLocationQuality',
  'networkDoubleLink',
  'networkSingleRail',
  'networkSingleCanal',
  'networkToBrewery',
  'networkToBirmingham',
  'networkToMarket',
  'networkMoneyCost',
  'developOneBase',
  'developTwoBase',
  'developBrewery',
  'developCoal',
  'developIron',
  'developCotton',
  'developManufacturer',
  'developPottery',
  'developIronCost',
  'sellMulti',
  'sellVp',
  'sellIncome',
  'sellMerchantBeerBonus',
  'sellIncomeTrackChange',
  'loanHighIncomePenalty',
  'loanMidIncomePenalty',
  'loanBroke',
  'loanLowMoney',
  'loanRailBuffer',
  'loanComfortablePenalty',
  'biasBuildLink',
  'biasConsumeResource',
  'buildFlipLikelihood',
  'buildOverbuild',
  'buildCoalResourceCost',
  'buildIronResourceCost',
  'buildBeerResourceCost',
  'buildConnectedToMarket',
  'buildLinkCanal',
  'buildLinkRail',
  'buildLinkMoneyCost',
  'buildLinkToMarket',
  'buildLinkToBrewery',
  'networkCoalCost',
  'networkBlocksOpponent',
  'networkExtendsOwnNetwork',
  'sellCotton',
  'sellManufacturer',
  'sellPottery',
  'sellBeerCost',
  'sellMerchantReach',
  'loanIncomeFloorPenalty',
  'scoutRailValue',
  'scoutCanalPenalty',
  'consumeBeer',
  'consumeCoal',
  'consumeIron',
  'developSellableIndustry',
] as const

export type AiParamName = (typeof AI_PARAM_NAMES)[number]
export type AiScoringParams = Record<AiParamName, number>

export const DEFAULT_PARAMS: AiScoringParams = buildDefaultParams(AI_PARAM_NAMES)

export const DISCARD_BASE_PENALTY = -1_000_000

export function paramsToVector(params: AiScoringParams): Float32Array {
  return Float32Array.from(AI_PARAM_NAMES.map((name) => params[name]))
}

export function vectorToParams(vector: Float32Array | number[]): AiScoringParams {
  return Object.fromEntries(
    AI_PARAM_NAMES.map((name, index) => [name, vector[index] ?? DEFAULT_PARAMS[name]]),
  ) as AiScoringParams
}

export function paramsFromNetworkOutput(raw: Float32Array | number[]): AiScoringParams {
  return Object.fromEntries(
    AI_PARAM_NAMES.map((name, index) => [name, raw[index] ?? DEFAULT_PARAMS[name]]),
  ) as AiScoringParams
}
