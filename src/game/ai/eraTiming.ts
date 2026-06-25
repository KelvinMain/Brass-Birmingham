import type { PlayerCount } from '../cards'
import { getDeckForPlayerCount } from '../deck'
import type { GameState } from '../game'

export function getEraDeckSize(playerCount: PlayerCount): number {
  return getDeckForPlayerCount(playerCount).length
}

export function getEraCardProgress(game: GameState): number {
  const deckSize = getEraDeckSize(game.playerCount)

  if (deckSize === 0) {
    return 1
  }

  const cardsRemaining =
    game.stacks.standard.length +
    game.players.reduce((total, player) => total + player.hand.length, 0)

  return Math.min(1, Math.max(0, 1 - cardsRemaining / deckSize))
}

export function estimateMaxRoundsInEra(game: GameState): number {
  const deckSize = getEraDeckSize(game.playerCount)
  const actionsPerRound = game.era === 'canal' ? 1.35 : 1.85

  return Math.max(3, Math.ceil(deckSize / (game.playerCount * actionsPerRound)))
}

export function getEraRoundProgress(game: GameState): number {
  const cardProgress = getEraCardProgress(game)
  const estimatedMaxRounds = estimateMaxRoundsInEra(game)
  const roundProgress =
    estimatedMaxRounds <= 1
      ? 1
      : Math.min(1, (game.roundNumber - 1) / Math.max(1, estimatedMaxRounds - 1))

  return Math.max(cardProgress, roundProgress * 0.85)
}

export function isEarlyEraPhase(game: GameState): boolean {
  return getEraRoundProgress(game) < 0.35
}

export function isLateEraPhase(game: GameState): boolean {
  return getEraRoundProgress(game) > 0.72
}

export function isRailLinkRacePhase(game: GameState): boolean {
  return game.era === 'rail' && getEraRoundProgress(game) < 0.4
}
