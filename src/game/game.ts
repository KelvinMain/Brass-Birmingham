import type { PlayerCount, StandardCard } from './cards'
import { createBoardState } from './board'
import type { BoardState, IndustryTilePlacement } from './board'
import { createDrawableStacks, getDeckForPlayerCount, HAND_LIMIT, shuffleDeck } from './deck'
import type { DrawableStacks, GameCard } from './deck'
import { applyEraScoring } from './eraScoring'

export const playerColors = ['white', 'red', 'purple', 'yellow'] as const
const MIN_INCOME_TRACK = 0
const MAX_INCOME_TRACK = 99
const STARTING_INCOME_TRACK = 10

export type PlayerColor = (typeof playerColors)[number]
export type Era = 'canal' | 'rail'
export type GameStatus = 'playing' | 'ended'

export type PassTurnOptions = {
  railDeck?: StandardCard[]
}

export type LocalPlayer = {
  id: string
  name: string
  color: PlayerColor
  hand: GameCard[]
  handLimit: typeof HAND_LIMIT
  money: number
  moneySpentThisRound: number
  victoryPoints: number
  income: number
  flippedPlayerBoardTileIds: string[]
}

export type GameState = {
  playerCount: PlayerCount
  players: LocalPlayer[]
  stacks: DrawableStacks
  discardPile: GameCard[]
  board: BoardState
  developedIndustries: IndustryTilePlacement[]
  outdatedIndustries: IndustryTilePlacement[]
  era: Era
  status: GameStatus
  activePlayerIndex: number
  roundNumber: number
  turnsTakenThisRound: number
  turnStartHandCount: number
}

export function getIncomeMoneyDelta(income: number): number {
  const clampedIncome = Math.min(MAX_INCOME_TRACK, Math.max(MIN_INCOME_TRACK, Math.trunc(income)))

  if (clampedIncome <= 10) {
    return clampedIncome - 10
  }

  if (clampedIncome <= 30) {
    return Math.ceil((clampedIncome - 10) / 2)
  }

  if (clampedIncome <= 60) {
    return 11 + Math.floor((clampedIncome - 31) / 3)
  }

  if (clampedIncome <= 96) {
    return 21 + Math.floor((clampedIncome - 61) / 4)
  }

  return 30
}

function clampIncome(income: number): number {
  return Math.min(MAX_INCOME_TRACK, Math.max(MIN_INCOME_TRACK, Math.trunc(income)))
}

export function getRequiredEndTurnHandSize(game: GameState): number {
  if (game.era === 'canal' && game.roundNumber === 1) {
    return HAND_LIMIT - 1
  }

  return Math.max(0, game.turnStartHandCount - 2)
}

export function getActionsPerTurn(game: GameState): number {
  const activePlayer = game.players[game.activePlayerIndex]

  if (!activePlayer) {
    return 0
  }

  return Math.max(0, activePlayer.hand.length - getRequiredEndTurnHandSize(game))
}

export function getTurnOrderSpendLabel(game: GameState, playerIndex: number): string {
  const player = game.players[playerIndex]

  if (!player || playerIndex > game.activePlayerIndex) {
    return ''
  }

  return String(player.moneySpentThisRound)
}

function drawStandardCardsToHand(
  hand: GameCard[],
  standardStack: StandardCard[],
): {
  hand: GameCard[]
  standard: StandardCard[]
} {
  const missingCardCount = Math.max(0, HAND_LIMIT - hand.length)
  const drawnCards = standardStack.slice(0, missingCardCount)

  return {
    hand: [...hand, ...drawnCards],
    standard: standardStack.slice(drawnCards.length),
  }
}

function applyRoundIncome(players: LocalPlayer[]): LocalPlayer[] {
  return players.map((player) => ({
    ...player,
    money: player.money + getIncomeMoneyDelta(player.income),
  }))
}

function orderPlayersForNextRound(players: LocalPlayer[]): LocalPlayer[] {
  return players
    .map((player, previousOrderIndex) => ({
      player,
      previousOrderIndex,
    }))
    .sort(
      (left, right) =>
        left.player.moneySpentThisRound - right.player.moneySpentThisRound ||
        left.previousOrderIndex - right.previousOrderIndex,
    )
    .map(({ player }) => ({
      ...player,
      moneySpentThisRound: 0,
    }))
}

function areStandardCardsAndHandsExhausted(game: GameState): boolean {
  return game.stacks.standard.length === 0 && game.players.every((player) => player.hand.length === 0)
}

function dealRailEraCards(game: GameState, railDeck: StandardCard[]): GameState {
  let nextStandardCardIndex = 0
  const players = game.players.map((player) => {
    const hand = railDeck.slice(nextStandardCardIndex, nextStandardCardIndex + HAND_LIMIT)
    nextStandardCardIndex += HAND_LIMIT

    return {
      ...player,
      hand,
    }
  })

  return {
    ...game,
    era: 'rail',
    status: 'playing',
    players,
    stacks: {
      ...game.stacks,
      standard: railDeck.slice(nextStandardCardIndex),
    },
    discardPile: [],
    activePlayerIndex: 0,
    turnsTakenThisRound: 0,
    turnStartHandCount: players[0]?.hand.length ?? 0,
  }
}

function completeRound(game: GameState, options: PassTurnOptions): GameState {
  if (areStandardCardsAndHandsExhausted(game)) {
    const afterScoring = applyEraScoring(game, game.era)

    if (afterScoring.era === 'rail') {
      return {
        ...afterScoring,
        status: 'ended',
        activePlayerIndex: 0,
        turnsTakenThisRound: 0,
        turnStartHandCount: 0,
      }
    }

    const railDeck = options.railDeck ?? shuffleDeck(getDeckForPlayerCount(game.playerCount))

    return dealRailEraCards(
      {
        ...afterScoring,
        players: orderPlayersForNextRound(applyRoundIncome(afterScoring.players)),
        roundNumber: afterScoring.roundNumber + 1,
      },
      railDeck,
    )
  }

  const players = orderPlayersForNextRound(applyRoundIncome(game.players))

  return {
    ...game,
    players,
    activePlayerIndex: 0,
    roundNumber: game.roundNumber + 1,
    turnsTakenThisRound: 0,
    turnStartHandCount: players[0]?.hand.length ?? 0,
  }
}

export function passTurn(game: GameState, options: PassTurnOptions = {}): GameState {
  if (game.status === 'ended') {
    return game
  }

  const activePlayer = game.players[game.activePlayerIndex]

  if (!activePlayer || activePlayer.hand.length !== getRequiredEndTurnHandSize(game)) {
    return game
  }

  const refill = drawStandardCardsToHand(activePlayer.hand, game.stacks.standard)
  const players = game.players.map((player, index) =>
    index === game.activePlayerIndex
      ? {
          ...player,
          hand: refill.hand,
        }
      : player,
  )
  const activePlayerIndex = (game.activePlayerIndex + 1) % game.playerCount
  const turnsTakenThisRound = game.turnsTakenThisRound + 1
  const nextGame = {
    ...game,
    players,
    stacks: {
      ...game.stacks,
      standard: refill.standard,
    },
    activePlayerIndex,
    turnsTakenThisRound,
    turnStartHandCount: players[activePlayerIndex]?.hand.length ?? 0,
  }

  return turnsTakenThisRound >= game.playerCount ? completeRound(nextGame, options) : nextGame
}

export function createGameState(
  playerCount: PlayerCount,
  standardDeck: StandardCard[] = getDeckForPlayerCount(playerCount),
  random?: () => number,
): GameState {
  const players: LocalPlayer[] = Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: `Player ${index + 1}`,
    color: playerColors[index],
    hand: [],
    handLimit: HAND_LIMIT,
    money: 17,
    moneySpentThisRound: 0,
    victoryPoints: 0,
    income: STARTING_INCOME_TRACK,
    flippedPlayerBoardTileIds: [],
  }))
  const stacks = createDrawableStacks(playerCount)
  let nextStandardCardIndex = 0
  const playersWithStartingHands = players.map((player) => {
    const hand = standardDeck.slice(nextStandardCardIndex, nextStandardCardIndex + HAND_LIMIT)
    nextStandardCardIndex += HAND_LIMIT

    return {
      ...player,
      hand,
    }
  })
  const discardPile = standardDeck.slice(
    nextStandardCardIndex,
    nextStandardCardIndex + playerCount,
  )

  return {
    playerCount,
    players: playersWithStartingHands,
    stacks: {
      ...stacks,
      standard: standardDeck.slice(nextStandardCardIndex + playerCount),
    },
    discardPile,
    board: createBoardState(playerCount, random),
    developedIndustries: [],
    outdatedIndustries: [],
    era: 'canal',
    status: 'playing',
    activePlayerIndex: 0,
    roundNumber: 1,
    turnsTakenThisRound: 0,
    turnStartHandCount: HAND_LIMIT,
  }
}

export function developIndustryTile(
  game: GameState,
  tile: IndustryTilePlacement,
): GameState {
  return {
    ...game,
    developedIndustries: [...game.developedIndustries, tile],
  }
}

export function removeDevelopedIndustryTile(game: GameState, tileId: string): GameState {
  return {
    ...game,
    developedIndustries: game.developedIndustries.filter((tile) => tile.id !== tileId),
  }
}

export function flipDevelopedIndustryTile(game: GameState, tileId: string): GameState {
  if (!game.developedIndustries.some((tile) => tile.id === tileId)) {
    return game
  }

  return {
    ...game,
    developedIndustries: game.developedIndustries.map((tile) =>
      tile.id === tileId
        ? {
            ...tile,
            flipped: !tile.flipped,
          }
        : tile,
    ),
  }
}

export function outdateIndustryTile(game: GameState, tile: IndustryTilePlacement): GameState {
  return {
    ...game,
    outdatedIndustries: [...game.outdatedIndustries, tile],
  }
}

export function removeOutdatedIndustryTile(game: GameState, tileId: string): GameState {
  return {
    ...game,
    outdatedIndustries: game.outdatedIndustries.filter((tile) => tile.id !== tileId),
  }
}

export function flipOutdatedIndustryTile(game: GameState, tileId: string): GameState {
  if (!game.outdatedIndustries.some((tile) => tile.id === tileId)) {
    return game
  }

  return {
    ...game,
    outdatedIndustries: game.outdatedIndustries.map((tile) =>
      tile.id === tileId
        ? {
            ...tile,
            flipped: !tile.flipped,
          }
        : tile,
    ),
  }
}

export function flipPlayerBoardIndustryTile(
  game: GameState,
  playerId: string,
  tileId: string,
): GameState {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)

  if (!player) {
    return game
  }

  return player.flippedPlayerBoardTileIds.includes(tileId)
    ? consumeFlippedPlayerBoardIndustryTile(game, playerId, tileId)
    : restoreFlippedPlayerBoardIndustryTile(game, playerId, tileId)
}

export function consumeFlippedPlayerBoardIndustryTile(
  game: GameState,
  playerId: string,
  tileId: string,
): GameState {
  const player = game.players.find((currentPlayer) => currentPlayer.id === playerId)
  const tileIndex = player?.flippedPlayerBoardTileIds.indexOf(tileId) ?? -1

  if (!player || tileIndex === -1) {
    return game
  }

  return {
    ...game,
    players: game.players.map((currentPlayer) =>
      currentPlayer.id === playerId
        ? {
            ...currentPlayer,
            flippedPlayerBoardTileIds: currentPlayer.flippedPlayerBoardTileIds.filter(
              (_, index) => index !== tileIndex,
            ),
          }
        : currentPlayer,
    ),
  }
}

export function restoreFlippedPlayerBoardIndustryTile(
  game: GameState,
  playerId: string,
  tileId: string,
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
            flippedPlayerBoardTileIds: [...player.flippedPlayerBoardTileIds, tileId],
          }
        : player,
    ),
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
            [field]: field === 'income' ? clampIncome(player.income + delta) : player[field] + delta,
          }
        : player,
    ),
  }
}

export function updatePlayerMoney(game: GameState, playerId: string, delta: number): GameState {
  if (!game.players.some((player) => player.id === playerId)) {
    return game
  }

  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            money: player.money + delta,
          }
        : player,
    ),
  }
}

export function updatePlayerRoundSpending(
  game: GameState,
  playerId: string,
  delta: number,
): GameState {
  if (!game.players.some((player) => player.id === playerId)) {
    return game
  }

  return {
    ...game,
    players: game.players.map((player) => {
      if (player.id !== playerId) {
        return player
      }

      const moneySpentThisRound = Math.max(0, player.moneySpentThisRound + delta)
      const spendingDelta = moneySpentThisRound - player.moneySpentThisRound

      return {
        ...player,
        moneySpentThisRound,
        money: player.money - spendingDelta,
      }
    }),
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
