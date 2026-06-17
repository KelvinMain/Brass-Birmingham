import type { GameState, LocalPlayer } from '../game/game'
import type { LocalGameMode } from '../game/gameMode'
import { HUMAN_PLAYER_INDEX } from '../game/gameMode'

export type SelectedPlayerView = {
  turnPlayer: LocalPlayer | undefined
  viewedPlayer: LocalPlayer | undefined
  viewedPlayerIndex: number
}

export function selectPlayerView(
  game: GameState | null,
  onlinePlayerId: string | null,
  localGameMode: LocalGameMode | null = null,
): SelectedPlayerView {
  const turnPlayerIndex = game?.activePlayerIndex ?? 0
  const turnPlayer = game?.players[turnPlayerIndex]
  const onlinePlayerIndex = onlinePlayerId
    ? (game?.players.findIndex((player) => player.id === onlinePlayerId) ?? -1)
    : -1
  const viewedPlayerIndex =
    onlinePlayerIndex >= 0
      ? onlinePlayerIndex
      : localGameMode === 'vsAi'
        ? HUMAN_PLAYER_INDEX
        : turnPlayerIndex

  return {
    turnPlayer,
    viewedPlayer: game?.players[viewedPlayerIndex],
    viewedPlayerIndex,
  }
}
