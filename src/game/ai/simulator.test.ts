import { describe, expect, it } from 'vitest'

import { createStrategicAiAgent } from '../aiActions'
import { createSeededGameState, simulateAiGame } from './simulator'

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
