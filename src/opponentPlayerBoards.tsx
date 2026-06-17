import type { CSSProperties } from 'react'

import type { LocalPlayer } from './game/game'
import {
  getPlayerBoardAssetColor,
  playerBoardIndustryTiles,
} from './game/playerBoard'
import type { PlayerBoardIndustryTile } from './game/playerBoard'
import { getPlayerBoardTileImageUrl, playerBoardImageUrl } from './playerBoardAssets'

type OpponentPlayerBoardsPanelProps = {
  players: LocalPlayer[]
  tiles?: PlayerBoardIndustryTile[]
  getRemainingTileCount: (playerId: string, tileId: string) => number
  getPlayerPieceStyle: (playerId: string) => CSSProperties
}

function OpponentPlayerBoard({
  player,
  tiles,
  getRemainingTileCount,
  getPlayerPieceStyle,
}: {
  player: LocalPlayer
  tiles: PlayerBoardIndustryTile[]
  getRemainingTileCount: (playerId: string, tileId: string) => number
  getPlayerPieceStyle: (playerId: string) => CSSProperties
}) {
  const assetColor = getPlayerBoardAssetColor(player.color)

  return (
    <article className="opponent-player-board" style={getPlayerPieceStyle(player.id)}>
      <header className="opponent-player-board__header">
        <h3>{player.name}</h3>
        <p>
          <span>Money</span>
          <strong>{player.money}</strong>
        </p>
      </header>
      <div className="player-board-surface opponent-player-board__surface">
        <img src={playerBoardImageUrl} alt={`${player.name} industry board`} />
        <div className="player-board-tile-grid">
          {tiles.map((tile) => {
            const remainingCount = getRemainingTileCount(player.id, tile.id)
            const isTopTileFlipped = player.flippedPlayerBoardTileIds.includes(tile.id)
            const imageUrl = getPlayerBoardTileImageUrl(assetColor, tile.id, isTopTileFlipped)

            return (
              <div
                aria-label={`${player.name}: ${tile.industry} level ${tile.level}, ${remainingCount} remaining`}
                className={`player-board-tile player-board-tile--readonly ${
                  remainingCount === 0 ? 'is-exhausted' : ''
                } ${isTopTileFlipped ? 'is-flipped' : ''}`}
                key={tile.id}
                style={{
                  backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
                  left: `${tile.x}%`,
                  top: `${tile.y}%`,
                }}
                title={`${tile.industry} ${tile.level}: ${remainingCount} remaining`}
              >
                {remainingCount > 1 ? (
                  <span className="player-board-tile-count">{remainingCount}</span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </article>
  )
}

export function OpponentPlayerBoardsPanel({
  players,
  tiles = playerBoardIndustryTiles,
  getRemainingTileCount,
  getPlayerPieceStyle,
}: OpponentPlayerBoardsPanelProps) {
  if (players.length === 0) {
    return null
  }

  return (
    <details className="opponent-boards__details">
      <summary className="opponent-boards__summary">
        <span className="eyebrow">Opponent boards</span>
        <span className="opponent-boards__title">View remaining industry tiles</span>
      </summary>
      <div className="opponent-boards__content">
        {players.map((player) => (
          <OpponentPlayerBoard
            getPlayerPieceStyle={getPlayerPieceStyle}
            getRemainingTileCount={getRemainingTileCount}
            key={player.id}
            player={player}
            tiles={tiles}
          />
        ))}
      </div>
    </details>
  )
}
