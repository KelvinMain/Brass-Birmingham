import { applyGameAction } from './actions'
import { getRequiredEndTurnHandSize } from './game'
import type { GameState } from './game'

export function runSimpleAiTurn(game: GameState, random = Math.random): GameState {
  if (game.status !== 'playing') {
    return game
  }

  const activePlayer = game.players[game.activePlayerIndex]

  if (!activePlayer) {
    return game
  }

  let currentGame = game
  const targetHandSize = getRequiredEndTurnHandSize(currentGame)

  while (true) {
    const hand = currentGame.players[currentGame.activePlayerIndex]?.hand ?? []

    if (hand.length <= targetHandSize) {
      break
    }

    const cardIndex = Math.floor(random() * hand.length)
    const cardId = hand[cardIndex]?.id

    if (!cardId) {
      break
    }

    const nextGame = applyGameAction(currentGame, {
      type: 'discard-card',
      playerId: activePlayer.id,
      cardId,
    })

    if (nextGame === currentGame) {
      break
    }

    currentGame = nextGame
  }

  return applyGameAction(currentGame, {
    type: 'pass-turn',
    playerId: activePlayer.id,
  })
}
