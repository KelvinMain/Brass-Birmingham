export type PlayerCount = 2 | 3 | 4

export type Industry =
  | 'coal'
  | 'iron'
  | 'brewery'
  | 'cotton'
  | 'manufacturer'
  | 'pottery'

export type StandardCard =
  | {
      id: string
      kind: 'location'
      name: string
      color: string
      availableInPlayerCounts: PlayerCount[]
    }
  | {
      id: string
      kind: 'industry'
      industries: Industry[]
      availableInPlayerCounts: PlayerCount[]
    }

export type WildCard =
  | {
      id: string
      kind: 'wild-location'
    }
  | {
      id: string
      kind: 'wild-industry'
    }

type CountByPlayer = Record<PlayerCount, number>

type LocationCardRow = {
  name: string
  color: string
  counts: CountByPlayer
}

type IndustryCardRow = {
  idPrefix: string
  industries: Industry[]
  counts: CountByPlayer
}

const playerCounts: PlayerCount[] = [2, 3, 4]

const locationRows: LocationCardRow[] = [
  { name: 'Belper', color: '#D1EEEA', counts: { 2: 0, 3: 0, 4: 2 } },
  { name: 'Derby', color: '#D1EEEA', counts: { 2: 0, 3: 0, 4: 3 } },
  { name: 'Leek', color: '#87CEEB', counts: { 2: 0, 3: 2, 4: 2 } },
  { name: 'Stoke-on-Trent', color: '#87CEEB', counts: { 2: 0, 3: 3, 4: 3 } },
  { name: 'Stone', color: '#87CEEB', counts: { 2: 0, 3: 2, 4: 2 } },
  { name: 'Uttoxeter', color: '#87CEEB', counts: { 2: 0, 3: 1, 4: 2 } },
  { name: 'Stafford', color: '#ffd6d1', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Burton-on-Trent', color: '#ffd6d1', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Cannock', color: '#ffd6d1', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Tamworth', color: '#ffd6d1', counts: { 2: 1, 3: 1, 4: 1 } },
  { name: 'Walsall', color: '#ffd6d1', counts: { 2: 1, 3: 1, 4: 1 } },
  { name: 'Coalbrookdale', color: '#dacba3', counts: { 2: 3, 3: 3, 4: 3 } },
  { name: 'Dudley', color: '#dacba3', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Kidderminster', color: '#dacba3', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Wolverhampton', color: '#dacba3', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Worcester', color: '#dacba3', counts: { 2: 2, 3: 2, 4: 2 } },
  { name: 'Birmingham', color: '#d3bed5', counts: { 2: 3, 3: 3, 4: 3 } },
  { name: 'Coventry', color: '#d3bed5', counts: { 2: 3, 3: 3, 4: 3 } },
  { name: 'Nuneaton', color: '#d3bed5', counts: { 2: 1, 3: 1, 4: 1 } },
  { name: 'Redditch', color: '#d3bed5', counts: { 2: 1, 3: 1, 4: 1 } },
]

const industryRows: IndustryCardRow[] = [
  { idPrefix: 'iron-works', industries: ['iron'], counts: { 2: 4, 3: 4, 4: 4 } },
  { idPrefix: 'coal-mine', industries: ['coal'], counts: { 2: 2, 3: 2, 4: 3 } },
  {
    idPrefix: 'man-goods-cotton-mill',
    industries: ['manufacturer', 'cotton'],
    counts: { 2: 0, 3: 6, 4: 8 },
  },
  { idPrefix: 'pottery', industries: ['pottery'], counts: { 2: 2, 3: 2, 4: 3 } },
  { idPrefix: 'brewery', industries: ['brewery'], counts: { 2: 5, 3: 5, 4: 5 } },
]

const availablePlayerCounts = (counts: CountByPlayer, cardIndex: number) =>
  playerCounts.filter((playerCount) => cardIndex <= counts[playerCount])

const slugify = (value: string) => value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const createLocationCards = (row: LocationCardRow): StandardCard[] =>
  Array.from({ length: row.counts[4] }, (_, index) => ({
    id: `loc-${slugify(row.name)}-${index + 1}`,
    kind: 'location',
    name: row.name,
    color: row.color,
    availableInPlayerCounts: availablePlayerCounts(row.counts, index + 1),
  }))

const createIndustryCards = (row: IndustryCardRow): StandardCard[] =>
  Array.from({ length: row.counts[4] }, (_, index) => ({
    id: `industry-${row.idPrefix}-${index + 1}`,
    kind: 'industry',
    industries: row.industries,
    availableInPlayerCounts: availablePlayerCounts(row.counts, index + 1),
  }))

export const standardCards: StandardCard[] = [
  ...locationRows.flatMap(createLocationCards),
  ...industryRows.flatMap(createIndustryCards),
]

export const wildCards: WildCard[] = [
  { id: 'wild-location-1', kind: 'wild-location' },
  { id: 'wild-location-2', kind: 'wild-location' },
  { id: 'wild-location-3', kind: 'wild-location' },
  { id: 'wild-location-4', kind: 'wild-location' },
  { id: 'wild-industry-1', kind: 'wild-industry' },
  { id: 'wild-industry-2', kind: 'wild-industry' },
  { id: 'wild-industry-3', kind: 'wild-industry' },
  { id: 'wild-industry-4', kind: 'wild-industry' },
]
