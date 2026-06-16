import type { GameState, LocalPlayer } from '../game/game'

export type SelectedPlayerView = {
  turnPlayer: LocalPlayer | undefined
  viewedPlayer: LocalPlayer | undefined
  viewedPlayerIndex: number
}

export function selectPlayerView(
  game: GameState | null,
  onlinePlayerId: string | null,
): SelectedPlayerView {
  const turnPlayerIndex = game?.activePlayerIndex ?? 0
  const turnPlayer = game?.players[turnPlayerIndex]
  const onlinePlayerIndex = onlinePlayerId
    ? (game?.players.findIndex((player) => player.id === onlinePlayerId) ?? -1)
    : -1
  const viewedPlayerIndex = onlinePlayerIndex >= 0 ? onlinePlayerIndex : turnPlayerIndex

  return {
    turnPlayer,
    viewedPlayer: game?.players[viewedPlayerIndex],
    viewedPlayerIndex,
  }
}
