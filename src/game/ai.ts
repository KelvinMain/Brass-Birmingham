export {
  createRandomAiAgent,
  createStrategicAiAgent,
  executeAiCandidateAction,
  getAiCandidateActions,
  getLoanIncomeAfterReduction,
  runAiTurn,
  runSimpleAiTurn,
} from './aiActions'
export type {
  AiAgent,
  AiAgentFactory,
  AiActionKind,
  AiCandidateAction,
  AiLogEntry,
  AiTurnResult,
  RunAiTurnOptions,
} from './aiActions'

export {
  AI_PARAM_COUNT,
  AI_PARAM_NAMES,
  DEFAULT_PARAMS,
  PARAM_SCALE,
  paramsToVector,
  scaledParamsFromNetworkOutput,
  vectorToParams,
} from './ai/params'
export type { AiParamName, AiScoringParams } from './ai/params'

export {
  createEmptyFeatureVector,
  dotFeaturesWithParams,
  extractCandidateFeatures,
} from './ai/features'

export {
  chooseHighestScoredCandidate,
  createParametricAiAgent,
  createParametricAiAgentFactory,
  scoreCandidateWithParams,
} from './ai/parametricScorer'

export { createSeededRandom } from './ai/random'
export { createSeededGameState, getPlayerFitness, simulateAiGame } from './ai/simulator'
export type {
  SimulateGameOptions,
  SimulateGamePlayerResult,
  SimulateGameResult,
} from './ai/simulator'

export { AI_STATE_FEATURE_COUNT, encodeAiState } from './ai/stateEncoding'

export {
  buildScoringNetwork,
  cloneModel,
  deserializeModel,
  getModelWeightVector,
  loadEvolvedModelFromUrl,
  predictParams,
  serializeModel,
  setModelWeightVector,
  warmStartToDefaultParams,
} from './ai/neuralModel'
export type { SerializedScoringNetwork } from './ai/neuralModel'

export { createNeuralAiAgent, createNeuralAiAgentFactory } from './ai/neuralAgent'
export { runEvolution } from './ai/evolution'
export type { EvolutionConfig, EvolutionGenerationStats, EvolutionResult } from './ai/evolution'

export {
  createVsAiAgentFactory,
  getEvolvedAiAgentFactory,
  initEvolvedAgent,
  loadEvolvedModel,
} from './ai/evolvedAgent'
