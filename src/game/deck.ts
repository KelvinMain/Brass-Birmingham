import { standardCards, wildCards } from './cards'
import type { PlayerCount, StandardCard, WildCard } from './cards'

export type GameCard = StandardCard | WildCard

export type WildStacks = {
  location: Extract<WildCard, { kind: 'wild-location' }>[]
  industry: Extract<WildCard, { kind: 'wild-industry' }>[]
}

export type DrawableStacks = {
  standard: StandardCard[]
  wildLocation: Extract<WildCard, { kind: 'wild-location' }>[]
  wildIndustry: Extract<WildCard, { kind: 'wild-industry' }>[]
}

export type DrawResult<T> = {
  drawn: T | undefined
  remaining: T[]
}

export const HAND_LIMIT = 8

export function createStandardDeck(): StandardCard[] {
  return [...standardCards]
}

export function getDeckForPlayerCount(playerCount: PlayerCount): StandardCard[] {
  return standardCards.filter(
    (card) => card.availableInPlayerCounts.includes(playerCount),
  )
}

export function createWildStacks(): WildStacks {
  return {
    location: wildCards.filter(
      (card): card is Extract<WildCard, { kind: 'wild-location' }> =>
        card.kind === 'wild-location',
    ),
    industry: wildCards.filter(
      (card): card is Extract<WildCard, { kind: 'wild-industry' }> =>
        card.kind === 'wild-industry',
    ),
  }
}

export function createDrawableStacks(playerCount: PlayerCount): DrawableStacks {
  const wildStacks = createWildStacks()

  return {
    standard: getDeckForPlayerCount(playerCount),
    wildLocation: wildStacks.location,
    wildIndustry: wildStacks.industry,
  }
}

export function drawFromStack<T>(stack: T[]): DrawResult<T> {
  const [drawn, ...remaining] = stack

  return {
    drawn,
    remaining,
  }
}

export function addCardToHand<T>(hand: T[], card: T): T[] {
  if (hand.length >= HAND_LIMIT) {
    return [...hand]
  }

  return [...hand, card]
}

export function shuffleDeck<T>(cards: T[], random = Math.random): T[] {
  const shuffled = [...cards]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}
