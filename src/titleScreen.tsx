import { useState } from 'react'

import type { PlayerCount } from './game/cards'
import { formatOfflineSaveAge } from './game/offlineSave'
import type { OfflineSaveSummary } from './game/offlineSave'

const playerCounts: PlayerCount[] = [2, 3, 4]

type TitleMode = 'modes' | 'offline' | 'vsAi' | 'host' | 'join'

type TitleScreenProps = {
  offlineSaveSummary: OfflineSaveSummary | null
  onBackToModes: () => void
  onContinueOfflineGame: () => void
  onHostOnlineGame: (playerCount: PlayerCount, hostName: string) => void
  onJoinOnlineGame: (roomCode: string, playerName: string) => void
  onStartOfflineGame: (playerCount: PlayerCount) => void
  onStartVsAiGame: (playerCount: PlayerCount) => void
}

export function TitleScreen({
  offlineSaveSummary,
  onBackToModes,
  onContinueOfflineGame,
  onHostOnlineGame,
  onJoinOnlineGame,
  onStartOfflineGame,
  onStartVsAiGame,
}: TitleScreenProps) {
  const [mode, setMode] = useState<TitleMode>('modes')
  const [hostPlayerCount, setHostPlayerCount] = useState<PlayerCount>(2)
  const [hostName, setHostName] = useState('Host')
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [joinPlayerName, setJoinPlayerName] = useState('Player')

  const backToModes = () => {
    setMode('modes')
    onBackToModes()
  }

  return (
    <section className="title-card" aria-labelledby="title-screen-heading">
      <p className="eyebrow">Local and online game</p>
      <h2 id="title-screen-heading">Brass: Birmingham</h2>
      <p className="lede">
        Choose offline hot-seat play, solo vs AI, host a private online room, or join a friend&apos;s
        room.
      </p>

      {mode === 'modes' && offlineSaveSummary ? (
        <div className="title-continue-panel" aria-label="Saved offline game">
          <p className="eyebrow">Saved offline game</p>
          <p className="title-continue-summary">
            {offlineSaveSummary.playerCount} players ·{' '}
            {offlineSaveSummary.era === 'canal' ? 'Canal' : 'Rail'} era · Round{' '}
            {offlineSaveSummary.roundNumber} · {offlineSaveSummary.activePlayerName}&apos;s turn ·
            Saved {formatOfflineSaveAge(offlineSaveSummary.savedAt)}
          </p>
          <div className="title-actions">
            <button onClick={onContinueOfflineGame} type="button">
              Continue Saved Game
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'modes' ? (
        <div className="title-actions title-actions--stacked" aria-label="Choose game mode">
          <button onClick={() => setMode('offline')} type="button">
            Play Offline
          </button>
          <button onClick={() => setMode('vsAi')} type="button">
            Play vs AI
          </button>
          <button onClick={() => setMode('host')} type="button">
            Host Online Game
          </button>
          <button onClick={() => setMode('join')} type="button">
            Join Online Game
          </button>
        </div>
      ) : null}

      {mode === 'offline' ? (
        <div className="title-mode-panel">
          <p className="eyebrow">Offline hot-seat</p>
          <p>Control every player from this browser.</p>
          {offlineSaveSummary ? (
            <>
              <p className="title-continue-note">
                Starting a new offline game replaces your saved game.
              </p>
              <div className="title-actions">
                <button onClick={onContinueOfflineGame} type="button">
                  Continue Saved Game
                </button>
              </div>
            </>
          ) : null}
          <div className="title-actions" aria-label="Start offline player count">
            {playerCounts.map((count) => (
              <button key={count} onClick={() => onStartOfflineGame(count)} type="button">
                Start {count}-player game
              </button>
            ))}
          </div>
          <button className="title-back-button" onClick={backToModes} type="button">
            Back
          </button>
        </div>
      ) : null}

      {mode === 'vsAi' ? (
        <div className="title-mode-panel">
          <p className="eyebrow">Solo vs AI</p>
          <p>You play as Player 1. AI opponents discard two random cards and pass on their turns.</p>
          {offlineSaveSummary ? (
            <p className="title-continue-note">
              Starting a new game replaces your saved offline game.
            </p>
          ) : null}
          <div className="title-actions" aria-label="Start vs AI player count">
            {playerCounts.map((count) => (
              <button key={count} onClick={() => onStartVsAiGame(count)} type="button">
                Start {count}-player game
              </button>
            ))}
          </div>
          <button className="title-back-button" onClick={backToModes} type="button">
            Back
          </button>
        </div>
      ) : null}

      {mode === 'host' ? (
        <form
          className="title-mode-panel"
          onSubmit={(event) => {
            event.preventDefault()
            onHostOnlineGame(hostPlayerCount, hostName.trim() || 'Host')
          }}
        >
          <p className="eyebrow">Host online</p>
          <label>
            Host name
            <input
              onChange={(event) => setHostName(event.target.value)}
              type="text"
              value={hostName}
            />
          </label>
          <label>
            Players
            <select
              onChange={(event) => setHostPlayerCount(Number(event.target.value) as PlayerCount)}
              value={hostPlayerCount}
            >
              {playerCounts.map((count) => (
                <option key={count} value={count}>
                  {count} players
                </option>
              ))}
            </select>
          </label>
          <div className="title-actions">
            <button type="submit">Create Room</button>
            <button onClick={backToModes} type="button">
              Back
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form
          className="title-mode-panel"
          onSubmit={(event) => {
            event.preventDefault()
            onJoinOnlineGame(joinRoomCode.trim().toUpperCase(), joinPlayerName.trim() || 'Player')
          }}
        >
          <p className="eyebrow">Join online</p>
          <label>
            Room code
            <input
              autoCapitalize="characters"
              onChange={(event) => setJoinRoomCode(event.target.value)}
              type="text"
              value={joinRoomCode}
            />
          </label>
          <label>
            Player name
            <input
              onChange={(event) => setJoinPlayerName(event.target.value)}
              type="text"
              value={joinPlayerName}
            />
          </label>
          <div className="title-actions">
            <button disabled={!joinRoomCode.trim()} type="submit">
              Join Room
            </button>
            <button onClick={backToModes} type="button">
              Back
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
