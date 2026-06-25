import { describe, expect, it } from 'vitest'

import { createGameState } from '../game'
import type { AiCandidateAction } from '../aiActions'
import {
  estimateCanalNetworkPurpose,
  estimateLinkRaceValue,
  estimateNetworkActionValue,
  getLinkControlDelta,
} from './estimators'

describe('network heuristics', () => {
  it('penalizes purposeless canal networking more than purposeful links', () => {
    const game = createGameState(2)
    const playerId = game.players[0].id
    const card = game.players[0].hand[0]

    const orphanLink: AiCandidateAction = {
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

    const purposelessValue = estimateNetworkActionValue(
      game,
      playerId,
      orphanLink.linkPlacements.map((link) => link.spaceId),
    )
    const purpose = estimateCanalNetworkPurpose(
      game,
      playerId,
      orphanLink.linkPlacements.map((link) => link.spaceId),
    )

    expect(purpose).toBeLessThan(0.45)
    expect(purposelessValue).toBeLessThan(1)
  })

  it('rewards rail link race value when opponents lead contested cities', () => {
    const baseGame = createGameState(2)
    const opponentId = baseGame.players[1].id
    const playerId = baseGame.players[0].id
    const game = {
      ...baseGame,
      era: 'rail' as const,
      board: {
        ...baseGame.board,
        linkPlacements: {
          ...baseGame.board.linkPlacements,
          'birmingham-coventry': {
            ownerId: opponentId,
            linkKind: 'rail' as const,
          },
        },
      },
    }

    expect(getLinkControlDelta(game, playerId, 'Birmingham')).toBeLessThan(0)
    expect(
      estimateLinkRaceValue(game, playerId, ['walsall-birmingham']),
    ).toBeGreaterThan(0)
  })
})
