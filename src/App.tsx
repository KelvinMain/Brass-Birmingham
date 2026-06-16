import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import './App.css'

import type { Industry, PlayerCount } from './game/cards'
import {
  beerResourceSpaces,
  boardControlSpaces,
  flipIndustryTile,
  getVisibleMerchantTilePlacements,
  industrySpaces,
  incomeTrackSpaces,
  linkSpaces,
  marketResourceSpaces,
  merchantTileSpaces,
  moveIndustryTile,
  moveLinkTile,
  moveResourceCubeToBeer,
  moveResourceCubeToMarket,
  placeIndustryResourceCube,
  placeIndustryTile,
  placeLinkTile,
  removeBeerResourceCube,
  removeIndustryTile,
  removeIndustryResourceCube,
  removeLinkTile,
  removeMarketResourceCube,
  resourceCubeKinds,
} from './game/board'
import type {
  BeerResourceSpace,
  IndustryTilePlacement,
  LinkTilePlacement,
  MarketResourcePlacement,
  MarketResourceSpace,
} from './game/board'
import {
  addCardToHand,
  drawFromStack,
  getDeckForPlayerCount,
  HAND_LIMIT,
  shuffleDeck,
} from './game/deck'
import type { DrawableStacks, GameCard } from './game/deck'
import {
  createGameState,
  consumeFlippedPlayerBoardIndustryTile,
  developIndustryTile,
  discardCardFromPlayerHand,
  flipDevelopedIndustryTile,
  flipPlayerBoardIndustryTile,
  getRequiredEndTurnHandSize,
  getTurnOrderSpendLabel,
  passTurn,
  removeDevelopedIndustryTile,
  restoreFlippedPlayerBoardIndustryTile,
  updatePlayerMoney,
  updatePlayerRoundSpending,
  updatePlayerScore,
} from './game/game'
import type { GameState, PlayerColor } from './game/game'
import {
  getPlayerBoardTileCount,
  getPlayerBoardAssetColor,
  isPlayerBoardIndustryTileUsable,
  isPlayerBoardTileDevelopable,
  playerBoardIndustryTiles,
} from './game/playerBoard'
import type { PlayerBoardTileAssetColor } from './game/playerBoard'

type CardStyle = CSSProperties & {
  '--card-face-image'?: string
  '--card-tint'?: string
}

type WildStackKey = Exclude<keyof DrawableStacks, 'standard'>

type BoardPieceStyle = CSSProperties & {
  '--industry-tile-image'?: string
  '--link-tile-image'?: string
  '--owner-color'?: string
  '--owner-text-color'?: string
}

const playerCounts: PlayerCount[] = [2, 3, 4]

const playerColorStyles = {
  white: {
    color: '#f6f1e7',
    text: '#17120d',
  },
  red: {
    color: '#b9413d',
    text: '#fff7ec',
  },
  blue: {
    color: '#2f68b8',
    text: '#fff7ec',
  },
  green: {
    color: '#3f8b4b',
    text: '#fff7ec',
  },
} satisfies Record<PlayerColor, { color: string; text: string }>

const resourceCubeColors = {
  coal: '#050505',
  iron: '#bd6638',
  beer: '#d7b15c',
} satisfies Record<(typeof resourceCubeKinds)[number], string>

const scannedCardFaceUrls = {
  'card-face-01': new URL('./assets/cards/scanned/faces/card-face-01.jpg', import.meta.url).href,
  'card-face-02': new URL('./assets/cards/scanned/faces/card-face-02.jpg', import.meta.url).href,
  'card-face-03': new URL('./assets/cards/scanned/faces/card-face-03.jpg', import.meta.url).href,
  'card-face-04': new URL('./assets/cards/scanned/faces/card-face-04.jpg', import.meta.url).href,
  'card-face-05': new URL('./assets/cards/scanned/faces/card-face-05.jpg', import.meta.url).href,
  'card-face-07': new URL('./assets/cards/scanned/faces/card-face-07.jpg', import.meta.url).href,
  'card-face-08': new URL('./assets/cards/scanned/faces/card-face-08.jpg', import.meta.url).href,
  'card-face-09': new URL('./assets/cards/scanned/faces/card-face-09.jpg', import.meta.url).href,
  'card-face-10': new URL('./assets/cards/scanned/faces/card-face-10.jpg', import.meta.url).href,
  'card-face-11': new URL('./assets/cards/scanned/faces/card-face-11.jpg', import.meta.url).href,
  'card-face-12': new URL('./assets/cards/scanned/faces/card-face-12.jpg', import.meta.url).href,
  'card-face-13': new URL('./assets/cards/scanned/faces/card-face-13.jpg', import.meta.url).href,
  'card-face-14': new URL('./assets/cards/scanned/faces/card-face-14.jpg', import.meta.url).href,
  'card-face-15': new URL('./assets/cards/scanned/faces/card-face-15.jpg', import.meta.url).href,
  'card-face-16': new URL('./assets/cards/scanned/faces/card-face-16.jpg', import.meta.url).href,
  'card-face-17': new URL('./assets/cards/scanned/faces/card-face-17.jpg', import.meta.url).href,
  'card-face-18': new URL('./assets/cards/scanned/faces/card-face-18.jpg', import.meta.url).href,
  'card-face-19': new URL('./assets/cards/scanned/faces/card-face-19.jpg', import.meta.url).href,
  'card-face-20': new URL('./assets/cards/scanned/faces/card-face-20.jpg', import.meta.url).href,
  'card-face-22': new URL('./assets/cards/scanned/faces/card-face-22.jpg', import.meta.url).href,
  'card-face-23': new URL('./assets/cards/scanned/faces/card-face-23.jpg', import.meta.url).href,
  'card-face-24': new URL('./assets/cards/scanned/faces/card-face-24.jpg', import.meta.url).href,
  'card-face-25': new URL('./assets/cards/scanned/faces/card-face-25.jpg', import.meta.url).href,
  'card-face-26': new URL('./assets/cards/scanned/faces/card-face-26.jpg', import.meta.url).href,
  'card-face-27': new URL('./assets/cards/scanned/faces/card-face-27.jpg', import.meta.url).href,
  'card-face-28': new URL('./assets/cards/scanned/faces/card-face-28.jpg', import.meta.url).href,
  'card-face-29': new URL('./assets/cards/scanned/faces/card-face-29.jpg', import.meta.url).href,
  'card-face-31': new URL('./assets/cards/scanned/faces/card-face-31.jpg', import.meta.url).href,
  'card-face-32': new URL('./assets/cards/scanned/faces/card-face-32.jpg', import.meta.url).href,
  'card-face-33': new URL('./assets/cards/scanned/faces/card-face-33.jpg', import.meta.url).href,
}

type ScannedCardFaceId = keyof typeof scannedCardFaceUrls

const scannedLocationFaces: Partial<Record<string, ScannedCardFaceId>> = {
  Belper: 'card-face-29',
  Birmingham: 'card-face-05',
  'Burton-on-Trent': 'card-face-10',
  Cannock: 'card-face-15',
  Coalbrookdale: 'card-face-25',
  Coventry: 'card-face-18',
  Derby: 'card-face-01',
  Dudley: 'card-face-20',
  Kidderminster: 'card-face-26',
  Leek: 'card-face-28',
  Nuneaton: 'card-face-33',
  Redditch: 'card-face-32',
  Stafford: 'card-face-14',
  Stoke: 'card-face-17',
  'Stoke-on-Trent': 'card-face-17',
  Stone: 'card-face-08',
  Tamworth: 'card-face-16',
  Uttoxeter: 'card-face-24',
  Walsall: 'card-face-09',
  Wolverhampton: 'card-face-11',
  Worcester: 'card-face-27',
}

const scannedIndustryFaces: Partial<Record<Industry, ScannedCardFaceId>> = {
  brewery: 'card-face-13',
  coal: 'card-face-19',
  cotton: 'card-face-04',
  iron: 'card-face-12',
  manufacturer: 'card-face-04',
  pottery: 'card-face-07',
}

const scannedCardFaceUrl = (faceId: ScannedCardFaceId) =>
  `url('${scannedCardFaceUrls[faceId]}')`

const playerBoardImageUrl = new URL('./assets/player-board/player-board-reference.png', import.meta.url).href
const playerBoardTileImageUrls = import.meta.glob('./assets/player-board/tiles/*/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>
const flippedPlayerBoardTileImageUrls = import.meta.glob(
  './assets/player-board/tiles-flipped/*/*.png',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
) as Record<string, string>

const getPlayerBoardTileImageUrl = (
  assetColor: PlayerBoardTileAssetColor,
  tileId: string,
  flipped = false,
) =>
  flipped
    ? flippedPlayerBoardTileImageUrls[
        `./assets/player-board/tiles-flipped/${assetColor}/${tileId}.png`
      ]
    : playerBoardTileImageUrls[`./assets/player-board/tiles/${assetColor}/${tileId}.png`]

const scannedLinkImageUrls = {
  purple: {
    canal: new URL('./assets/board/links/purple-ship.png', import.meta.url).href,
    rail: new URL('./assets/board/links/purple-train.png', import.meta.url).href,
  },
  red: {
    canal: new URL('./assets/board/links/red-boat.png', import.meta.url).href,
    rail: new URL('./assets/board/links/red-train.png', import.meta.url).href,
  },
  white: {
    canal: new URL('./assets/board/links/white-boat.png', import.meta.url).href,
    rail: new URL('./assets/board/links/white-train.png', import.meta.url).href,
  },
  yellow: {
    canal: new URL('./assets/board/links/yellow-boat.png', import.meta.url).href,
    rail: new URL('./assets/board/links/yellow-train.png', import.meta.url).href,
  },
}

type ScannedLinkAssetColor = keyof typeof scannedLinkImageUrls

const scannedLinkAssetColorByPlayerColor = {
  white: 'white',
  red: 'red',
  blue: 'purple',
  green: 'yellow',
} satisfies Record<PlayerColor, ScannedLinkAssetColor>

const getScannedLinkImageUrl = (
  playerColor: PlayerColor | undefined,
  kind: LinkTilePlacement['kind'],
) => scannedLinkImageUrls[playerColor ? scannedLinkAssetColorByPlayerColor[playerColor] : 'white'][kind]

type DragPayload =
  | {
      type: 'industry'
      tile: IndustryTilePlacement
      sourceDevelopedPlayerId?: string
      sourcePlayerBoardPlayerId?: string
      sourcePlayerBoardTileId?: string
      sourceSpaceId?: string
    }
  | {
      type: 'link'
      tile: LinkTilePlacement
      sourceSpaceId?: string
    }
  | {
      type: 'market-resource'
      cube: ResourceCubeDragPayload
    }
  | {
      type: 'income-marker'
      playerId: string
    }
  | {
      type: 'victory-point-marker'
      playerId: string
    }

type ResourceCubeDragPayload = Omit<MarketResourcePlacement, 'spaceId'> & {
  sourceBeerSpaceId?: string
  sourceIndustrySpaceId?: string
  sourceSpaceId?: string
}

function createShuffledGameState(playerCount: PlayerCount): GameState {
  return createGameState(playerCount, shuffleDeck(getDeckForPlayerCount(playerCount)))
}

function formatDiscardCard(card: GameCard): string {
  if (card.kind === 'location') {
    return card.name
  }

  if (card.kind === 'industry') {
    return card.industries.join(' / ')
  }

  return card.kind === 'wild-location' ? 'Wild location' : 'Wild industry'
}

function CardFace({ card }: { card: GameCard }) {
  if (card.kind === 'location') {
    const faceId = scannedLocationFaces[card.name]
    const style: CardStyle = {
      ...(faceId ? { '--card-face-image': scannedCardFaceUrl(faceId) } : {}),
      '--card-tint': card.color,
    }

    return (
      <article className="playing-card playing-card--location" style={style}>
        <div className="playing-card__image" aria-hidden="true" />
      </article>
    )
  }

  if (card.kind === 'industry') {
    const faceId = card.industries
      .map((industry) => scannedIndustryFaces[industry])
      .find(Boolean)
    const style: CardStyle = faceId
      ? {
          '--card-face-image': scannedCardFaceUrl(faceId),
        }
      : {}

    return (
      <article className="playing-card playing-card--industry" style={style}>
        <div className="playing-card__image" aria-hidden="true" />
      </article>
    )
  }

  const isLocationWild = card.kind === 'wild-location'

  return (
    <article
      className={`playing-card playing-card--wild ${
        isLocationWild ? 'playing-card--wild-location' : 'playing-card--wild-industry'
      }`}
      style={{
        '--card-face-image': scannedCardFaceUrl(isLocationWild ? 'card-face-02' : 'card-face-03'),
      } as CardStyle}
    >
      <div className="playing-card__image" aria-hidden="true" />
    </article>
  )
}

function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [turnStartSnapshot, setTurnStartSnapshot] = useState<GameState | null>(null)
  const boardMapRef = useRef<HTMLDivElement | null>(null)
  const calibratedIndustrySpaces = industrySpaces
  const calibratedLinkSpaces = linkSpaces
  const calibratedBoardControlSpaces = boardControlSpaces
  const [calibratedMarketResourceSpaces] = useState<MarketResourceSpace[]>(marketResourceSpaces)
  const [calibratedBeerResourceSpaces] = useState<BeerResourceSpace[]>(beerResourceSpaces)
  const calibratedMerchantTileSpaces = merchantTileSpaces
  const calibratedIncomeTrackSpaces = incomeTrackSpaces
  const calibratedPlayerBoardIndustryTiles = playerBoardIndustryTiles

  const activePlayerIndex = game?.activePlayerIndex ?? 0
  const activePlayer = game?.players[activePlayerIndex]
  const otherPlayers = game?.players.filter((_, index) => index !== activePlayerIndex) ?? []
  const isGameEnded = game?.status === 'ended'
  const activeEraLinkKind: LinkTilePlacement['kind'] = game?.era === 'rail' ? 'rail' : 'canal'
  const activeEraLinkLabel = activeEraLinkKind === 'canal' ? 'Canal era' : 'Rail era'
  const activeEraLinkImageUrl = getScannedLinkImageUrl(activePlayer?.color, activeEraLinkKind)
  const requiredEndTurnHandSize = game ? getRequiredEndTurnHandSize(game) : HAND_LIMIT
  const canPassTurn =
    Boolean(game && activePlayer && game.status === 'playing') &&
    activePlayer?.hand.length === requiredEndTurnHandSize
  const activePlayerBoardAssetColor = activePlayer
    ? getPlayerBoardAssetColor(activePlayer.color)
    : 'white'
  const getIndustryPlacementImageUrl = (placement?: IndustryTilePlacement) => {
    if (!placement?.tileId) {
      return undefined
    }

    const owner = game?.players.find((player) => player.id === placement.ownerId)
    const assetColor = owner ? getPlayerBoardAssetColor(owner.color) : 'white'

    return getPlayerBoardTileImageUrl(assetColor, placement.tileId, placement.flipped)
  }
  const getPlacedPlayerBoardTileCount = (playerId: string | undefined, tileId: string) =>
    game
      ? Object.values(game.board.industryPlacements).filter(
          (placement) => placement.ownerId === playerId && placement.tileId === tileId,
        ).length +
        (game.players
          .find((player) => player.id === playerId)
          ?.developedIndustries.filter((tile) => tile.tileId === tileId).length ?? 0)
      : 0
  const getRemainingPlayerBoardTileCount = (playerId: string | undefined, tileId: string) =>
    Math.max(0, getPlayerBoardTileCount(tileId) - getPlacedPlayerBoardTileCount(playerId, tileId))
  const activePlayerRemainingTileCounts = Object.fromEntries(
    playerBoardIndustryTiles.map((tile) => [
      tile.id,
      getRemainingPlayerBoardTileCount(activePlayer?.id, tile.id),
    ]),
  )
  const getLinkPlacementImageUrl = (placement?: LinkTilePlacement) => {
    if (!placement) {
      return undefined
    }

    const owner = game?.players.find((player) => player.id === placement.ownerId)

    return getScannedLinkImageUrl(owner?.color, placement.kind)
  }
  const visibleMerchantTilePlacements = game
    ? getVisibleMerchantTilePlacements(game.board)
    : {}
  const getPlayerPieceStyle = (ownerId: string | undefined): BoardPieceStyle => {
    const owner = game?.players.find((player) => player.id === ownerId)

    if (!owner) {
      return {}
    }

    return {
      '--owner-color': playerColorStyles[owner.color].color,
      '--owner-text-color': playerColorStyles[owner.color].text,
    }
  }

  const startGame = (nextPlayerCount: PlayerCount) => {
    const nextGame = createShuffledGameState(nextPlayerCount)
    setGame(nextGame)
    setTurnStartSnapshot(nextGame)
  }

  const passActiveTurn = () => {
    if (!game) {
      return
    }

    const nextGame = passTurn(game)

    if (nextGame === game) {
      return
    }

    setGame(nextGame)
    setTurnStartSnapshot(nextGame.status === 'playing' ? nextGame : null)
  }

  const resetActiveTurn = () => {
    if (!turnStartSnapshot) {
      return
    }

    setGame(turnStartSnapshot)
  }

  const takeWildCardFrom = (source: WildStackKey) => {
    if (!game || !activePlayer || activePlayer.hand.length >= HAND_LIMIT || isGameEnded) {
      return
    }

    const result =
      source === 'wildLocation'
        ? drawFromStack(game.stacks.wildLocation)
        : drawFromStack(game.stacks.wildIndustry)

    if (!result.drawn) {
      return
    }

    const drawnCard: GameCard = result.drawn

    setGame((currentGame) =>
      currentGame
        ? {
            ...currentGame,
            players: currentGame.players.map((player) =>
              player.id === activePlayer.id
                ? {
                    ...player,
                    hand: addCardToHand(player.hand, drawnCard),
                  }
                : player,
            ),
            stacks: {
              ...currentGame.stacks,
              [source]: result.remaining,
            },
          }
        : currentGame,
    )
  }

  const discardFromActiveHand = (cardId: string) => {
    if (!game || !activePlayer || isGameEnded) {
      return
    }

    setGame((currentGame) =>
      currentGame
        ? discardCardFromPlayerHand(currentGame, activePlayer.id, cardId)
        : currentGame,
    )
  }

  const dragPiece = (event: React.DragEvent<HTMLElement>, payload: DragPayload) => {
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copy'

    if (payload.type === 'market-resource') {
      const dragImage = document.createElement('span')
      dragImage.style.background = resourceCubeColors[payload.cube.kind]
      dragImage.style.borderRadius = '3px'
      dragImage.style.boxShadow =
        payload.cube.kind === 'coal'
          ? '0 0 0 1px rgba(255, 255, 255, 0.72), 0 4px 10px rgba(0, 0, 0, 0.42)'
          : '0 4px 10px rgba(0, 0, 0, 0.42)'
      dragImage.style.height = '18px'
      dragImage.style.left = '-9999px'
      dragImage.style.position = 'fixed'
      dragImage.style.top = '-9999px'
      dragImage.style.width = '18px'
      document.body.append(dragImage)
      event.dataTransfer.setDragImage(dragImage, 9, 9)
      window.setTimeout(() => dragImage.remove(), 0)
    }

    if (payload.type === 'link') {
      const owner = game?.players.find((player) => player.id === payload.tile.ownerId)
      const dragImage = document.createElement('span')
      dragImage.style.backgroundColor = 'transparent'
      dragImage.style.backgroundImage = `url('${getScannedLinkImageUrl(owner?.color, payload.tile.kind)}')`
      dragImage.style.backgroundPosition = 'center'
      dragImage.style.backgroundRepeat = 'no-repeat'
      dragImage.style.backgroundSize = 'contain'
      dragImage.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.42)'
      dragImage.style.height = '28px'
      dragImage.style.left = '-9999px'
      dragImage.style.position = 'fixed'
      dragImage.style.top = '-9999px'
      dragImage.style.width = '56px'
      document.body.append(dragImage)
      event.dataTransfer.setDragImage(dragImage, 28, 14)
      window.setTimeout(() => dragImage.remove(), 0)
    }

    if (payload.type === 'industry') {
      const imageUrl = getIndustryPlacementImageUrl(payload.tile)

      if (imageUrl) {
        const dragImage = document.createElement('span')
        dragImage.style.backgroundImage = `url('${imageUrl}')`
        dragImage.style.backgroundPosition = 'center'
        dragImage.style.backgroundRepeat = 'no-repeat'
        dragImage.style.backgroundSize = 'cover'
        dragImage.style.borderRadius = '4px'
        dragImage.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.42)'
        dragImage.style.height = '56px'
        dragImage.style.left = '-9999px'
        dragImage.style.position = 'fixed'
        dragImage.style.top = '-9999px'
        dragImage.style.width = '56px'
        document.body.append(dragImage)
        event.dataTransfer.setDragImage(dragImage, 28, 28)
        window.setTimeout(() => dragImage.remove(), 0)
      }
    }

    if (payload.type === 'income-marker') {
      const owner = game?.players.find((player) => player.id === payload.playerId)
      const dragImage = document.createElement('span')
      dragImage.style.background = owner ? playerColorStyles[owner.color].color : '#f2c16c'
      dragImage.style.border = '0'
      dragImage.style.borderRadius = '999px'
      dragImage.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.42)'
      dragImage.style.height = '20px'
      dragImage.style.left = '-9999px'
      dragImage.style.position = 'fixed'
      dragImage.style.top = '-9999px'
      dragImage.style.width = '20px'
      document.body.append(dragImage)
      event.dataTransfer.setDragImage(dragImage, 10, 10)
      window.setTimeout(() => dragImage.remove(), 0)
    }

    if (payload.type === 'victory-point-marker') {
      const owner = game?.players.find((player) => player.id === payload.playerId)
      const ownerColor = owner ? playerColorStyles[owner.color].color : '#f2c16c'
      const dragImage = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')

      dragImage.setAttribute('height', '24')
      dragImage.setAttribute('viewBox', '0 0 24 24')
      dragImage.setAttribute('width', '24')
      dragImage.style.left = '-9999px'
      dragImage.style.position = 'fixed'
      dragImage.style.top = '-9999px'
      polygon.setAttribute('fill', ownerColor)
      polygon.setAttribute('points', '12 1 23 12 12 23 1 12')
      dragImage.append(polygon)
      document.body.append(dragImage)
      event.dataTransfer.setDragImage(dragImage, 12, 12)
      window.setTimeout(() => dragImage.remove(), 0)
    }
  }

  const consumePlayerBoardFlippedSource = (
    currentGame: GameState,
    payload: Extract<DragPayload, { type: 'industry' }>,
  ) =>
    payload.tile.flipped && payload.sourcePlayerBoardPlayerId && payload.sourcePlayerBoardTileId
      ? consumeFlippedPlayerBoardIndustryTile(
          currentGame,
          payload.sourcePlayerBoardPlayerId,
          payload.sourcePlayerBoardTileId,
        )
      : currentGame

  const flipIndustryAtSpace = (spaceId: string) => {
    setGame((currentGame) =>
      currentGame
        ? {
            ...currentGame,
            board: flipIndustryTile(currentGame.board, spaceId),
          }
        : currentGame,
    )
  }

  const dropOnIndustrySpace = (
    event: React.DragEvent<HTMLButtonElement>,
    spaceId: string,
  ) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (!game) {
      return
    }

    if (payload.type === 'industry') {
      setGame((currentGame) => {
        if (!currentGame) {
          return currentGame
        }

        const board = payload.sourceSpaceId
          ? moveIndustryTile(
              currentGame.board,
              payload.sourceSpaceId,
              spaceId,
              payload.tile,
            )
          : placeIndustryTile(currentGame.board, spaceId, payload.tile)

        const nextGame = {
          ...currentGame,
          board,
        }

        if (board === currentGame.board) {
          return nextGame
        }

        const withoutDevelopedSource = payload.sourceDevelopedPlayerId
          ? removeDevelopedIndustryTile(
              nextGame,
              payload.sourceDevelopedPlayerId,
              payload.tile.id,
            )
          : nextGame

        return consumePlayerBoardFlippedSource(withoutDevelopedSource, payload)
      })
      return
    }

    if (payload.type !== 'market-resource') {
      return
    }

    setGame((currentGame) => {
      if (!currentGame || payload.cube.sourceIndustrySpaceId === spaceId) {
        return currentGame
      }

      const nextBoard = placeIndustryResourceCube(currentGame.board, spaceId, {
        id: payload.cube.id,
        kind: payload.cube.kind,
        spaceId,
      })

      if (nextBoard === currentGame.board) {
        return currentGame
      }

      const withoutMarketSource = payload.cube.sourceSpaceId
        ? removeMarketResourceCube(nextBoard, payload.cube.sourceSpaceId)
        : nextBoard
      const withoutBeerSource = payload.cube.sourceBeerSpaceId
        ? removeBeerResourceCube(withoutMarketSource, payload.cube.sourceBeerSpaceId)
        : withoutMarketSource
      const withoutIndustrySource = payload.cube.sourceIndustrySpaceId
        ? removeIndustryResourceCube(
            withoutBeerSource,
            payload.cube.sourceIndustrySpaceId,
            payload.cube.id,
          )
        : withoutBeerSource

      return {
        ...currentGame,
        board: withoutIndustrySource,
      }
    })
  }

  const dropOnLinkSpace = (
    event: React.DragEvent<HTMLButtonElement>,
    spaceId: string,
  ) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (!game || payload.type !== 'link' || payload.tile.kind !== activeEraLinkKind) {
      return
    }

    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame
      }

      const nextBoard = payload.sourceSpaceId
        ? moveLinkTile(currentGame.board, payload.sourceSpaceId, spaceId, payload.tile)
        : placeLinkTile(currentGame.board, spaceId, payload.tile)

      if (nextBoard === currentGame.board) {
        return currentGame
      }

      return {
        ...currentGame,
        board: nextBoard,
      }
    })
  }

  const dropOnMarketResourceSpace = (
    event: React.DragEvent<HTMLDivElement>,
    spaceId: string,
  ) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (!game || payload.type !== 'market-resource') {
      return
    }

    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame
      }

      const nextBoard = moveResourceCubeToMarket(
        currentGame.board,
        spaceId,
        {
          id: payload.cube.id,
          kind: payload.cube.kind,
          spaceId,
        },
        {
          industrySpaceId: payload.cube.sourceIndustrySpaceId,
          marketSpaceId: payload.cube.sourceSpaceId,
        },
      )

      if (nextBoard === currentGame.board) {
        return currentGame
      }

      return {
        ...currentGame,
        board: nextBoard,
      }
    })
  }

  const dropOnBeerResourceSpace = (
    event: React.DragEvent<HTMLDivElement>,
    spaceId: string,
  ) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (!game || payload.type !== 'market-resource') {
      return
    }

    setGame((currentGame) => {
      if (!currentGame || payload.cube.sourceBeerSpaceId === spaceId) {
        return currentGame
      }

      const nextBoard = moveResourceCubeToBeer(
        currentGame.board,
        spaceId,
        {
          id: payload.cube.id,
          kind: payload.cube.kind,
          spaceId,
        },
        {
          beerSpaceId: payload.cube.sourceBeerSpaceId,
          industrySpaceId: payload.cube.sourceIndustrySpaceId,
          marketSpaceId: payload.cube.sourceSpaceId,
        },
      )

      if (nextBoard === currentGame.board) {
        return currentGame
      }

      return {
        ...currentGame,
        board: nextBoard,
      }
    })
  }

  const dropOnResourceBank = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (
      !game ||
      payload.type !== 'market-resource' ||
      (!payload.cube.sourceSpaceId &&
        !payload.cube.sourceIndustrySpaceId &&
        !payload.cube.sourceBeerSpaceId)
    ) {
      return
    }

    const sourceSpaceId = payload.cube.sourceSpaceId
    const sourceIndustrySpaceId = payload.cube.sourceIndustrySpaceId
    const sourceBeerSpaceId = payload.cube.sourceBeerSpaceId

    setGame((currentGame) =>
      currentGame
        ? {
            ...currentGame,
            board: sourceSpaceId
              ? removeMarketResourceCube(currentGame.board, sourceSpaceId)
              : sourceBeerSpaceId
                ? removeBeerResourceCube(currentGame.board, sourceBeerSpaceId)
                : removeIndustryResourceCube(
                    currentGame.board,
                    sourceIndustrySpaceId ?? '',
                    payload.cube.id,
                  ),
          }
        : currentGame,
    )
  }

  const dropOnIncomeTrackSpace = (
    event: React.DragEvent<HTMLButtonElement>,
    trackValue: number,
  ) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (!game || (payload.type !== 'income-marker' && payload.type !== 'victory-point-marker')) {
      return
    }

    const player = game.players.find((currentPlayer) => currentPlayer.id === payload.playerId)

    if (!player) {
      return
    }

    const field = payload.type === 'income-marker' ? 'income' : 'victoryPoints'
    const currentValue = field === 'income' ? player.income : player.victoryPoints
    const delta = trackValue - currentValue

    setGame((currentGame) =>
      currentGame ? updatePlayerScore(currentGame, payload.playerId, field, delta) : currentGame,
    )
  }

  const dropOnDevelopedIndustries = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (
      !game ||
      payload.type !== 'industry' ||
      payload.sourceDevelopedPlayerId ||
      !payload.tile.tileId ||
      !isPlayerBoardTileDevelopable(payload.tile.tileId)
    ) {
      return
    }

    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame
      }

      const withRemovedSource = payload.sourceSpaceId
        ? {
            ...currentGame,
            board: removeIndustryTile(currentGame.board, payload.sourceSpaceId),
          }
        : currentGame

      const withDevelopedTile = developIndustryTile(withRemovedSource, payload.tile.ownerId, payload.tile)

      return consumePlayerBoardFlippedSource(withDevelopedTile, payload)
    })
  }

  const dropOnPlayerBoard = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const payload = JSON.parse(event.dataTransfer.getData('application/json')) as DragPayload

    if (
      !game ||
      payload.type !== 'industry' ||
      !payload.tile.tileId ||
      (!payload.sourceDevelopedPlayerId && !payload.sourceSpaceId)
    ) {
      return
    }

    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame
      }

      const withRemovedSource = payload.sourceDevelopedPlayerId
        ? removeDevelopedIndustryTile(currentGame, payload.sourceDevelopedPlayerId, payload.tile.id)
        : payload.sourceSpaceId
          ? {
              ...currentGame,
              board: removeIndustryTile(currentGame.board, payload.sourceSpaceId),
            }
          : currentGame

      return payload.tile.flipped && payload.tile.tileId
        ? restoreFlippedPlayerBoardIndustryTile(
            withRemovedSource,
            payload.tile.ownerId,
            payload.tile.tileId,
          )
        : withRemovedSource
    })
  }

  const removeResourceCubeFromBoard = (cube: ResourceCubeDragPayload) => {
    setGame((currentGame) =>
      currentGame && cube.sourceSpaceId
        ? {
            ...currentGame,
            board: removeMarketResourceCube(currentGame.board, cube.sourceSpaceId),
          }
        : currentGame && cube.sourceBeerSpaceId
          ? {
              ...currentGame,
              board: removeBeerResourceCube(currentGame.board, cube.sourceBeerSpaceId),
            }
        : currentGame && cube.sourceIndustrySpaceId
          ? {
              ...currentGame,
              board: removeIndustryResourceCube(
                currentGame.board,
                cube.sourceIndustrySpaceId,
                cube.id,
              ),
            }
          : currentGame,
    )
  }

  const removeMarketCubeWhenDraggedOffBoard = (
    event: React.DragEvent<HTMLElement>,
    cube: ResourceCubeDragPayload,
  ) => {
    const boardRect = boardMapRef.current?.getBoundingClientRect()

    if (!boardRect) {
      return
    }

    const wasDroppedOutsideBoard =
      event.clientX < boardRect.left ||
      event.clientX > boardRect.right ||
      event.clientY < boardRect.top ||
      event.clientY > boardRect.bottom

    if (wasDroppedOutsideBoard) {
      removeResourceCubeFromBoard(cube)
    }
  }

  const removeLinkWhenDraggedOffBoard = (
    event: React.DragEvent<HTMLElement>,
    sourceSpaceId: string,
  ) => {
    const boardRect = boardMapRef.current?.getBoundingClientRect()

    if (!boardRect) {
      return
    }

    const wasDroppedOutsideBoard =
      event.clientX < boardRect.left ||
      event.clientX > boardRect.right ||
      event.clientY < boardRect.top ||
      event.clientY > boardRect.bottom

    if (wasDroppedOutsideBoard) {
      setGame((currentGame) =>
        currentGame
          ? {
              ...currentGame,
              board: removeLinkTile(currentGame.board, sourceSpaceId),
            }
          : currentGame,
      )
    }
  }

  const removeIndustryWhenDraggedOffBoard = (
    event: React.DragEvent<HTMLElement>,
    sourceSpaceId: string,
  ) => {
    const boardRect = boardMapRef.current?.getBoundingClientRect()

    if (!boardRect) {
      return
    }

    const wasDroppedOutsideBoard =
      event.clientX < boardRect.left ||
      event.clientX > boardRect.right ||
      event.clientY < boardRect.top ||
      event.clientY > boardRect.bottom

    if (wasDroppedOutsideBoard) {
      setGame((currentGame) =>
        currentGame
          ? {
              ...currentGame,
              board: removeIndustryTile(currentGame.board, sourceSpaceId),
            }
          : currentGame,
      )
    }
  }

  const adjustPlayerScore = (
    playerId: string,
    field: 'victoryPoints' | 'income',
    delta: number,
  ) => {
    if (isGameEnded) {
      return
    }

    setGame((currentGame) =>
      currentGame ? updatePlayerScore(currentGame, playerId, field, delta) : currentGame,
    )
  }

  const adjustActivePlayerMoney = (delta: number) => {
    if (!activePlayer || isGameEnded) {
      return
    }

    setGame((currentGame) =>
      currentGame ? updatePlayerMoney(currentGame, activePlayer.id, delta) : currentGame,
    )
  }

  const adjustActivePlayerRoundSpending = (delta: number) => {
    if (!activePlayer || isGameEnded) {
      return
    }

    setGame((currentGame) =>
      currentGame
        ? updatePlayerRoundSpending(currentGame, activePlayer.id, delta)
        : currentGame,
    )
  }

  const flipActivePlayerDevelopedTile = (tileId: string) => {
    if (!activePlayer) {
      return
    }

    setGame((currentGame) =>
      currentGame ? flipDevelopedIndustryTile(currentGame, activePlayer.id, tileId) : currentGame,
    )
  }

  const flipActivePlayerBoardTile = (tileId: string) => {
    if (!activePlayer) {
      return
    }

    setGame((currentGame) =>
      currentGame ? flipPlayerBoardIndustryTile(currentGame, activePlayer.id, tileId) : currentGame,
    )
  }

  if (!game) {
    return (
      <main className="title-screen">
        <section className="title-card" aria-labelledby="title-screen-heading">
          <p className="eyebrow">Offline local game</p>
          <h2 id="title-screen-heading">Brass: Birmingham</h2>
          <p className="lede">
            Choose the player count once. After the game starts, the player count
            is locked and you control every player locally.
          </p>
          <div className="title-actions" aria-label="Start game player count">
            {playerCounts.map((count) => (
              <button key={count} onClick={() => startGame(count)} type="button">
                Start {count}-player game
              </button>
            ))}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="controls-panel" aria-label="Locked game setup">
        <div>
          <p className="eyebrow">Game setup locked</p>
          <h2>{game.playerCount} local players</h2>
        </div>
        <div className="player-buttons" aria-label="Active local player">
          {game.players.map((player, index) => (
            <button
              className={index === activePlayerIndex ? 'is-active' : ''}
              disabled={index !== activePlayerIndex || isGameEnded}
              key={player.id}
              style={getPlayerPieceStyle(player.id)}
              type="button"
            >
              {player.name}
            </button>
          ))}
        </div>
      </section>

      <section className="score-panel" aria-label="Player VP and income counters">
        <div className="panel__header">
          <p className="eyebrow">Score tracker</p>
          <h2>VP and income</h2>
        </div>
        <div className="score-grid">
          {game.players.map((player) => (
            <article className="score-card" key={player.id}>
              <h3>{player.name}</h3>
              <div className="score-row">
                <span>VP</span>
                <button
                  aria-label={`Decrease ${player.name} VP`}
                  disabled={isGameEnded}
                  onClick={() => adjustPlayerScore(player.id, 'victoryPoints', -1)}
                  type="button"
                >
                  -
                </button>
                <strong>{player.victoryPoints}</strong>
                <button
                  aria-label={`Increase ${player.name} VP`}
                  disabled={isGameEnded}
                  onClick={() => adjustPlayerScore(player.id, 'victoryPoints', 1)}
                  type="button"
                >
                  +
                </button>
              </div>
              <div className="score-row">
                <span>Income</span>
                <button
                  aria-label={`Decrease ${player.name} income`}
                  disabled={isGameEnded}
                  onClick={() => adjustPlayerScore(player.id, 'income', -1)}
                  type="button"
                >
                  -
                </button>
                <strong>{player.income}</strong>
        <button
                  aria-label={`Increase ${player.name} income`}
                  disabled={isGameEnded}
                  onClick={() => adjustPlayerScore(player.id, 'income', 1)}
          type="button"
        >
                  +
        </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel board-panel" aria-label="Game board">
        <div className="board-layout">
          <aside className="tile-palette" aria-label="Draggable tile palette">
            <div className="player-board-panel">
              <div
                className="player-board-surface"
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropOnPlayerBoard}
              >
                <img src={playerBoardImageUrl} alt={`${activePlayer?.name ?? 'Player'} industry board`} />
                <div className="player-board-tile-grid">
                  {calibratedPlayerBoardIndustryTiles.map((tile) => {
                    const remainingCount = getRemainingPlayerBoardTileCount(activePlayer?.id, tile.id)
                    const isTopTileFlipped = Boolean(
                      activePlayer?.flippedPlayerBoardTileIds.includes(tile.id),
                    )
                    const imageUrl = getPlayerBoardTileImageUrl(
                      activePlayerBoardAssetColor,
                      tile.id,
                      isTopTileFlipped,
                    )
                    const canDevelopTile = isPlayerBoardTileDevelopable(tile.id)
                    const canUseTile =
                      remainingCount > 0 &&
                      isPlayerBoardIndustryTileUsable(tile.id, activePlayerRemainingTileCounts)
                    const canFlipTile = remainingCount > 0

                    return (
                      <button
                        aria-label={`Build ${tile.industry} level ${tile.level}`}
                        className={`player-board-tile ${remainingCount === 0 ? 'is-exhausted' : ''} ${
                          isTopTileFlipped ? 'is-flipped' : ''
                        } ${
                          !canUseTile && remainingCount > 0 ? 'is-blocked' : ''
                        }`}
                        disabled={remainingCount === 0}
                        draggable={canUseTile}
                        key={tile.id}
                        onDoubleClick={(event) => {
                          event.stopPropagation()

                          if (canFlipTile) {
                            flipActivePlayerBoardTile(tile.id)
                          }
                        }}
                        onDragStart={(event) => {
                          if (!canUseTile) {
                            event.preventDefault()
                            return
                          }

                          dragPiece(event, {
                            type: 'industry',
                            tile: {
                              id: `${activePlayer?.id}-${tile.id}-${Date.now()}`,
                              industry: tile.industry,
                              ownerId: activePlayer?.id ?? 'player-1',
                              tileId: tile.id,
                              flipped: isTopTileFlipped,
                            },
                            sourcePlayerBoardPlayerId: activePlayer?.id,
                            sourcePlayerBoardTileId: tile.id,
                          })
                        }}
                        style={{
                          backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
                          left: `${tile.x}%`,
                          top: `${tile.y}%`,
                        }}
                        title={`${tile.industry} ${tile.level}: ${remainingCount} remaining${
                          canUseTile ? '' : ', lower level remains'
                        }${canDevelopTile ? '' : ', cannot develop'}${
                          canFlipTile ? ', double-click to flip top tile' : ''
                        }`}
                        type="button"
                      >
                        {remainingCount > 1 ? <span className="player-board-tile-count">{remainingCount}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="player-money-panel" aria-label={`${activePlayer?.name} money`}>
                <div className="player-money-row">
                  <span>Money</span>
                  <strong>{activePlayer?.money ?? 0}</strong>
                  {[-10, -5, -1, 1, 5, 10].map((delta) => (
                    <button
                      aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} ${activePlayer?.name} money by ${Math.abs(delta)}`}
                      disabled={isGameEnded}
                      key={delta}
                      onClick={() => adjustActivePlayerMoney(delta)}
                      type="button"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
                <div className="player-money-row">
                  <span>Spent</span>
                  <strong>{activePlayer?.moneySpentThisRound ?? 0}</strong>
                  {[-10, -5, -1, 1, 5, 10].map((delta) => (
                    <button
                      aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} ${activePlayer?.name} round spending by ${Math.abs(delta)}`}
                      disabled={isGameEnded}
                      key={delta}
                      onClick={() => adjustActivePlayerRoundSpending(delta)}
                      type="button"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>
              </div>
              <div className="other-player-money-panel" aria-label="Other players' money">
                <div className="other-player-money-list">
                  {otherPlayers.map((player) => (
                    <div
                      className="other-player-money-row"
                      key={player.id}
                      style={getPlayerPieceStyle(player.id)}
                    >
                      <span>{player.name}</span>
                      <strong>{player.money}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="turn-control-panel" aria-label="Turn controls">
                <div className="turn-control-panel__actions">
                  <button disabled={!canPassTurn} onClick={passActiveTurn} type="button">
                    Pass turn
                  </button>
                  <button
                    disabled={!turnStartSnapshot || isGameEnded}
                    onClick={resetActiveTurn}
                    type="button"
                  >
                    Reset turn
                  </button>
                </div>
              </div>
            </div>

            <div className="link-era-panel">
              <div className="link-era-panel__header">
                <h3>{activeEraLinkLabel}</h3>
                <button
                  aria-label={`Build ${activeEraLinkKind} link`}
                  className="palette-tile palette-tile--link link-era-panel__tile"
                  draggable={!isGameEnded}
                  onDragStart={(event) =>
                    dragPiece(event, {
                      type: 'link',
                      tile: {
                        id: `${activePlayer?.id}-${activeEraLinkKind}-${Date.now()}`,
                        kind: activeEraLinkKind,
                        ownerId: activePlayer?.id ?? 'player-1',
                      },
                    })
                  }
                  type="button"
                >
                  <span
                    aria-hidden="true"
                      className="palette-link-icon"
                    style={{
                      backgroundImage: `url('${activeEraLinkImageUrl}')`,
                    }}
                  />
                </button>
              </div>
            </div>

            <div
              className="developed-industries"
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropOnDevelopedIndustries}
            >
              <h3>Developed industries / Outdated industries</h3>
              <div className="developed-industries-grid">
                {activePlayer?.developedIndustries.map((tile) => {
                  const imageUrl = getIndustryPlacementImageUrl(tile)

                  return (
                    <button
                      aria-label={`Move developed or outdated ${tile.industry}`}
                      className={`developed-industry-tile ${tile.flipped ? 'is-flipped' : ''}`}
                      draggable
                      key={tile.id}
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                        flipActivePlayerDevelopedTile(tile.id)
                      }}
                      onDragStart={(event) =>
                        dragPiece(event, {
                          type: 'industry',
                          tile,
                          sourceDevelopedPlayerId: activePlayer.id,
                        })
                      }
                      style={{
                        backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
                      }}
                      title={`Developed or outdated ${tile.industry}, double-click to flip`}
                      type="button"
                    />
                  )
                })}
              </div>
            </div>

            <div className="resource-bank" onDragOver={(event) => event.preventDefault()} onDrop={dropOnResourceBank}>
              {resourceCubeKinds.map((kind) => (
                <button
                  className={`resource-cube-button resource-cube-button--${kind}`}
                  draggable
                  key={kind}
                  onDragStart={(event) =>
                    dragPiece(event, {
                      type: 'market-resource',
                      cube: {
                        id: `${kind}-cube-${Date.now()}`,
                        kind,
                      },
                    })
                  }
                  type="button"
                >
                  <span aria-hidden="true" />
                  <strong>{kind}</strong>
                </button>
              ))}
            </div>
            <div className="turn-order-panel" aria-label="Turn order">
              <div className="turn-order-list">
                {game.players.map((player, index) => (
                  <span
                    aria-label={`${player.name} spent ${getTurnOrderSpendLabel(game, index) || 'nothing shown'} this round`}
                    className={index === activePlayerIndex ? 'is-active' : ''}
                    key={player.id}
                    style={getPlayerPieceStyle(player.id)}
                    title={`${player.name}: spent ${player.moneySpentThisRound} this round`}
                  >
                    {getTurnOrderSpendLabel(game, index)}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <div className="board-map" ref={boardMapRef}>
            <img src="/src/assets/board/board.jpg" alt="Brass Birmingham board" />

            {calibratedBoardControlSpaces.map((space) => {
              const stackCount = game.stacks[space.stack].length
              const canTakeWildCard = space.stack !== 'standard'

              return (
                <div
                  className={`board-overlay-card board-overlay-card--${space.stack} ${
                    stackCount === 0 ? 'is-empty' : ''
                  }`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  title={`${space.id}: ${space.title}`}
                >
                  <div className="board-overlay-card__face" aria-hidden="true" />
                  <strong className="board-overlay-card-count">{stackCount}</strong>
                  {canTakeWildCard ? (
                    <div className="board-overlay-card__hud">
                      <button
                        disabled={
                          isGameEnded ||
                          !activePlayer ||
                          activePlayer.hand.length >= HAND_LIMIT ||
                          stackCount === 0
                        }
                        onClick={() => takeWildCardFrom(space.stack as WildStackKey)}
                        type="button"
                      >
                        {space.actionLabel}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {calibratedIncomeTrackSpaces.map((space) => {
              const playersOnSpace = game.players.filter((player) => player.income === space.value)
              const vpPlayersOnSpace = game.players.filter(
                (player) => player.victoryPoints === space.value,
              )

              return (
                <button
                  aria-label={`Income ${space.value}`}
                  className={`board-space board-space--income ${
                    playersOnSpace.length > 0 || vpPlayersOnSpace.length > 0
                      ? 'is-occupied'
                      : 'is-calibration-only'
                  }`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnIncomeTrackSpace(event, space.value)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  title={`Income ${space.value}`}
                  type="button"
                >
                  {playersOnSpace.map((player) => (
                    <span
                      aria-label={`${player.name} income marker`}
                      className="income-marker"
                      draggable={!isGameEnded}
                      key={`income-${player.id}`}
                      onDragStart={(event) =>
                        dragPiece(event, {
                          type: 'income-marker',
                          playerId: player.id,
                        })
                      }
                      role="button"
                      style={getPlayerPieceStyle(player.id)}
                      tabIndex={0}
                      title={`${player.name}: income ${player.income}`}
                    />
                  ))}
                  {vpPlayersOnSpace.map((player) => (
                    <span
                      aria-label={`${player.name} VP marker`}
                      className="victory-point-marker"
                      draggable={!isGameEnded}
                      key={`victory-points-${player.id}`}
                      onDragStart={(event) =>
                        dragPiece(event, {
                          type: 'victory-point-marker',
                          playerId: player.id,
                        })
                      }
                      role="button"
                      style={getPlayerPieceStyle(player.id)}
                      tabIndex={0}
                      title={`${player.name}: ${player.victoryPoints} VP`}
                    />
                  ))}
                </button>
              )
            })}

            {calibratedMarketResourceSpaces.map((space) => {
              const placement = game.board.marketResourcePlacements[space.id]

              return (
                <div
                  aria-label={`${space.label} ${placement ? 'with cube' : 'empty'}`}
                  className={`board-space board-space--market board-space--market-${space.kind}`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnMarketResourceSpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  title={`${space.id}: ${space.label}`}
                >
                  {placement ? (
                    <button
                      aria-label={`Move ${space.kind} cube from ${space.label}`}
                      className={`market-cube-button market-cube-button--${space.kind}`}
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) =>
                        dragPiece(event, {
                          type: 'market-resource',
                          cube: {
                            id: placement.id,
                            kind: placement.kind,
                            sourceSpaceId: space.id,
                          },
                        })
                      }
                      onDragEnd={(event) =>
                        removeMarketCubeWhenDraggedOffBoard(event, {
                          id: placement.id,
                          kind: placement.kind,
                          sourceSpaceId: space.id,
                        })
                      }
                      type="button"
                    />
                  ) : null}
                </div>
              )
            })}

            {calibratedBeerResourceSpaces.map((space) => {
              const placement = game.board.beerResourcePlacements[space.id]

              return (
                <div
                  aria-label={`${space.label} ${placement ? 'with beer' : 'empty'}`}
                  className="board-space board-space--beer"
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnBeerResourceSpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  title={`${space.id}: ${space.label}`}
                >
                  {placement ? (
                    <button
                      aria-label={`Move beer cube from ${space.label}`}
                      className="market-cube-button market-cube-button--beer"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragEnd={(event) =>
                        removeMarketCubeWhenDraggedOffBoard(event, {
                          id: placement.id,
                          kind: placement.kind,
                          sourceBeerSpaceId: space.id,
                        })
                      }
                      onDragStart={(event) =>
                        dragPiece(event, {
                          type: 'market-resource',
                          cube: {
                            id: placement.id,
                            kind: placement.kind,
                            sourceBeerSpaceId: space.id,
                          },
                        })
                      }
                      type="button"
                    />
                  ) : null}
                </div>
              )
            })}

            {calibratedMerchantTileSpaces.map((space) => {
              const placement = visibleMerchantTilePlacements[space.id]

              if (!placement) {
                return null
              }

              return (
                <div
                  aria-label={
                    placement
                      ? `${space.label}: ${placement.label}`
                      : `${space.label} merchant tile spot`
                  }
                  className={`board-space board-space--merchant ${
                    placement ? 'is-active' : 'is-calibration-only'
                  } ${placement ? `board-space--merchant-${placement.kind}` : ''}`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  title={
                    placement
                      ? `${space.id}: ${placement.label}`
                      : `${space.id}: ${space.label}`
                  }
                >
                  {placement ? <span aria-hidden="true" className="merchant-tile-face" /> : `M${space.merchantIndex}`}
                </div>
              )
            })}

            {calibratedIndustrySpaces.map((space) => {
              const placement = game.board.industryPlacements[space.id]
              const resources = game.board.industryResourcePlacements[space.id] ?? []
              const placementImageUrl = getIndustryPlacementImageUrl(placement)
              const canDragIndustryTile = Boolean(placement && resources.length === 0)
              const canFlipIndustryTile = canDragIndustryTile

              return (
                <button
                  aria-label={`${space.id}: ${space.city}, allows ${space.allowedIndustries.join(
                    ' or ',
                  )}`}
                  title={`${space.id}: ${space.allowedIndustries.join(' / ')}${
                    canFlipIndustryTile ? ', double-click to flip' : ''
                  }`}
                  className={`board-space board-space--industry ${
                    placement ? 'is-occupied' : ''
                  } ${placement?.flipped ? 'is-flipped' : ''} ${
                    placementImageUrl ? 'has-tile-image' : ''
                  }`}
                  draggable={canDragIndustryTile}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => {
                    event.stopPropagation()

                    if (canFlipIndustryTile) {
                      flipIndustryAtSpace(space.id)
                    }
                  }}
                  onDragEnd={(event) => {
                    if (canDragIndustryTile) {
                      removeIndustryWhenDraggedOffBoard(event, space.id)
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={(event) => {
                    if (placement && canDragIndustryTile) {
                      dragPiece(event, {
                        type: 'industry',
                        tile: placement,
                        sourceSpaceId: space.id,
                      })
                    }
                  }}
                  onDrop={(event) => dropOnIndustrySpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                    ...(placementImageUrl
                      ? { '--industry-tile-image': `url('${placementImageUrl}')` }
                      : {}),
                    ...getPlayerPieceStyle(placement?.ownerId),
                  }}
                  type="button"
                >
                  {placement && !placementImageUrl ? <span className="industry-space-label">{placement.industry}</span> : null}
                  {resources.length > 0 ? (
                    <span className="industry-resource-stack">
                      {resources.map((cube) => (
                        <span
                          aria-label={`Move ${cube.kind} cube from ${space.id}`}
                          className={`market-cube-button market-cube-button--${cube.kind}`}
                          draggable
                          key={cube.id}
                          onClick={(event) => event.stopPropagation()}
                          onDragEnd={(event) =>
                            removeMarketCubeWhenDraggedOffBoard(event, {
                              id: cube.id,
                              kind: cube.kind,
                              sourceIndustrySpaceId: space.id,
                            })
                          }
                          onDragStart={(event) =>
                            dragPiece(event, {
                              type: 'market-resource',
                              cube: {
                                id: cube.id,
                                kind: cube.kind,
                                sourceIndustrySpaceId: space.id,
                              },
                            })
                          }
                          role="button"
                          tabIndex={0}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              )
            })}

            {calibratedLinkSpaces.map((space) => {
              const placement = game.board.linkPlacements[space.id]
              const placementImageUrl = getLinkPlacementImageUrl(placement)

              return (
                <button
                  aria-label={`${space.from} to ${space.to} link space, allows ${space.allowedKinds.join(
                    ' or ',
                  )}`}
                  title={`${space.id}: ${space.allowedKinds.join(' / ')}`}
                  className={`board-space board-space--link ${
                    placement ? `is-occupied board-space--link-${placement.kind}` : ''
                  }`}
                  draggable={Boolean(placement)}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragEnd={(event) => {
                    if (placement) {
                      removeLinkWhenDraggedOffBoard(event, space.id)
                    }
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={(event) => {
                    if (placement) {
                      dragPiece(event, {
                        type: 'link',
                        tile: placement,
                        sourceSpaceId: space.id,
                      })
                    }
                  }}
                  onDrop={(event) => dropOnLinkSpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                    transform: `translate(-50%, -50%) rotate(${space.rotation}deg)`,
                    ...(placementImageUrl
                      ? { '--link-tile-image': `url('${placementImageUrl}')` }
                      : {}),
                    ...getPlayerPieceStyle(placement?.ownerId),
                  }}
                  type="button"
                >
                  {placement ? <span aria-hidden="true" className="link-piece-icon" /> : ''}
                </button>
              )
            })}
          </div>
        </div>

      </section>

      <section className="panel hand-panel" aria-label="My hand">
        <div className="panel__header">
          <p className="eyebrow">Active hand</p>
          <h2>{activePlayer?.name}</h2>
        </div>
        <div className="hand-grid">
          {Array.from({ length: HAND_LIMIT }).map((_, index) => {
            const handCard = activePlayer?.hand[index]

            return handCard ? (
              <div
                className="hand-slot hand-slot--filled"
                key={`${handCard.id}-${index}`}
              >
                <CardFace card={handCard} />
                <button
                  className="discard-card-button"
                  disabled={isGameEnded}
                  onClick={() => discardFromActiveHand(handCard.id)}
                  type="button"
                >
                  Discard
                </button>
              </div>
            ) : (
              <div className="hand-slot" key={`empty-${index}`}>
                <span>Empty slot {index + 1}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel discard-panel" aria-label="Shared discard pile">
        <div className="panel__header">
          <p className="eyebrow">Shared discard pile</p>
          <h2>{game.discardPile.length} standard cards</h2>
        </div>
        {game.discardPile.length === 0 ? (
          <p>No standard cards discarded yet.</p>
        ) : (
          <ol className="discard-list">
            {game.discardPile.slice(-6).reverse().map((card) => (
              <li key={card.id}>
                <strong>{formatDiscardCard(card)}</strong>
                <span>{card.kind === 'location' ? 'Location' : 'Industry'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

    </main>
  )
}

export default App
