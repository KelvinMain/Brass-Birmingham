export type LocalGameMode = 'hotseat' | 'vsAi'

export const HUMAN_PLAYER_INDEX = 0
export const HUMAN_PLAYER_ID = 'player-1'

export function isAiPlayerId(playerId: string | undefined, gameMode: LocalGameMode | null): boolean {
  return gameMode === 'vsAi' && playerId !== HUMAN_PLAYER_ID
}

export function isHumanPlayerId(playerId: string | undefined, gameMode: LocalGameMode | null): boolean {
  return gameMode !== 'vsAi' || playerId === HUMAN_PLAYER_ID
}

export function isAiPlayerIndex(playerIndex: number, gameMode: LocalGameMode | null): boolean {
  return gameMode === 'vsAi' && playerIndex !== HUMAN_PLAYER_INDEX
}

export function isHumanPlayerIndex(playerIndex: number, gameMode: LocalGameMode | null): boolean {
  return gameMode !== 'vsAi' || playerIndex === HUMAN_PLAYER_INDEX
}
