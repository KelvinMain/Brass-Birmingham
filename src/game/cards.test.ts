import { describe, expect, it } from 'vitest'

import { standardCards, wildCards } from './cards.ts'
import {
  createDrawableStacks,
  createStandardDeck,
  createWildStacks,
  drawFromStack,
  getDeckForPlayerCount,
  addCardToHand,
} from './deck.ts'

describe('Brass: Birmingham cards', () => {
  it('models the 64-card standard draw deck separately from wild cards', () => {
    expect(standardCards).toHaveLength(64)
    expect(wildCards).toHaveLength(8)
    expect(createStandardDeck()).toHaveLength(64)
  })

  it('keeps wild cards in two face-up stacks of four cards each', () => {
    const stacks = createWildStacks()

    expect(stacks.location).toHaveLength(4)
    expect(stacks.industry).toHaveLength(4)
    expect(stacks.location.every((card) => card.kind === 'wild-location')).toBe(true)
    expect(stacks.industry.every((card) => card.kind === 'wild-industry')).toBe(true)
  })

  it('uses unique card IDs across standard and wild cards', () => {
    const ids = [...standardCards, ...wildCards].map((card) => card.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains only location and industry cards in the standard draw deck', () => {
    const standardKinds = new Set(standardCards.map((card) => card.kind))

    expect(standardKinds).toEqual(new Set(['location', 'industry']))
  })

  it('keeps all standard cards in the 4-player deck', () => {
    expect(getDeckForPlayerCount(4)).toHaveLength(64)
  })

  it('uses the supplied player-count deck sizes', () => {
    expect(getDeckForPlayerCount(2)).toHaveLength(40)
    expect(getDeckForPlayerCount(3)).toHaveLength(54)
    expect(getDeckForPlayerCount(4)).toHaveLength(64)
  })

  it('uses the supplied location counts and colors', () => {
    const countLocation = (playerCount: 2 | 3 | 4, name: string) =>
      getDeckForPlayerCount(playerCount).filter(
        (card) => card.kind === 'location' && card.name === name,
      )

    expect(countLocation(2, 'Derby')).toHaveLength(0)
    expect(countLocation(3, 'Derby')).toHaveLength(0)
    expect(countLocation(4, 'Derby')).toHaveLength(3)
    expect(countLocation(4, 'Derby')[0]).toMatchObject({ color: '#D1EEEA' })

    expect(countLocation(3, 'Uttoxeter')).toHaveLength(1)
    expect(countLocation(4, 'Uttoxeter')).toHaveLength(2)
    expect(countLocation(4, 'Birmingham')).toHaveLength(3)
    expect(countLocation(4, 'Birmingham')[0]).toMatchObject({ color: '#d3bed5' })
  })

  it('uses the supplied industry card counts', () => {
    const countIndustry = (playerCount: 2 | 3 | 4, industries: string[]) =>
      getDeckForPlayerCount(playerCount).filter(
        (card) =>
          card.kind === 'industry' &&
          card.industries.join('/') === industries.join('/'),
      )

    expect(countIndustry(2, ['manufacturer', 'cotton'])).toHaveLength(0)
    expect(countIndustry(3, ['manufacturer', 'cotton'])).toHaveLength(6)
    expect(countIndustry(4, ['manufacturer', 'cotton'])).toHaveLength(8)
    expect(countIndustry(2, ['coal'])).toHaveLength(2)
    expect(countIndustry(4, ['coal'])).toHaveLength(3)
  })

  it('creates three drawable stacks for the selected player count', () => {
    const stacks = createDrawableStacks(4)

    expect(stacks.standard).toHaveLength(64)
    expect(stacks.wildLocation).toHaveLength(4)
    expect(stacks.wildIndustry).toHaveLength(4)
  })

  it('draws the top card without mutating the original stack', () => {
    const stack = createStandardDeck()
    const result = drawFromStack(stack)

    expect(result.drawn).toEqual(stack[0])
    expect(result.remaining).toEqual(stack.slice(1))
    expect(stack).toHaveLength(64)
  })

  it('returns no card when drawing from an empty stack', () => {
    expect(drawFromStack([])).toEqual({
      drawn: undefined,
      remaining: [],
    })
  })

  it('adds drawn cards to a hand until the eight-card hand limit', () => {
    const stack = createStandardDeck()
    const hand = stack.slice(0, 7)
    const nextCard = stack[7]

    expect(addCardToHand(hand, nextCard)).toEqual([...hand, nextCard])
    expect(addCardToHand([...hand, nextCard], stack[8])).toEqual([
      ...hand,
      nextCard,
    ])
  })
})
