import type { GameState } from '../game/game'

export function summarizeGameState(game: GameState | null | undefined) {
  if (!game) {
    return null
  }

  const activePlayer = game.players[game.activePlayerIndex]

  return {
    playerCount: game.playerCount,
    era: game.era,
    status: game.status,
    roundNumber: game.roundNumber,
    turnsTakenThisRound: game.turnsTakenThisRound,
    turnStartHandCount: game.turnStartHandCount,
    activePlayerIndex: game.activePlayerIndex,
    activePlayerId: activePlayer?.id,
    activePlayerName: activePlayer?.name,
    activePlayerHandSize: activePlayer?.hand.length,
  }
}

export function summarizeGameAction(action: { type: string; playerId: string }) {
  return {
    type: action.type,
    playerId: action.playerId,
  }
}
