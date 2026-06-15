import type { PlayerCount } from './cards'
import { createBoardState } from './board'
import type { BoardState } from './board'
import { createDrawableStacks, HAND_LIMIT } from './deck'
import type { DrawableStacks, GameCard } from './deck'

export type LocalPlayer = {
  id: string
  name: string
  hand: GameCard[]
  handLimit: typeof HAND_LIMIT
  victoryPoints: number
  income: number
}

export type GameState = {
  playerCount: PlayerCount
  players: LocalPlayer[]
  stacks: DrawableStacks
  discardPile: GameCard[]
  board: BoardState
}

export function createGameState(playerCount: PlayerCount): GameState {
  const players: LocalPlayer[] = Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    hand: [],
    handLimit: HAND_LIMIT,
    victoryPoints: 0,
    income: 0,
  }))

  return {
    playerCount,
    players,
    stacks: createDrawableStacks(playerCount),
    discardPile: [],
    board: createBoardState(),
  }
}

export function updatePlayerScore(
  game: GameState,
  playerId: string,
  field: 'victoryPoints' | 'income',
  delta: number,
): GameState {
  if (!game.players.some((player) => player.id === playerId)) {
    return game
  }

  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            [field]: player[field] + delta,
          }
        : player,
    ),
  }
}

export function discardCardFromPlayerHand(
  game: GameState,
  playerId: string,
  cardId: string,
): GameState {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)
  const card = player?.hand.find((handCard) => handCard.id === cardId)

  if (!player || !card) {
    return game
  }

  const players = game.players.map((currentPlayer) =>
    currentPlayer.id === playerId
      ? {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((handCard) => handCard.id !== cardId),
        }
      : currentPlayer,
  )

  if (card.kind === 'wild-location') {
    return {
      ...game,
      players,
      stacks: {
        ...game.stacks,
        wildLocation: [...game.stacks.wildLocation, card],
      },
    }
  }

  if (card.kind === 'wild-industry') {
    return {
      ...game,
      players,
      stacks: {
        ...game.stacks,
        wildIndustry: [...game.stacks.wildIndustry, card],
      },
    }
  }

  return {
    ...game,
    players,
    discardPile: [...game.discardPile, card],
  }
}
