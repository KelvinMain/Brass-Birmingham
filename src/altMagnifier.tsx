import { useEffect, useRef, useState } from 'react'

export type AltMagnifierRegion = {
  x: number
  y: number
  scale: number
}

export type AltMagnifierState = {
  active: boolean
  src: string | null
  label: string | null
  region: AltMagnifierRegion | null
}

const MAGNIFY_SELECTOR =
  '.player-board-tile, .developed-industry-tile, .playing-card, .palette-link-icon, .link-piece-icon, .board-space--industry.has-tile-image, .board-space--link.is-occupied, .merchant-tile-face, .board-overlay-card, .market-cube-button, .income-marker, .victory-point-marker'

const PLAYER_BOARD_LOUPE_SCALE = 2.5
const GAME_BOARD_LOUPE_SCALE = 2.5

type MagnifierPayload = {
  src: string
  label?: string
  region?: AltMagnifierRegion
}

function parseCssUrl(value: string): string | null {
  const match = value.match(/url\(["']?(.+?)["']?\)/)
  return match?.[1] ?? null
}

function getCssVarUrl(element: Element, varName: string): string | null {
  const value = getComputedStyle(element).getPropertyValue(varName).trim()
  if (!value) {
    return null
  }

  return parseCssUrl(value) ?? value
}

function getCssVarColor(element: Element, varName: string): string | null {
  const value = getComputedStyle(element).getPropertyValue(varName).trim()
  return value || null
}

function getFirstBackgroundImageUrl(element: Element): string | null {
  const backgroundImage = getComputedStyle(element).backgroundImage
  if (!backgroundImage || backgroundImage === 'none') {
    return null
  }

  return parseCssUrl(backgroundImage)
}

function createColorPreviewDataUrl(color: string, shape: 'circle' | 'diamond' = 'circle'): string {
  const svg =
    shape === 'diamond'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><polygon points="60,10 110,60 60,110 10,60" fill="${color}"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="${color}"/></svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function getMagnifyPayload(target: Element): MagnifierPayload | null {
  if (target instanceof HTMLImageElement && target.src) {
    return { src: target.src, label: target.alt || undefined }
  }

  const dataSrc = target.getAttribute('data-magnify-src')
  if (dataSrc) {
    return {
      src: dataSrc,
      label: target.getAttribute('aria-label') ?? undefined,
    }
  }

  if (target.classList.contains('playing-card')) {
    const faceUrl = getCssVarUrl(target, '--card-face-image')
    if (faceUrl) {
      return {
        src: faceUrl,
        label: target.querySelector('.playing-card__label span')?.textContent?.trim() || undefined,
      }
    }
  }

  if (target.classList.contains('playing-card__image')) {
    const card = target.closest('.playing-card')
    return card ? getMagnifyPayload(card) : null
  }

  if (target.classList.contains('link-piece-icon')) {
    const linkSpace = target.closest('.board-space--link')
    if (linkSpace) {
      const src = getCssVarUrl(linkSpace, '--link-tile-image')
      if (src) {
        return {
          src,
          label: linkSpace.getAttribute('aria-label') ?? undefined,
        }
      }
    }
  }

  if (target.classList.contains('board-space--industry') && target.classList.contains('has-tile-image')) {
    const src = getCssVarUrl(target, '--industry-tile-image')
    if (src) {
      return {
        src,
        label: target.getAttribute('aria-label') ?? undefined,
      }
    }
  }

  if (target.classList.contains('board-space--link') && target.classList.contains('is-occupied')) {
    const src = getCssVarUrl(target, '--link-tile-image')
    if (src) {
      return {
        src,
        label: target.getAttribute('aria-label') ?? undefined,
      }
    }
  }

  if (target.classList.contains('merchant-tile-face')) {
    const merchantSpace = target.closest('.board-space--merchant')
    const src = getFirstBackgroundImageUrl(target)
    if (src) {
      return {
        src,
        label: merchantSpace?.getAttribute('aria-label') ?? undefined,
      }
    }
  }

  if (target.classList.contains('board-overlay-card')) {
    const face = target.querySelector('.board-overlay-card__face')
    if (face) {
      const src = getFirstBackgroundImageUrl(face)
      if (src) {
        return {
          src,
          label: target.getAttribute('title') ?? undefined,
        }
      }
    }
  }

  if (target.classList.contains('market-cube-button')) {
    const color = getComputedStyle(target).backgroundColor
    const kind = Array.from(target.classList)
      .find((className) => className.startsWith('market-cube-button--'))
      ?.slice('market-cube-button--'.length)

    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
      return {
        src: createColorPreviewDataUrl(color),
        label: kind ? `${kind} cube` : 'Resource cube',
      }
    }
  }

  if (
    target.classList.contains('income-marker') ||
    target.classList.contains('victory-point-marker')
  ) {
    const color =
      getCssVarColor(target, '--owner-color') ?? getComputedStyle(target).backgroundColor
    const shape = target.classList.contains('victory-point-marker') ? 'diamond' : 'circle'

    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
      return {
        src: createColorPreviewDataUrl(color, shape),
        label: target.getAttribute('aria-label') ?? undefined,
      }
    }
  }

  const backgroundUrl = getFirstBackgroundImageUrl(target)
  if (backgroundUrl) {
    return {
      src: backgroundUrl,
      label:
        target.getAttribute('aria-label') ??
        target.getAttribute('title') ??
        undefined,
    }
  }

  return null
}

function getBoardLoupePayload(
  clientX: number,
  clientY: number,
  surfaceSelector: string,
  skipSelector: string | null,
  scale: number,
  fallbackLabel: string,
): MagnifierPayload | null {
  const hoveredElement = document.elementFromPoint(clientX, clientY)
  if (!hoveredElement?.closest(surfaceSelector)) {
    return null
  }

  if (skipSelector && hoveredElement.closest(skipSelector)) {
    return null
  }

  const surface = hoveredElement.closest(surfaceSelector)
  const boardImage = surface?.querySelector('img')
  if (!(boardImage instanceof HTMLImageElement) || !boardImage.src) {
    return null
  }

  const rect = boardImage.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return null
  }

  const xRatio = (clientX - rect.left) / rect.width
  const yRatio = (clientY - rect.top) / rect.height
  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) {
    return null
  }

  return {
    src: boardImage.currentSrc || boardImage.src,
    label: boardImage.alt || fallbackLabel,
    region: {
      x: xRatio * 100,
      y: yRatio * 100,
      scale,
    },
  }
}

export function getPlayerBoardLoupePayload(
  clientX: number,
  clientY: number,
): MagnifierPayload | null {
  return getBoardLoupePayload(
    clientX,
    clientY,
    '.player-board-surface',
    '.player-board-tile',
    PLAYER_BOARD_LOUPE_SCALE,
    'Player board',
  )
}

export function getGameBoardLoupePayload(
  clientX: number,
  clientY: number,
): MagnifierPayload | null {
  return getBoardLoupePayload(
    clientX,
    clientY,
    '.board-map',
    null,
    GAME_BOARD_LOUPE_SCALE,
    'Game board',
  )
}

export function findMagnifyTarget(element: Element | null): Element | null {
  let current = element

  while (current && current !== document.body) {
    if (current.matches(MAGNIFY_SELECTOR)) {
      return current
    }

    current = current.parentElement
  }

  return null
}

function getMagnifierPayloadAtPoint(clientX: number, clientY: number): MagnifierPayload | null {
  const hoveredElement = document.elementFromPoint(clientX, clientY)
  const target = findMagnifyTarget(hoveredElement)

  if (target) {
    const payload = getMagnifyPayload(target)
    if (payload) {
      return payload
    }
  }

  return getPlayerBoardLoupePayload(clientX, clientY) ?? getGameBoardLoupePayload(clientX, clientY)
}

function getPayloadKey(payload: MagnifierPayload): string {
  if (payload.region) {
    const { x, y, scale } = payload.region
    return `region:${payload.src}::${Math.round(x)}::${Math.round(y)}::${scale}::${payload.label ?? ''}`
  }

  return `element:${payload.src}::${payload.label ?? ''}`
}

export function useAltMagnifier(): AltMagnifierState {
  const [magnifier, setMagnifier] = useState<AltMagnifierState>({
    active: false,
    src: null,
    label: null,
    region: null,
  })
  const activeRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastPayloadRef = useRef<string | null>(null)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const deactivate = () => {
      activeRef.current = false
      lastPayloadRef.current = null
      setMagnifier({ active: false, src: null, label: null, region: null })
    }

    const clearPreview = () => {
      if (lastPayloadRef.current === null) {
        return
      }

      lastPayloadRef.current = null
      setMagnifier((current) => ({ ...current, src: null, label: null, region: null }))
    }

    const updateFromPoint = (clientX: number, clientY: number) => {
      if (!activeRef.current) {
        return
      }

      const payload = getMagnifierPayloadAtPoint(clientX, clientY)
      if (!payload) {
        clearPreview()
        return
      }

      const payloadKey = getPayloadKey(payload)
      if (payloadKey === lastPayloadRef.current) {
        return
      }

      lastPayloadRef.current = payloadKey
      setMagnifier({
        active: true,
        src: payload.src,
        label: payload.label ?? null,
        region: payload.region ?? null,
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'AltLeft') {
        return
      }

      event.preventDefault()
      activeRef.current = true
      setMagnifier((current) => ({ ...current, active: true }))
      updateFromPoint(lastMouseRef.current.x, lastMouseRef.current.y)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'AltLeft') {
        deactivate()
      }
    }

    const onMouseMove = (event: MouseEvent) => {
      lastMouseRef.current = { x: event.clientX, y: event.clientY }

      if (!activeRef.current) {
        return
      }

      if (rafRef.current !== null) {
        return
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        updateFromPoint(event.clientX, event.clientY)
      })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', deactivate)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }

      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', deactivate)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return magnifier
}

export function AltMagnifierOverlay({ active, src, label, region }: AltMagnifierState) {
  if (!active || !src) {
    return null
  }

  return (
    <div aria-hidden="true" className="magnifier-overlay">
      <div className="magnifier-overlay__frame">
        {label ? <p className="magnifier-overlay__label">{label}</p> : null}
        {region ? (
          <div
            className="magnifier-overlay__viewport"
            style={{
              backgroundImage: `url('${src}')`,
              backgroundPosition: `${region.x}% ${region.y}%`,
              backgroundSize: `${region.scale * 100}%`,
            }}
          />
        ) : (
          <img alt="" className="magnifier-overlay__image" src={src} />
        )}
      </div>
    </div>
  )
}
