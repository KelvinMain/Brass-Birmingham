import type { GameState } from '../game'
import type { AiAgent, AiAgentFactory, AiCandidateAction } from '../aiActions'
import type * as tf from '@tensorflow/tfjs'
import { predictParams } from './neuralModel'
import {
  chooseHighestScoredCandidate,
  scoreCandidateWithParams,
} from './parametricScorer'
import { encodeAiState } from './stateEncoding'

export function createNeuralAiAgent(
  model: tf.LayersModel,
  game: GameState,
  playerId: string,
  random: () => number = Math.random,
): AiAgent {
  const params = predictParams(model, encodeAiState(game, playerId))
  const scoreCandidate = (candidate: AiCandidateAction) =>
    scoreCandidateWithParams(game, playerId, candidate, params)

  return {
    chooseAction: (candidates) =>
      chooseHighestScoredCandidate(candidates, scoreCandidate, random),
  }
}

export function createNeuralAiAgentFactory(model: tf.LayersModel): AiAgentFactory {
  return (game, playerId, random) => createNeuralAiAgent(model, game, playerId, random)
}
