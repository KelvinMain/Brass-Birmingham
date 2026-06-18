import type { GameState } from '../game'
import type { AiAgent, AiCandidateAction } from '../aiActions'
import { getDiscardCardAdjustment } from './discardScoring'
import { dotFeaturesWithParams, extractCandidateFeatures } from './features'
import {
  AI_PARAM_NAMES,
  DEFAULT_PARAMS,
  DISCARD_BASE_PENALTY,
  paramsToVector,
  type AiScoringParams,
} from './params'

export function scoreCandidateWithParams(
  game: GameState,
  playerId: string,
  candidate: AiCandidateAction,
  params: AiScoringParams,
): number {
  if (candidate.kind === 'discard') {
    const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)
    const card = player?.hand.find((handCard) => handCard.id === candidate.cardId)

    return DISCARD_BASE_PENALTY + getDiscardCardAdjustment(card)
  }

  const paramVector = paramsToVector(params)
  const features = extractCandidateFeatures(game, playerId, candidate)

  return dotFeaturesWithParams(features, paramVector)
}

export function chooseHighestScoredCandidate(
  candidates: AiCandidateAction[],
  scoreCandidate: (candidate: AiCandidateAction) => number,
  random: () => number,
): AiCandidateAction | undefined {
  if (candidates.length === 0) {
    return undefined
  }

  const scoredCandidates = candidates.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate),
  }))
  const bestScore = Math.max(...scoredCandidates.map((entry) => entry.score))
  const topCandidates = scoredCandidates
    .filter((entry) => entry.score === bestScore)
    .map((entry) => entry.candidate)
  const chosenIndex = Math.floor(random() * topCandidates.length)

  return topCandidates[Math.min(chosenIndex, topCandidates.length - 1)]
}

export function createParametricAiAgent(
  game: GameState,
  playerId: string,
  params: AiScoringParams = DEFAULT_PARAMS,
  random: () => number = Math.random,
): AiAgent {
  const scoreCandidate = (candidate: AiCandidateAction) =>
    scoreCandidateWithParams(game, playerId, candidate, params)

  return {
    chooseAction: (candidates) =>
      chooseHighestScoredCandidate(candidates, scoreCandidate, random),
  }
}

export function createParametricAiAgentFactory(
  params: AiScoringParams = DEFAULT_PARAMS,
): (
  game: GameState,
  playerId: string,
  random: () => number,
) => AiAgent {
  return (game, playerId, random) => createParametricAiAgent(game, playerId, params, random)
}

export function paramsFromVector(vector: Float32Array | number[]): AiScoringParams {
  return Object.fromEntries(
    AI_PARAM_NAMES.map((name, index) => [name, vector[index] ?? DEFAULT_PARAMS[name]]),
  ) as AiScoringParams
}
