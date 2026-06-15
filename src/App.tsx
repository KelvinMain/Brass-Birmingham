import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import './App.css'

import { standardCards } from './game/cards'
import type { Industry, PlayerCount } from './game/cards'
import {
  beerResourceSpaces,
  boardControlSpaces,
  getBoardPointFromClientPosition,
  industrySpaces,
  linkSpaces,
  marketResourceSpaces,
  moveResourceCubeToBeer,
  moveResourceCubeToMarket,
  placeIndustryResourceCube,
  placeIndustryTile,
  placeLinkTile,
  removeBeerResourceCube,
  removeIndustryResourceCube,
  removeMarketResourceCube,
  resourceCubeKinds,
  updateBeerResourceSpaceCalibration,
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
import { createGameState, discardCardFromPlayerHand, updatePlayerScore } from './game/game'
import type { GameState } from './game/game'

const industryCards = standardCards.filter((card) => card.kind === 'industry')

const industryCounts = industryCards.reduce<Record<string, number>>((counts, card) => {
  const label = card.industries.join(' / ')
  counts[label] = (counts[label] ?? 0) + 1
  return counts
}, {})

type StackKey = keyof DrawableStacks

type CardStyle = CSSProperties & {
  '--card-tint'?: string
}

const playerCounts: PlayerCount[] = [2, 3, 4]
const industries: Industry[] = ['coal', 'iron', 'brewery', 'cotton', 'manufacturer', 'pottery']
const linkKinds: LinkTilePlacement['kind'][] = ['canal', 'rail']

const resourceCubeColors = {
  coal: '#050505',
  iron: '#bd6638',
  beer: '#d7b15c',
} satisfies Record<(typeof resourceCubeKinds)[number], string>

type DragPayload =
  | {
      type: 'industry'
      tile: IndustryTilePlacement
    }
  | {
      type: 'link'
      tile: LinkTilePlacement
    }
  | {
      type: 'market-resource'
      cube: ResourceCubeDragPayload
    }

type ResourceCubeDragPayload = Omit<MarketResourcePlacement, 'spaceId'> & {
  sourceBeerSpaceId?: string
  sourceIndustrySpaceId?: string
  sourceSpaceId?: string
}

type CalibrationTarget =
  | {
      type: 'beer'
      id: string
    }

function createShuffledGameState(playerCount: PlayerCount): GameState {
  const game = createGameState(playerCount)

  return {
    ...game,
    stacks: {
      ...game.stacks,
      standard: shuffleDeck(game.stacks.standard),
    },
  }
}

function formatCard(card: GameCard): string {
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
    const style: CardStyle = {
      '--card-tint': card.color,
    }

    return (
      <article className="playing-card playing-card--location" style={style}>
        <div className="playing-card__image" aria-hidden="true" />
        <div className="playing-card__label">
          <strong>{card.name}</strong>
        </div>
      </article>
    )
  }

  if (card.kind === 'industry') {
    return (
      <article className="playing-card playing-card--industry">
        <div className="playing-card__image" aria-hidden="true" />
        <div className="playing-card__label">
          <strong>{formatCard(card)}</strong>
        </div>
      </article>
    )
  }

  const isLocationWild = card.kind === 'wild-location'

  return (
    <article
      className={`playing-card playing-card--wild ${
        isLocationWild ? 'playing-card--wild-location' : 'playing-card--wild-industry'
      }`}
    >
      <div className="playing-card__image" aria-hidden="true" />
      <div className="playing-card__label">
        <span>Wild</span>
        <strong>{isLocationWild ? 'Location' : 'Industry'}</strong>
      </div>
    </article>
  )
}

function formatBeerResourceSpacesForExport(spaces: BeerResourceSpace[]): string {
  return `export const beerResourceSpaces: BeerResourceSpace[] = ${JSON.stringify(spaces, null, 2)}`
}

function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const boardMapRef = useRef<HTMLDivElement | null>(null)
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [calibrationMode, setCalibrationMode] = useState(false)
  const [calibrationTarget, setCalibrationTarget] = useState<CalibrationTarget>({
    type: 'beer',
    id: beerResourceSpaces[0].id,
  })
  const calibratedIndustrySpaces = industrySpaces
  const calibratedLinkSpaces = linkSpaces
  const calibratedBoardControlSpaces = boardControlSpaces
  const [calibratedMarketResourceSpaces] = useState<MarketResourceSpace[]>(marketResourceSpaces)
  const [calibratedBeerResourceSpaces, setCalibratedBeerResourceSpaces] =
    useState<BeerResourceSpace[]>(beerResourceSpaces)
  const [lastCalibrationPoint, setLastCalibrationPoint] = useState<{
    x: number
    y: number
  } | null>(null)

  const visibleDeckSize = useMemo(
    () => (game ? getDeckForPlayerCount(game.playerCount).length : 0),
    [game],
  )
  const activePlayer = game?.players[activePlayerIndex]
  const isHandFull = activePlayer ? activePlayer.hand.length >= HAND_LIMIT : false

  const startGame = (nextPlayerCount: PlayerCount) => {
    setGame(createShuffledGameState(nextPlayerCount))
    setActivePlayerIndex(0)
  }

  const drawFrom = (source: StackKey) => {
    if (!game || !activePlayer || isHandFull) {
      return
    }

    const result =
      source === 'standard'
        ? drawFromStack(game.stacks.standard)
        : source === 'wildLocation'
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
            players: currentGame.players.map((player, index) =>
              index === activePlayerIndex
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
    if (!game || !activePlayer) {
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
      setGame((currentGame) =>
        currentGame
          ? {
              ...currentGame,
              board: placeIndustryTile(currentGame.board, spaceId, payload.tile),
            }
          : currentGame,
      )
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

    if (!game || payload.type !== 'link') {
      return
    }

    setGame((currentGame) =>
      currentGame
        ? {
            ...currentGame,
            board: placeLinkTile(currentGame.board, spaceId, payload.tile),
          }
        : currentGame,
    )
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

  const adjustPlayerScore = (
    playerId: string,
    field: 'victoryPoints' | 'income',
    delta: number,
  ) => {
    setGame((currentGame) =>
      currentGame ? updatePlayerScore(currentGame, playerId, field, delta) : currentGame,
    )
  }

  const setCalibrationTargetFromValue = (value: string) => {
    setCalibrationTarget({ type: 'beer', id: value })
  }

  const calibrateBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!calibrationMode) {
      return
    }

    const point = getBoardPointFromClientPosition(
      event.currentTarget.getBoundingClientRect(),
      event.clientX,
      event.clientY,
    )
    setLastCalibrationPoint(point)

    setCalibratedBeerResourceSpaces((spaces) =>
      updateBeerResourceSpaceCalibration(spaces, calibrationTarget.id, point),
    )
  }

  const calibrationExport = formatBeerResourceSpacesForExport(calibratedBeerResourceSpaces)

  if (!game) {
    return (
      <main className="title-screen">
        <section className="title-card" aria-labelledby="title-screen-heading">
          <p className="eyebrow">Offline local game</p>
          <h1 id="title-screen-heading">Brass: Birmingham</h1>
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
      <section className="hero-panel" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Offline setup module</p>
          <h1 id="page-title">Brass: Birmingham card room</h1>
          <p className="lede">
            {game.playerCount}-player game in progress. The player count is
            locked for this session; choose a local player below and draw into
            their eight-card hand.
          </p>
        </div>

        <div className="deck-tile" aria-label="Selected player draw deck">
          <span className="deck-tile__label">{game.playerCount}P draw deck</span>
          <strong>{game.stacks.standard.length}</strong>
          <span>standard cards</span>
        </div>
      </section>

      <section className="controls-panel" aria-label="Locked game setup">
        <div>
          <p className="eyebrow">Game setup locked</p>
          <h2>{game.playerCount} local players</h2>
          <p>
            The standard deck uses {visibleDeckSize} cards. You control every
            player and can switch the active hand below.
          </p>
        </div>
        <div className="player-buttons" aria-label="Active local player">
          {game.players.map((player, index) => (
            <button
              className={index === activePlayerIndex ? 'is-active' : ''}
              key={player.id}
              onClick={() => setActivePlayerIndex(index)}
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
          <p>Use the controls below to adjust each local player directly.</p>
        </div>
        <div className="score-grid">
          {game.players.map((player) => (
            <article className="score-card" key={player.id}>
              <h3>{player.name}</h3>
              <div className="score-row">
                <span>VP</span>
                <button
                  aria-label={`Decrease ${player.name} VP`}
                  onClick={() => adjustPlayerScore(player.id, 'victoryPoints', -1)}
                  type="button"
                >
                  -
                </button>
                <strong>{player.victoryPoints}</strong>
                <button
                  aria-label={`Increase ${player.name} VP`}
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
                  onClick={() => adjustPlayerScore(player.id, 'income', -1)}
                  type="button"
                >
                  -
                </button>
                <strong>{player.income}</strong>
                <button
                  aria-label={`Increase ${player.name} income`}
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
        <div className="panel__header">
          <p className="eyebrow">Board prototype</p>
          <h2>Drag tiles onto the map</h2>
          <p>
            Use the calibrated board spaces, on-board draw stacks, and market
            markers over your board image.
          </p>
        </div>

        <div className="calibration-panel">
          <div>
            <p className="eyebrow">Calibration</p>
            <h3>Click-to-position beer slots</h3>
            <p>
              Enable calibration, choose a board beer slot, then click
              the exact spot on the board.
            </p>
          </div>
          <button
            className={calibrationMode ? 'is-active' : ''}
            onClick={() => setCalibrationMode((enabled) => !enabled)}
            type="button"
          >
            {calibrationMode ? 'Calibration on' : 'Calibration off'}
          </button>
          <label>
            Target
            <select
              onChange={(event) => setCalibrationTargetFromValue(event.target.value)}
              value={calibrationTarget.id}
            >
              <optgroup label="Board beer spots">
                {calibratedBeerResourceSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.id}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          {lastCalibrationPoint ? (
            <p className="calibration-point">
              Last click: x {lastCalibrationPoint.x}, y {lastCalibrationPoint.y}
            </p>
          ) : null}
        </div>

        <div className="board-layout">
          <aside className="tile-palette" aria-label="Draggable tile palette">
            <div>
              <h3>Industry tiles</h3>
              <div className="palette-grid">
                {industries.map((industry) => (
                  <button
                    className="palette-tile palette-tile--industry"
                    draggable
                    key={industry}
                    onDragStart={(event) =>
                      dragPiece(event, {
                        type: 'industry',
                        tile: {
                          id: `${activePlayer?.id}-${industry}-${Date.now()}`,
                          industry,
                          ownerId: activePlayer?.id ?? 'player-1',
                        },
                      })
                    }
                    type="button"
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3>Link tiles</h3>
              <div className="palette-grid">
                {linkKinds.map((kind) => (
                  <button
                    className="palette-tile palette-tile--link"
                    draggable
                    key={kind}
                    onDragStart={(event) =>
                      dragPiece(event, {
                        type: 'link',
                        tile: {
                          id: `${activePlayer?.id}-${kind}-${Date.now()}`,
                          kind,
                          ownerId: activePlayer?.id ?? 'player-1',
                        },
                      })
                    }
                    type="button"
                  >
                    {kind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3>Resource cubes</h3>
              <div className="resource-bank" onDragOver={(event) => event.preventDefault()} onDrop={dropOnResourceBank}>
                <div className="palette-grid">
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
              </div>
            </div>
          </aside>

          <div
            className={`board-map ${calibrationMode ? 'is-calibrating' : ''}`}
            onClick={calibrateBoardClick}
            ref={boardMapRef}
          >
            <img src="/src/assets/board/board.jpg" alt="Brass Birmingham board" />

            {calibratedBoardControlSpaces.map((space) => {
              const stackCount = game.stacks[space.stack].length

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
                  <div className="board-overlay-card__hud">
                    <span>{space.title}</span>
                    <strong>{stackCount}</strong>
                    <button
                      disabled={isHandFull || stackCount === 0}
                      onClick={() => drawFrom(space.stack)}
                      type="button"
                    >
                      {space.actionLabel}
                    </button>
                  </div>
                </div>
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

            {calibratedIndustrySpaces.map((space) => {
              const placement = game.board.industryPlacements[space.id]
              const resources = game.board.industryResourcePlacements[space.id] ?? []

              return (
                <button
                  aria-label={`${space.id}: ${space.city}, allows ${space.allowedIndustries.join(
                    ' or ',
                  )}`}
                  title={`${space.id}: ${space.allowedIndustries.join(' / ')}`}
                  className={`board-space board-space--industry ${
                    placement ? 'is-occupied' : ''
                  }`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnIndustrySpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                  }}
                  type="button"
                >
                  <span className="industry-space-label">
                    {placement ? placement.industry : space.allowedIndustries.map((industry) => industry[0]).join('/')}
                  </span>
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

              return (
                <button
                  aria-label={`${space.from} to ${space.to} link space, allows ${space.allowedKinds.join(
                    ' or ',
                  )}`}
                  title={`${space.id}: ${space.allowedKinds.join(' / ')}`}
                  className={`board-space board-space--link ${
                    placement ? 'is-occupied' : ''
                  }`}
                  key={space.id}
                  onClick={(event) => event.stopPropagation()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnLinkSpace(event, space.id)}
                  style={{
                    left: `${space.x}%`,
                    top: `${space.y}%`,
                    transform: `translate(-50%, -50%) rotate(${space.rotation}deg)`,
                  }}
                  type="button"
                >
                  {placement ? placement.kind : ''}
                </button>
              )
            })}
          </div>
        </div>

        <details className="calibration-export">
          <summary>Copy calibrated board arrays</summary>
          <textarea readOnly value={calibrationExport} />
        </details>
      </section>

      <section className="panel hand-panel" aria-label="My hand">
        <div className="panel__header">
          <p className="eyebrow">Active hand</p>
          <h2>{activePlayer?.name}</h2>
          <p>
            Draw cards into this player&apos;s eight slots. Switch players above
            to manage every hand yourself.
          </p>
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
          <p>
            Location and industry cards go here when played. Wild cards return
            to their face-up stacks instead.
          </p>
        </div>
        {game.discardPile.length === 0 ? (
          <p>No standard cards discarded yet.</p>
        ) : (
          <ol className="discard-list">
            {game.discardPile.slice(-6).reverse().map((card) => (
              <li key={card.id}>
                <strong>{formatCard(card)}</strong>
                <span>{card.kind === 'location' ? 'Location' : 'Industry'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="table-layout">
        <article className="panel">
          <div className="panel__header">
            <p className="eyebrow">Draw deck</p>
            <h2>Standard card mix</h2>
          </div>
          <dl className="card-breakdown">
            {Object.entries(industryCounts).map(([industry, count]) => (
              <div key={industry}>
                <dt>{industry}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel wild-panel">
          <div className="panel__header">
            <p className="eyebrow">Face-up stacks</p>
            <h2>Wild card supply</h2>
          </div>
          <div className="wild-stacks">
            <div className="wild-stack">
              <span>Wild location</span>
              <strong>{game.stacks.wildLocation.length}</strong>
              <p>May stand in for any named location except farm breweries.</p>
            </div>
            <div className="wild-stack">
              <span>Wild industry</span>
              <strong>{game.stacks.wildIndustry.length}</strong>
              <p>May stand in for any industry card.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
