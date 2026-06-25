import { describe, expect, it } from 'vitest'

import { createStrategicAiAgent } from '../aiActions'
import { applyRoundOneStartingPlayer, createGameState } from '../game'
import {
  createSeededGameState,
  resolveRoundOneStartingPlayerIndex,
  simulateAiGame,
} from './simulator'

describe('simulateAiGame', () => {
  it('plays a full 2-player game to completion', () => {
    const strategic = createStrategicAiAgent
    const result = simulateAiGame({
      playerCount: 2,
      agentFactories: [strategic, strategic],
      seed: 12345,
      maxTurns: 600,
    })

    expect(result.status).toBe('ended')
    expect(result.turnsPlayed).toBeGreaterThan(0)
    expect(result.playerResults).toHaveLength(2)
  }, 120_000)

  it('is deterministic for the same seed', () => {
    const strategic = createStrategicAiAgent
    const options = {
      playerCount: 2 as const,
      agentFactories: [strategic, strategic],
      seed: 24680,
      maxTurns: 600,
    }

    const first = simulateAiGame(options)
    const second = simulateAiGame(options)

    expect(first.playerResults).toEqual(second.playerResults)
    expect(first.turnsPlayed).toBe(second.turnsPlayed)
    expect(first.status).toBe(second.status)
  }, 120_000)

  it('randomizes round-one starting player deterministically from the seed', () => {
    expect(
      resolveRoundOneStartingPlayerIndex(2, 0, { randomizeRoundOneStartingPlayer: true }),
    ).toBe(1)
    expect(
      resolveRoundOneStartingPlayerIndex(2, 0, { randomizeRoundOneStartingPlayer: true }),
    ).toBe(1)
    expect(
      resolveRoundOneStartingPlayerIndex(2, 1, { randomizeRoundOneStartingPlayer: true }),
    ).toBe(0)
  })

  it('applies the chosen starting seat only at the opening of round one', () => {
    const game = applyRoundOneStartingPlayer(createGameState(2), 1)

    expect(game.activePlayerIndex).toBe(1)
    expect(game.players[1].id).toBe('player-2')
  })

  it('stays deterministic when round-one starting player randomization is enabled', () => {
    const strategic = createStrategicAiAgent
    const options = {
      playerCount: 2 as const,
      agentFactories: [strategic, strategic],
      seed: 24680,
      maxTurns: 600,
      randomizeRoundOneStartingPlayer: true,
    }

    const first = simulateAiGame(options)
    const second = simulateAiGame(options)

    expect(first.playerResults).toEqual(second.playerResults)
    expect(first.turnsPlayed).toBe(second.turnsPlayed)
    expect(first.status).toBe(second.status)
  }, 120_000)

  it('creates reproducible opening states', () => {
    const first = createSeededGameState(2, 99)
    const second = createSeededGameState(2, 99)

    expect(first.players[0].hand.map((card) => card.id)).toEqual(
      second.players[0].hand.map((card) => card.id),
    )
    expect(first.stacks.standard.map((card) => card.id)).toEqual(
      second.stacks.standard.map((card) => card.id),
    )
  })
})
