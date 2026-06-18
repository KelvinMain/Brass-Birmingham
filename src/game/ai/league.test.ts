import { describe, expect, it } from 'vitest'

import {
  buildLeagueOpponentContext,
  createHeuristicAiAgentFactory,
  createRandomAiAgentFactory,
  DEFAULT_LEAGUE_CONFIG,
  describeLeagueConfig,
  mergeLeagueConfig,
  pickLeagueOpponentFactory,
} from './league'
import { createSeededRandom } from './random'

describe('league opponent selection', () => {
  it('describes the default league mix', () => {
    expect(describeLeagueConfig(DEFAULT_LEAGUE_CONFIG)).toContain('heuristic=35%')
    expect(describeLeagueConfig(DEFAULT_LEAGUE_CONFIG)).toContain('population=40%')
  })

  it('falls back to heuristic when no other opponents are available', () => {
    const context = buildLeagueOpponentContext([], 0, [])
    const random = createSeededRandom(42)
    const config = mergeLeagueConfig({
      heuristicWeight: 0,
      randomWeight: 0,
      populationWeight: 0,
      championWeight: 0,
    })

    expect(pickLeagueOpponentFactory(config, context, random)).toBe(context.heuristicFactory)
  })

  it('can sample each opponent bucket deterministically from the seed', () => {
    const heuristic = createHeuristicAiAgentFactory()
    const randomAgent = createRandomAiAgentFactory()
    const sentinelPopulation = () => heuristic
    const sentinelChampion = () => randomAgent

    const context = {
      heuristicFactory: heuristic,
      randomFactory: randomAgent,
      populationFactories: [sentinelPopulation],
      championFactories: [sentinelChampion],
    }

    const onlyPopulation = mergeLeagueConfig({
      heuristicWeight: 0,
      randomWeight: 0,
      populationWeight: 1,
      championWeight: 0,
    })
    const onlyChampion = mergeLeagueConfig({
      heuristicWeight: 0,
      randomWeight: 0,
      populationWeight: 0,
      championWeight: 1,
    })

    expect(pickLeagueOpponentFactory(onlyPopulation, context, createSeededRandom(7))).toBe(
      sentinelPopulation,
    )
    expect(pickLeagueOpponentFactory(onlyChampion, context, createSeededRandom(7))).toBe(
      sentinelChampion,
    )
  })
})
