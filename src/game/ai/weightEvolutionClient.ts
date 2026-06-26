import type { AiAgentFactory } from '../aiActions'
import {
  DEFAULT_UNIT_WEIGHTS,
  deserializeUnitWeights,
  type SerializedUnitWeights,
} from './featureNorm'
import type { AiParamName } from './params'
import { createWeightedAiAgentFactory } from './weightEvolutionEvaluate'

export { createWeightedAiAgentFactory } from './weightEvolutionEvaluate'

export function loadTunedWeightsFromSerialized(
  serialized: SerializedUnitWeights | Record<AiParamName, number>,
): Record<AiParamName, number> {
  return deserializeUnitWeights(serialized)
}

export function createTunedAiAgentFactory(
  weights: Record<AiParamName, number> = DEFAULT_UNIT_WEIGHTS,
): AiAgentFactory {
  return createWeightedAiAgentFactory(weights)
}
