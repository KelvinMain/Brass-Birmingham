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
  DISCARD_BASE_PENALTY,
  paramsToVector,
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
export { applyRoundOneStartingPlayer } from './game'
export {
  createSeededGameState,
  getPlayerFitness,
  resolveRoundOneStartingPlayerIndex,
  simulateAiGame,
} from './ai/simulator'
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
export { runEvolution, loadEvolutionModelFromSerialized } from './ai/evolution'
export type {
  EvolutionConfig,
  EvolutionGenerationStats,
  EvolutionMode,
  EvolutionResult,
} from './ai/evolution'

export {
  DEFAULT_UNIT_WEIGHTS,
  LEGACY_UNIT_WEIGHTS,
  FEATURE_NORM,
  buildParamsFromUnitWeights,
  cloneUnitWeights,
  deserializeUnitWeights,
  serializeUnitWeights,
  unitWeightsToVector,
  vectorToUnitWeights,
} from './ai/featureNorm'
export type { SerializedUnitWeights } from './ai/featureNorm'

export {
  createTunedAiAgentFactory,
  createWeightedAiAgentFactory,
  loadTunedWeightsFromSerialized,
  runWeightEvolution,
} from './ai/weightEvolution'
export type {
  WeightEvolutionConfig,
  WeightEvolutionGenerationStats,
  WeightEvolutionMode,
  WeightEvolutionResult,
} from './ai/weightEvolution'

export {
  getEraCardProgress,
  getEraDeckSize,
  getEraRoundProgress,
  estimateMaxRoundsInEra,
  isEarlyEraPhase,
  isLateEraPhase,
  isRailLinkRacePhase,
} from './ai/eraTiming'

export {
  DEFAULT_LEAGUE_CONFIG,
  HallOfFame,
  buildLeagueOpponentContext,
  describeLeagueConfig,
  mergeLeagueConfig,
  pickLeagueOpponentFactory,
} from './ai/league'
export type { LeagueConfig, LeagueOpponentContext, LeagueOpponentKind } from './ai/league'

export {
  createVsAiAgentFactory,
  getEvolvedAiAgentFactory,
  initEvolvedAgent,
  loadEvolvedModel,
} from './ai/evolvedAgent'
