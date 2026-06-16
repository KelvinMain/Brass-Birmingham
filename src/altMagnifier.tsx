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
  '.player-board-tile, .developed-industry-tile, .playing-card, .palette-link-icon, .link-piece-icon'

const PLAYER_BOARD_LOUPE_SCALE = 2.5

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

  const backgroundImage = getComputedStyle(target).backgroundImage
  const backgroundUrl = parseCssUrl(backgroundImage)
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

export function getPlayerBoardLoupePayload(
  clientX: number,
  clientY: number,
): MagnifierPayload | null {
  const hoveredElement = document.elementFromPoint(clientX, clientY)
  if (!hoveredElement?.closest('.player-board-surface')) {
    return null
  }

  if (hoveredElement.closest('.player-board-tile')) {
    return null
  }

  const surface = hoveredElement.closest('.player-board-surface')
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
    label: boardImage.alt || 'Player board',
    region: {
      x: xRatio * 100,
      y: yRatio * 100,
      scale: PLAYER_BOARD_LOUPE_SCALE,
    },
  }
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
    return getMagnifyPayload(target)
  }

  return getPlayerBoardLoupePayload(clientX, clientY)
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
