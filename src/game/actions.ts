import {
  flipIndustryTile,
  moveIndustryTile,
  moveLinkTile,
  moveResourceCubeToBeer,
  moveResourceCubeToMarket,
  placeIndustryResourceCube,
  placeIndustryTile,
  placeLinkTile,
  removeBeerResourceCube,
  removeIndustryResourceCube,
  removeIndustryTile,
  removeLinkTile,
  removeMarketResourceCube,
} from './board'
import type { IndustryTilePlacement, LinkTilePlacement, MarketResourcePlacement } from './board'
import { addCardToHand, drawFromStack } from './deck'
import type { DrawableStacks } from './deck'
import {
  consumeFlippedPlayerBoardIndustryTile,
  developIndustryTile,
  discardCardFromPlayerHand,
  flipDevelopedIndustryTile,
  flipOutdatedIndustryTile,
  flipPlayerBoardIndustryTile,
  outdateIndustryTile,
  passTurn,
  removeDevelopedIndustryTile,
  removeOutdatedIndustryTile,
  restoreFlippedPlayerBoardIndustryTile,
  updatePlayerMoney,
  updatePlayerRoundSpending,
  updatePlayerScore,
} from './game'
import type { GameState, PassTurnOptions } from './game'

type WildStackKey = Exclude<keyof DrawableStacks, 'standard'>

type ResourceSource = {
  beerSpaceId?: string
  industrySpaceId?: string
  marketSpaceId?: string
}

type IndustrySidebarArea = 'developed' | 'outdated'

export type GameAction =
  | { type: 'pass-turn'; playerId: string; passTurnOptions?: PassTurnOptions }
  | { type: 'discard-card'; playerId: string; cardId: string }
  | { type: 'draw-wild-card'; playerId: string; stack: WildStackKey }
  | {
      type: 'update-player-score'
      playerId: string
      targetPlayerId?: string
      field: 'victoryPoints' | 'income'
      delta: number
    }
  | { type: 'update-player-money'; playerId: string; delta: number }
  | { type: 'update-player-round-spending'; playerId: string; delta: number }
  | {
      type: 'place-industry-tile'
      playerId: string
      spaceId: string
      tile: IndustryTilePlacement
      sourceSidebarArea?: IndustrySidebarArea
      sourcePlayerBoardPlayerId?: string
      sourcePlayerBoardTileId?: string
    }
  | {
      type: 'move-industry-tile'
      playerId: string
      sourceSpaceId: string
      targetSpaceId: string
      tile: IndustryTilePlacement
    }
  | { type: 'remove-industry-tile'; playerId: string; spaceId: string }
  | { type: 'flip-industry-tile'; playerId: string; spaceId: string }
  | { type: 'place-link-tile'; playerId: string; spaceId: string; tile: LinkTilePlacement }
  | {
      type: 'move-link-tile'
      playerId: string
      sourceSpaceId: string
      targetSpaceId: string
      tile: LinkTilePlacement
    }
  | { type: 'remove-link-tile'; playerId: string; spaceId: string }
  | {
      type: 'place-industry-resource'
      playerId: string
      spaceId: string
      cube: MarketResourcePlacement
      source?: ResourceSource
    }
  | {
      type: 'move-resource-to-market'
      playerId: string
      spaceId: string
      cube: MarketResourcePlacement
      source?: Pick<ResourceSource, 'industrySpaceId' | 'marketSpaceId'>
    }
  | {
      type: 'move-resource-to-beer'
      playerId: string
      spaceId: string
      cube: MarketResourcePlacement
      source?: ResourceSource
    }
  | { type: 'remove-market-resource'; playerId: string; spaceId: string }
  | { type: 'remove-beer-resource'; playerId: string; spaceId: string }
  | { type: 'remove-industry-resource'; playerId: string; spaceId: string; cubeId: string }
  | {
      type: 'develop-industry-tile'
      playerId: string
      tile: IndustryTilePlacement
      sourceSpaceId?: string
      sourcePlayerBoardPlayerId?: string
      sourcePlayerBoardTileId?: string
    }
  | {
      type: 'outdate-industry-tile'
      playerId: string
      tile: IndustryTilePlacement
      sourceSpaceId?: string
      sourcePlayerBoardPlayerId?: string
      sourcePlayerBoardTileId?: string
    }
  | {
      type: 'return-industry-tile-to-player-board'
      playerId: string
      tile: IndustryTilePlacement
      sourceSidebarArea?: IndustrySidebarArea
      sourceSpaceId?: string
    }
  | { type: 'remove-developed-industry-tile'; playerId: string; tileId: string }
  | { type: 'flip-developed-industry-tile'; playerId: string; tileId: string }
  | { type: 'flip-outdated-industry-tile'; playerId: string; tileId: string }
  | { type: 'flip-player-board-industry-tile'; playerId: string; tileId: string }
  | { type: 'consume-flipped-player-board-industry-tile'; playerId: string; tileId: string }
  | { type: 'restore-flipped-player-board-industry-tile'; playerId: string; tileId: string }

function activePlayerId(game: GameState): string | undefined {
  return game.players[game.activePlayerIndex]?.id
}

export function canPlayerSubmitAction(
  game: GameState,
  submittingPlayerId: string,
  action: GameAction,
): boolean {
  return game.status === 'playing' && activePlayerId(game) === submittingPlayerId && action.playerId === submittingPlayerId
}

function removeResourceSource(
  game: GameState,
  source: ResourceSource | undefined,
  cubeId: string,
): GameState {
  if (!source) {
    return game
  }

  if (source.marketSpaceId) {
    return {
      ...game,
      board: removeMarketResourceCube(game.board, source.marketSpaceId),
    }
  }

  if (source.beerSpaceId) {
    return {
      ...game,
      board: removeBeerResourceCube(game.board, source.beerSpaceId),
    }
  }

  if (source.industrySpaceId) {
    return {
      ...game,
      board: removeIndustryResourceCube(game.board, source.industrySpaceId, cubeId),
    }
  }

  return game
}

function removeSidebarIndustrySource(
  game: GameState,
  sourceSidebarArea: IndustrySidebarArea | undefined,
  tileId: string,
): GameState {
  if (sourceSidebarArea === 'developed') {
    return removeDevelopedIndustryTile(game, tileId)
  }

  if (sourceSidebarArea === 'outdated') {
    return removeOutdatedIndustryTile(game, tileId)
  }

  return game
}

function consumePlayerBoardFlippedSource(
  game: GameState,
  tile: IndustryTilePlacement,
  sourcePlayerBoardPlayerId?: string,
  sourcePlayerBoardTileId?: string,
): GameState {
  return tile.flipped && sourcePlayerBoardPlayerId && sourcePlayerBoardTileId
    ? consumeFlippedPlayerBoardIndustryTile(game, sourcePlayerBoardPlayerId, sourcePlayerBoardTileId)
    : game
}

export function applyGameAction(game: GameState, action: GameAction): GameState {
  if (!canPlayerSubmitAction(game, action.playerId, action)) {
    return game
  }

  switch (action.type) {
    case 'pass-turn':
      return passTurn(game, action.passTurnOptions)
    case 'discard-card':
      return discardCardFromPlayerHand(game, action.playerId, action.cardId)
    case 'draw-wild-card': {
      const player = game.players.find((currentPlayer) => currentPlayer.id === action.playerId)

      if (action.stack === 'wildLocation') {
        const result = drawFromStack(game.stacks.wildLocation)

        if (!player || !result.drawn) {
          return game
        }

        const drawnCard = result.drawn

        return {
          ...game,
          players: game.players.map((currentPlayer) =>
            currentPlayer.id === action.playerId
              ? {
                  ...currentPlayer,
                  hand: addCardToHand(currentPlayer.hand, drawnCard),
                }
              : currentPlayer,
          ),
          stacks: {
            ...game.stacks,
            wildLocation: result.remaining,
          },
        }
      }

      const result = drawFromStack(game.stacks.wildIndustry)

      if (!player || !result.drawn) {
        return game
      }

      const drawnCard = result.drawn

      return {
        ...game,
        players: game.players.map((currentPlayer) =>
          currentPlayer.id === action.playerId
            ? {
                ...currentPlayer,
                hand: addCardToHand(currentPlayer.hand, drawnCard),
              }
            : currentPlayer,
        ),
        stacks: {
          ...game.stacks,
          wildIndustry: result.remaining,
        },
      }
    }
    case 'update-player-score':
      return updatePlayerScore(game, action.targetPlayerId ?? action.playerId, action.field, action.delta)
    case 'update-player-money':
      return updatePlayerMoney(game, action.playerId, action.delta)
    case 'update-player-round-spending':
      return updatePlayerRoundSpending(game, action.playerId, action.delta)
    case 'place-industry-tile': {
      const withBoard = {
        ...game,
        board: placeIndustryTile(game.board, action.spaceId, action.tile),
      }
      const withoutDevelopedSource =
        withBoard.board !== game.board && action.sourceSidebarArea
          ? removeSidebarIndustrySource(withBoard, action.sourceSidebarArea, action.tile.id)
          : withBoard

      return consumePlayerBoardFlippedSource(
        withoutDevelopedSource,
        action.tile,
        action.sourcePlayerBoardPlayerId,
        action.sourcePlayerBoardTileId,
      )
    }
    case 'move-industry-tile':
      return {
        ...game,
        board: moveIndustryTile(game.board, action.sourceSpaceId, action.targetSpaceId, action.tile),
      }
    case 'remove-industry-tile':
      return {
        ...game,
        board: removeIndustryTile(game.board, action.spaceId),
      }
    case 'flip-industry-tile':
      return {
        ...game,
        board: flipIndustryTile(game.board, action.spaceId),
      }
    case 'place-link-tile':
      return {
        ...game,
        board: placeLinkTile(game.board, action.spaceId, action.tile),
      }
    case 'move-link-tile':
      return {
        ...game,
        board: moveLinkTile(game.board, action.sourceSpaceId, action.targetSpaceId, action.tile),
      }
    case 'remove-link-tile':
      return {
        ...game,
        board: removeLinkTile(game.board, action.spaceId),
      }
    case 'place-industry-resource': {
      const board = placeIndustryResourceCube(game.board, action.spaceId, action.cube)
      return removeResourceSource({ ...game, board }, action.source, action.cube.id)
    }
    case 'move-resource-to-market':
      return {
        ...game,
        board: moveResourceCubeToMarket(game.board, action.spaceId, action.cube, action.source),
      }
    case 'move-resource-to-beer':
      return {
        ...game,
        board: moveResourceCubeToBeer(game.board, action.spaceId, action.cube, action.source),
      }
    case 'remove-market-resource':
      return {
        ...game,
        board: removeMarketResourceCube(game.board, action.spaceId),
      }
    case 'remove-beer-resource':
      return {
        ...game,
        board: removeBeerResourceCube(game.board, action.spaceId),
      }
    case 'remove-industry-resource':
      return {
        ...game,
        board: removeIndustryResourceCube(game.board, action.spaceId, action.cubeId),
      }
    case 'develop-industry-tile': {
      const withRemovedSource = action.sourceSpaceId
        ? {
            ...game,
            board: removeIndustryTile(game.board, action.sourceSpaceId),
          }
        : game
      const withDevelopedTile = developIndustryTile(withRemovedSource, action.tile)

      return consumePlayerBoardFlippedSource(
        withDevelopedTile,
        action.tile,
        action.sourcePlayerBoardPlayerId,
        action.sourcePlayerBoardTileId,
      )
    }
    case 'outdate-industry-tile': {
      const withRemovedSource = action.sourceSpaceId
        ? {
            ...game,
            board: removeIndustryTile(game.board, action.sourceSpaceId),
          }
        : game
      const withOutdatedTile = outdateIndustryTile(withRemovedSource, action.tile)

      return consumePlayerBoardFlippedSource(
        withOutdatedTile,
        action.tile,
        action.sourcePlayerBoardPlayerId,
        action.sourcePlayerBoardTileId,
      )
    }
    case 'return-industry-tile-to-player-board': {
      const withRemovedSource = action.sourceSidebarArea
        ? removeSidebarIndustrySource(game, action.sourceSidebarArea, action.tile.id)
        : action.sourceSpaceId
          ? {
              ...game,
              board: removeIndustryTile(game.board, action.sourceSpaceId),
            }
          : game

      return action.tile.flipped && action.tile.tileId
        ? restoreFlippedPlayerBoardIndustryTile(withRemovedSource, action.tile.ownerId, action.tile.tileId)
        : withRemovedSource
    }
    case 'remove-developed-industry-tile':
      return removeDevelopedIndustryTile(game, action.tileId)
    case 'flip-developed-industry-tile':
      return flipDevelopedIndustryTile(game, action.tileId)
    case 'flip-outdated-industry-tile':
      return flipOutdatedIndustryTile(game, action.tileId)
    case 'flip-player-board-industry-tile':
      return flipPlayerBoardIndustryTile(game, action.playerId, action.tileId)
    case 'consume-flipped-player-board-industry-tile':
      return consumeFlippedPlayerBoardIndustryTile(game, action.playerId, action.tileId)
    case 'restore-flipped-player-board-industry-tile':
      return restoreFlippedPlayerBoardIndustryTile(game, action.playerId, action.tileId)
  }
}
