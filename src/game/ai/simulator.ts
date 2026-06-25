import type { PlayerCount } from '../cards'
import { applyRoundOneStartingPlayer, createGameState } from '../game'
import type { GameState } from '../game'
import { getDeckForPlayerCount, shuffleDeck } from '../deck'
import type { AiAgentFactory } from '../aiActions'
import { runAiTurn } from '../aiActions'
import { createSeededRandom } from './random'

export type SimulateGameOptions = {
  playerCount: PlayerCount
  agentFactories: AiAgentFactory[]
  seed: number
  maxTurns?: number
  /** When set, overrides randomization and fixes round-one starting seat. */
  startingPlayerIndex?: number
  /** Randomize who takes the first turn of round one (seeded, deterministic per game). */
  randomizeRoundOneStartingPlayer?: boolean
}

export type SimulateGamePlayerResult = {
  id: string
  victoryPoints: number
  rank: number
}

export type SimulateGameResult = {
  winnerId: string | null
  playerResults: SimulateGamePlayerResult[]
  turnsPlayed: number
  status: 'ended' | 'stuck'
  finalGame: GameState
}

export function createSeededGameState(playerCount: PlayerCount, seed: number): GameState {
  const random = createSeededRandom(seed)
  const deck = shuffleDeck(getDeckForPlayerCount(playerCount), random)

  return createGameState(playerCount, deck, random)
}

export function resolveRoundOneStartingPlayerIndex(
  playerCount: PlayerCount,
  seed: number,
  options: Pick<SimulateGameOptions, 'startingPlayerIndex' | 'randomizeRoundOneStartingPlayer'> = {},
): number {
  if (options.startingPlayerIndex !== undefined) {
    return ((options.startingPlayerIndex % playerCount) + playerCount) % playerCount
  }

  if (!options.randomizeRoundOneStartingPlayer) {
    return 0
  }

  return Math.floor(createSeededRandom(seed + 31_337)() * playerCount)
}

export function simulateAiGame(options: SimulateGameOptions): SimulateGameResult {
  const {
    playerCount,
    agentFactories,
    seed,
    maxTurns = 600,
    startingPlayerIndex,
    randomizeRoundOneStartingPlayer = false,
  } = options
  const random = createSeededRandom(seed + 1)
  const railDeck = shuffleDeck(
    getDeckForPlayerCount(playerCount),
    createSeededRandom(seed + 9999),
  )
  const openingStartingPlayerIndex = resolveRoundOneStartingPlayerIndex(playerCount, seed, {
    startingPlayerIndex,
    randomizeRoundOneStartingPlayer,
  })
  let game = applyRoundOneStartingPlayer(
    createSeededGameState(playerCount, seed),
    openingStartingPlayerIndex,
  )
  let turnsPlayed = 0

  while (game.status === 'playing' && turnsPlayed < maxTurns) {
    const activePlayerIndex = game.activePlayerIndex
    const factory = agentFactories[activePlayerIndex] ?? agentFactories[0]
    const previousGame = game
    const result = runAiTurn(game, {
      random,
      createAgent: factory,
      passTurnOptions: { railDeck },
    })

    if (result.game === previousGame) {
      return buildSimulateGameResult(game, turnsPlayed, 'stuck')
    }

    game = result.game
    turnsPlayed += 1
  }

  return buildSimulateGameResult(
    game,
    turnsPlayed,
    game.status === 'ended' ? 'ended' : 'stuck',
  )
}

function buildSimulateGameResult(
  game: GameState,
  turnsPlayed: number,
  status: 'ended' | 'stuck',
): SimulateGameResult {
  const sortedPlayers = [...game.players].sort(
    (left, right) => right.victoryPoints - left.victoryPoints,
  )
  const topScore = sortedPlayers[0]?.victoryPoints ?? 0
  const winners = sortedPlayers.filter((player) => player.victoryPoints === topScore)

  return {
    winnerId: winners.length === 1 ? winners[0].id : null,
    playerResults: sortedPlayers.map((player, index) => ({
      id: player.id,
      victoryPoints: player.victoryPoints,
      rank: index + 1,
    })),
    turnsPlayed,
    status,
    finalGame: game,
  }
}

export function getPlayerFitness(
  result: SimulateGameResult,
  playerId: string,
): { wins: number; vpMargin: number; fitness: number } {
  const playerResult = result.playerResults.find((entry) => entry.id === playerId)
  const opponentBest = result.playerResults
    .filter((entry) => entry.id !== playerId)
    .reduce((best, entry) => Math.max(best, entry.victoryPoints), 0)

  if (!playerResult) {
    return { wins: 0, vpMargin: 0, fitness: 0 }
  }

  const wins = result.winnerId === playerId ? 1 : 0
  const vpMargin = playerResult.victoryPoints - opponentBest

  return {
    wins,
    vpMargin,
    fitness: wins + 0.02 * vpMargin,
  }
}
