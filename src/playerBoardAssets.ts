import type { PlayerBoardTileAssetColor } from './game/playerBoard'

export const playerBoardImageUrl = new URL(
  './assets/player-board/player-board-reference.png',
  import.meta.url,
).href

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

export function getPlayerBoardTileImageUrl(
  assetColor: PlayerBoardTileAssetColor,
  tileId: string,
  flipped = false,
): string | undefined {
  return flipped
    ? flippedPlayerBoardTileImageUrls[
        `./assets/player-board/tiles-flipped/${assetColor}/${tileId}.png`
      ]
    : playerBoardTileImageUrls[`./assets/player-board/tiles/${assetColor}/${tileId}.png`]
}
