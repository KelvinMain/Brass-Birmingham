export const AI_PARAM_COUNT = 50

export const AI_PARAM_NAMES = [
  'biasBuild',
  'biasNetwork',
  'biasDevelop',
  'biasSell',
  'biasLoan',
  'biasScout',
  'biasDiscard',
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
] as const

export type AiParamName = (typeof AI_PARAM_NAMES)[number]
export type AiScoringParams = Record<AiParamName, number>

export const PARAM_SCALE: Record<AiParamName, number> = {
  biasBuild: 1,
  biasNetwork: 1,
  biasDevelop: 1,
  biasSell: 1,
  biasLoan: 1,
  biasScout: 35,
  biasDiscard: 10000,
  developLevel: 1,
  buildBrewery: 100,
  buildCoal: 70,
  buildIron: 65,
  buildCotton: 22,
  buildManufacturer: 18,
  buildPottery: 12,
  buildVpFlip: 4,
  buildIncomeFlip: 2,
  buildMoneyCost: 1.8,
  buildCanalL1Reward: 25,
  buildCanalL1Risk: 300,
  buildCanalBreweryBonus: 35,
  buildCanalBricBonus: 20,
  buildRailHighLevel: 6,
  buildLocationQuality: 8,
  networkDoubleLink: 155,
  networkSingleRail: 62,
  networkSingleCanal: 38,
  networkToBrewery: 28,
  networkToBirmingham: 18,
  networkToMarket: 12,
  networkMoneyCost: 1.5,
  developOneBase: 280,
  developTwoBase: 90,
  developBrewery: 45,
  developCoal: 32,
  developIron: 28,
  developCotton: 12,
  developManufacturer: 10,
  developPottery: 8,
  developIronCost: 2.5,
  sellMulti: 220,
  sellVp: 6,
  sellIncome: 4,
  sellMerchantBeerBonus: 18,
  sellIncomeTrackChange: 1,
  loanHighIncomePenalty: 120,
  loanMidIncomePenalty: 45,
  loanBroke: 70,
  loanLowMoney: 45,
  loanRailBuffer: 30,
  loanComfortablePenalty: 15,
}

export const DEFAULT_PARAMS: AiScoringParams = {
  ...Object.fromEntries(AI_PARAM_NAMES.map((name) => [name, PARAM_SCALE[name]])),
  biasDiscard: -10_000,
  biasScout: -35,
  developOneBase: -280,
} as AiScoringParams

export const DISCARD_BASE_PENALTY = -10_000

export function paramsToVector(params: AiScoringParams): Float32Array {
  return Float32Array.from(AI_PARAM_NAMES.map((name) => params[name]))
}

export function vectorToParams(vector: Float32Array | number[]): AiScoringParams {
  return Object.fromEntries(
    AI_PARAM_NAMES.map((name, index) => [name, vector[index] ?? PARAM_SCALE[name]]),
  ) as AiScoringParams
}

export function scaledParamsFromNetworkOutput(raw: Float32Array | number[]): AiScoringParams {
  return Object.fromEntries(
    AI_PARAM_NAMES.map((name, index) => {
      const value = raw[index] ?? 0
      const magnitude = Math.abs(PARAM_SCALE[name])
      const sign = Math.sign(DEFAULT_PARAMS[name]) || 1

      return [name, Math.tanh(value) * magnitude * sign]
    }),
  ) as AiScoringParams
}

