import { describe, expect, it } from 'vitest'

import {
  createRandomAiAgent,
  createStrategicAiAgent,
  type AiCandidateAction,
} from '../aiActions'
import { createGameState } from '../game'
import { getLoanIncomeAfterReduction } from '../aiActions'
import { scoreCandidateWithParams } from './parametricScorer'
import { DEFAULT_PARAMS } from './params'

describe('scoreCandidateWithParams', () => {
  it('prefers brewery builds over cotton with default params', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const brewery: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'brewery-1',
      playerBoardTileId: 'brewery-1',
      industry: 'brewery',
      cityName: 'Brewery-1',
      description: 'Built brewery in Brewery-1 (level 1)',
    }
    const cotton: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'worcester-1',
      playerBoardTileId: 'cotton-1',
      industry: 'cotton',
      cityName: 'Worcester',
      description: 'Built cotton in Worcester (level 1)',
    }

    const breweryScore = scoreCandidateWithParams(game, playerId, brewery, DEFAULT_PARAMS)
    const cottonScore = scoreCandidateWithParams(game, playerId, cotton, DEFAULT_PARAMS)

    expect(breweryScore).toBeGreaterThan(cottonScore)
  })

  it('prefers loans over discards with default params', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const incomeAfter = getLoanIncomeAfterReduction(game.players[1].income)
    const loan: AiCandidateAction = {
      kind: 'loan',
      cardId: card.id,
      incomeBefore: game.players[1].income,
      incomeAfter: incomeAfter ?? 0,
      description: 'Took a loan',
    }
    const discard: AiCandidateAction = {
      kind: 'discard',
      cardId: card.id,
      description: 'Discarded card',
    }

    expect(
      scoreCandidateWithParams(game, playerId, loan, DEFAULT_PARAMS),
    ).toBeGreaterThan(scoreCandidateWithParams(game, playerId, discard, DEFAULT_PARAMS))
  })

  it('matches strategic agent choices for canned comparisons', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const strategic = createStrategicAiAgent(game, playerId, () => 0)
    const candidates: AiCandidateAction[] = [
      {
        kind: 'develop',
        cardId: card.id,
        tiles: [{ playerBoardTileId: 'brewery-1', industry: 'brewery', level: 1 }],
        description: 'Developed Brewery (level 1)',
      },
      {
        kind: 'develop',
        cardId: card.id,
        tiles: [
          { playerBoardTileId: 'brewery-1', industry: 'brewery', level: 1 },
          { playerBoardTileId: 'coal-1', industry: 'coal', level: 1 },
        ],
        description: 'Developed Brewery (level 1) and Coal (level 1)',
      },
    ]

    expect(strategic.chooseAction(candidates)?.kind).toBe('develop')
    expect(
      (strategic.chooseAction(candidates) as Extract<AiCandidateAction, { kind: 'develop' }>).tiles,
    ).toHaveLength(2)
  })

  it('keeps random agent behavior independent of params', () => {
    const game = createGameState(2)
    const card = game.players[1].hand[0]
    const candidates: AiCandidateAction[] = [
      {
        kind: 'discard',
        cardId: card.id,
        description: 'Discarded first card',
      },
      {
        kind: 'loan',
        cardId: card.id,
        incomeBefore: 10,
        incomeAfter: 7,
        description: 'Took a loan',
      },
    ]

    expect(createRandomAiAgent(() => 0.75).chooseAction(candidates)).toBe(candidates[1])
  })
})
