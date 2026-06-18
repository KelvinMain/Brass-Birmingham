import { describe, expect, it } from 'vitest'

import { createGameState } from '../game'
import type { AiCandidateAction } from '../aiActions'
import { AI_PARAM_COUNT, DEFAULT_PARAMS } from './params'
import { extractCandidateFeatures } from './features'

describe('extractCandidateFeatures', () => {
  it('returns a 50-dimensional vector', () => {
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
    expect(features[6]).toBe(1)
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

    expect(buildFeatures[8]).toBe(1)
    expect(networkFeatures[8]).toBe(0)
    expect(networkFeatures[25]).toBe(1)
    expect(buildFeatures[25]).toBe(0)
  })
})

describe('DEFAULT_PARAMS', () => {
  it('has one value per scoring parameter', () => {
    expect(Object.keys(DEFAULT_PARAMS)).toHaveLength(AI_PARAM_COUNT)
  })
})
