import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TitleScreen } from './titleScreen'

describe('TitleScreen', () => {
  it('offers offline, host, and join choices without title-page tips', () => {
    const markup = renderToStaticMarkup(
      <TitleScreen
        offlineSaveSummary={null}
        onBackToModes={() => undefined}
        onContinueOfflineGame={() => undefined}
        onHostOnlineGame={() => undefined}
        onJoinOnlineGame={() => undefined}
        onStartOfflineGame={() => undefined}
      />,
    )

    expect(markup).toContain('Play Offline')
    expect(markup).toContain('Host Online Game')
    expect(markup).toContain('Join Online Game')
    expect(markup).not.toContain('Controls and tips')
  })
})
