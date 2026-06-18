import {
  industrySpaces,
  linkSpaces,
  removeIndustryTile,
  removeLinkTile,
} from './board'
import type { BoardState, LinkKind, LinkSpace } from './board'
import type { Era, GameState } from './game'
import { outdateIndustryTile, updatePlayerScore } from './game'
import {
  getPlayerBoardIndustryTileRule,
  playerBoardIndustryTiles,
} from './playerBoard'

export const merchantCitiesWithLinkSymbols = [
  'Shrewsbury',
  'Warrington',
  'Nottingham',
  'Oxford',
  'Gloucester',
] as const

export const MERCHANT_CITY_LINK_SYMBOLS = 2

function getIndustrySpaceCity(spaceId: string): string {
  return industrySpaces.find((space) => space.id === spaceId)?.city ?? spaceId
}

function getLinkSpace(spaceId: string): LinkSpace | undefined {
  return linkSpaces.find((space) => space.id === spaceId)
}

export function getLinkLocations(linkSpace: LinkSpace): string[] {
  const locations = [linkSpace.from, linkSpace.to]

  if (linkSpace.via) {
    locations.push(linkSpace.via)
  }

  return [...new Set(locations)]
}

export function countLinkSymbolsAtLocation(board: BoardState, location: string): number {
  let count = merchantCitiesWithLinkSymbols.includes(
    location as (typeof merchantCitiesWithLinkSymbols)[number],
  )
    ? MERCHANT_CITY_LINK_SYMBOLS
    : 0

  for (const [spaceId, placement] of Object.entries(board.industryPlacements)) {
    if (!placement.flipped || !placement.tileId) {
      continue
    }

    if (getIndustrySpaceCity(spaceId) !== location) {
      continue
    }

    count += getPlayerBoardIndustryTileRule(placement.tileId)?.linkSymbols ?? 0
  }

  return count
}

export function scoreLinkVictoryPoints(
  board: BoardState,
  playerId: string,
  linkKind: LinkKind,
): number {
  let victoryPoints = 0

  for (const [spaceId, placement] of Object.entries(board.linkPlacements)) {
    if (placement.ownerId !== playerId || placement.kind !== linkKind) {
      continue
    }

    const linkSpace = getLinkSpace(spaceId)

    if (!linkSpace) {
      continue
    }

    for (const location of getLinkLocations(linkSpace)) {
      victoryPoints += countLinkSymbolsAtLocation(board, location)
    }
  }

  return victoryPoints
}

export function scoreFlippedIndustryVictoryPoints(board: BoardState, playerId: string): number {
  let victoryPoints = 0

  for (const placement of Object.values(board.industryPlacements)) {
    if (placement.ownerId !== playerId || !placement.flipped || !placement.tileId) {
      continue
    }

    victoryPoints += getPlayerBoardIndustryTileRule(placement.tileId)?.victoryPoints ?? 0
  }

  return victoryPoints
}

export function removeScoredLinkTiles(board: BoardState, linkKind: LinkKind): BoardState {
  let nextBoard = board

  for (const [spaceId, placement] of Object.entries(board.linkPlacements)) {
    if (placement.kind !== linkKind) {
      continue
    }

    nextBoard = removeLinkTile(nextBoard, spaceId)
  }

  return nextBoard
}

export function removeLevelOneIndustriesFromBoard(game: GameState): GameState {
  let board = game.board
  let outdatedIndustries = game.outdatedIndustries

  for (const [spaceId, placement] of Object.entries(game.board.industryPlacements)) {
    const tileLevel = playerBoardIndustryTiles.find((tile) => tile.id === placement.tileId)?.level

    if (tileLevel !== 1) {
      continue
    }

    outdatedIndustries = [...outdatedIndustries, placement]
    board = removeIndustryTile(board, spaceId)
  }

  return {
    ...game,
    board,
    outdatedIndustries,
  }
}

export type EraScoringBreakdown = {
  playerId: string
  linkVictoryPoints: number
  industryVictoryPoints: number
}

export function getEraScoringBreakdown(game: GameState, scoringEra: Era): EraScoringBreakdown[] {
  const linkKind: LinkKind = scoringEra === 'canal' ? 'canal' : 'rail'

  return game.players.map((player) => {
    const linkVictoryPoints = scoreLinkVictoryPoints(game.board, player.id, linkKind)
    const industryVictoryPoints = scoreFlippedIndustryVictoryPoints(game.board, player.id)

    return {
      playerId: player.id,
      linkVictoryPoints,
      industryVictoryPoints,
    }
  })
}

export function applyEraScoring(game: GameState, scoringEra: Era): GameState {
  const linkKind: LinkKind = scoringEra === 'canal' ? 'canal' : 'rail'
  let nextGame = game

  for (const breakdown of getEraScoringBreakdown(game, scoringEra)) {
    const totalVictoryPoints = breakdown.linkVictoryPoints + breakdown.industryVictoryPoints

    if (totalVictoryPoints > 0) {
      nextGame = updatePlayerScore(
        nextGame,
        breakdown.playerId,
        'victoryPoints',
        totalVictoryPoints,
      )
    }
  }

  nextGame = {
    ...nextGame,
    board: removeScoredLinkTiles(nextGame.board, linkKind),
  }

  if (scoringEra === 'canal') {
    nextGame = removeLevelOneIndustriesFromBoard(nextGame)
  }

  return nextGame
}
