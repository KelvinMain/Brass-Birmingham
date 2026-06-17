export type LocalGameMode = 'hotseat' | 'vsAi'

export const HUMAN_PLAYER_INDEX = 0

export function isAiPlayerIndex(playerIndex: number, gameMode: LocalGameMode | null): boolean {
  return gameMode === 'vsAi' && playerIndex !== HUMAN_PLAYER_INDEX
}

export function isHumanPlayerIndex(playerIndex: number, gameMode: LocalGameMode | null): boolean {
  return gameMode !== 'vsAi' || playerIndex === HUMAN_PLAYER_INDEX
}
