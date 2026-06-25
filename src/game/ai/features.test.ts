import { describe, expect, it } from 'vitest'

import { createGameState } from '../game'
import type { AiCandidateAction } from '../aiActions'
import { AI_PARAM_COUNT, AI_PARAM_NAMES, DEFAULT_PARAMS } from './params'
import { extractCandidateFeatures } from './features'
import { FEATURE_NORM } from './featureNorm'

describe('extractCandidateFeatures', () => {
  it('returns a 77-dimensional normalized vector', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const candidate: AiCandidateAction = {
      kind: 'discard',
      cardId: card.id,
      description: 'Discarded card',
    }

    const features = extractCandidateFeatures(game, playerId, candidate)

    expect(features).toHaveLength(AI_PARAM_COUNT)
    expect(features.every((value) => value === 0)).toBe(true)
  })

  it('activates only build features for build candidates', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const build: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'brewery-1',
      playerBoardTileId: 'brewery-1',
      industry: 'brewery',
      cityName: 'Brewery-1',
      description: 'Built brewery',
    }
    const network: AiCandidateAction = {
      kind: 'network',
      cardId: card.id,
      cost: 3,
      linkPlacements: [
        {
          spaceId: 'birmingham-coventry',
          linkKind: 'canal',
          routeLabel: 'Birmingham-Coventry',
        },
      ],
      description: 'Networked Birmingham-Coventry',
    }

    const buildFeatures = extractCandidateFeatures(game, playerId, build)
    const networkFeatures = extractCandidateFeatures(game, playerId, network)
    const breweryIndex = AI_PARAM_NAMES.indexOf('buildBrewery')
    const canalIndex = AI_PARAM_NAMES.indexOf('networkSingleCanal')

    expect(buildFeatures[breweryIndex]).toBe(1)
    expect(networkFeatures[breweryIndex]).toBe(0)
    expect(networkFeatures[canalIndex]).toBeGreaterThan(0)
    expect(buildFeatures[canalIndex]).toBe(0)
  })

  it('keeps money costs within a bounded normalized range', () => {
    const game = createGameState(2)
    const playerId = game.players[1].id
    const card = game.players[1].hand[0]
    const build: AiCandidateAction = {
      kind: 'build-industry',
      cardId: card.id,
      spaceId: 'pottery-1',
      playerBoardTileId: 'pottery-1',
      industry: 'pottery',
      cityName: 'Worcester',
      description: 'Built pottery',
    }

    const features = extractCandidateFeatures(game, playerId, build)
    const moneyCostIndex = AI_PARAM_NAMES.indexOf('buildMoneyCost')

    expect(Math.abs(features[moneyCostIndex])).toBeLessThanOrEqual(1)
  })
})

describe('DEFAULT_PARAMS', () => {
  it('has one value per scoring parameter', () => {
    expect(Object.keys(DEFAULT_PARAMS)).toHaveLength(AI_PARAM_COUNT)
  })

  it('uses normalized feature scales for cost weights', () => {
    expect(DEFAULT_PARAMS.buildMoneyCost).toBeCloseTo(1.8 * FEATURE_NORM.buildMoneyCost, 4)
  })
})
