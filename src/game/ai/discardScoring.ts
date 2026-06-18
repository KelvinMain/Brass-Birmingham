import type { GameCard } from '../deck'

export const DISCARD_WILD_ADJUSTMENT = -400
export const DISCARD_BRIC_INDUSTRY_ADJUSTMENT = -250
export const DISCARD_INDUSTRY_ADJUSTMENT = -80
export const DISCARD_LOCATION_ADJUSTMENT = 40

export function getDiscardCardAdjustment(card: GameCard | undefined): number {
  if (!card) {
    return 0
  }

  if (card.kind === 'wild-location' || card.kind === 'wild-industry') {
    return DISCARD_WILD_ADJUSTMENT
  }

  if (card.kind === 'industry') {
    const keepsBricOption = card.industries.some(
      (industry) => industry === 'brewery' || industry === 'coal' || industry === 'iron',
    )

    return keepsBricOption ? DISCARD_BRIC_INDUSTRY_ADJUSTMENT : DISCARD_INDUSTRY_ADJUSTMENT
  }

  return DISCARD_LOCATION_ADJUSTMENT
}
