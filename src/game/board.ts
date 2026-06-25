import type { Industry, PlayerCount } from './cards'

export type BoardPoint = {
  x: number
  y: number
}

export type BoardRect = {
  left: number
  top: number
  width: number
  height: number
}

export type IndustrySpace = BoardPoint & {
  id: string
  city: string
  allowedIndustries: Industry[]
}

export type LinkKind = 'canal' | 'rail'

export type LinkSpace = BoardPoint & {
  id: string
  from: string
  to: string
  via?: string
  allowedKinds: LinkKind[]
  rotation: number
}

export type IndustryTilePlacement = {
  id: string
  flipped?: boolean
  industry: Industry
  ownerId: string
  tileId?: string
}

export type LinkTilePlacement = {
  id: string
  kind: LinkKind
  ownerId: string
}

export type BoardControlStack = 'standard' | 'wildLocation' | 'wildIndustry'

export type BoardControlSpace = BoardPoint & {
  id: string
  stack: BoardControlStack
  title: string
  actionLabel: string
}

export type TurnMarkerSpace = BoardPoint & {
  id: string
  turnIndex: 1 | 2 | 3 | 4
}

export const resourceCubeKinds = ['coal', 'iron', 'beer'] as const

export type ResourceCubeKind = (typeof resourceCubeKinds)[number]

export type MarketResourceSpace = BoardPoint & {
  id: string
  kind: Extract<ResourceCubeKind, 'coal' | 'iron'>
  label: string
  marketIndex: number
}

export type BeerResourceSpace = BoardPoint & {
  id: string
  kind: Extract<ResourceCubeKind, 'beer'>
  label: string
  beerIndex: number
}

export type MerchantTileSpace = BoardPoint & {
  id: string
  label: string
  merchantIndex: number
}

export type IncomeTrackSpace = BoardPoint & {
  id: string
  value: number
}

export type MerchantTileKind = 'all' | 'cotton' | 'manufacturer' | 'none' | 'pottery'

export type MerchantTile = {
  id: string
  tileIndex: number
  kind: MerchantTileKind
  label: string
}

export type MerchantTilePlacement = MerchantTile & {
  spaceId: string
}

export type MarketResourcePlacement = {
  id: string
  kind: ResourceCubeKind
  spaceId: string
}

export type BoardState = {
  industryPlacements: Record<string, IndustryTilePlacement>
  industryResourcePlacements: Record<string, MarketResourcePlacement[]>
  beerResourcePlacements: Record<string, MarketResourcePlacement>
  linkPlacements: Record<string, LinkTilePlacement>
  marketResourcePlacements: Record<string, MarketResourcePlacement>
  merchantTilePlacements: Record<string, MerchantTilePlacement>
}

const industryResourceRules: Partial<Record<Industry, { kind: ResourceCubeKind; capacity: number }>> = {
  brewery: { kind: 'beer', capacity: 2 },
  coal: { kind: 'coal', capacity: 5 },
  iron: { kind: 'iron', capacity: 6 },
}

export function getIndustryTileResourceCapacity(industry: Industry): number {
  return industryResourceRules[industry]?.capacity ?? 0
}

export const marketLocations = [
  'Warrington',
  'Nottingham',
  'Shrewsbury',
  'Gloucester',
  'Oxford',
] as const

export const boardControlSpaces: BoardControlSpace[] = [
  {
    id: 'standard-draw-stack',
    stack: 'standard',
    title: 'Standard draw deck',
    actionLabel: 'Draw',
    x: 13.98,
    y: 15.81,
  },
  {
    id: 'wild-location-stack',
    stack: 'wildLocation',
    title: 'Wild location',
    actionLabel: 'Take',
    x: 13.98,
    y: 29.61,
  },
  {
    id: 'wild-industry-stack',
    stack: 'wildIndustry',
    title: 'Wild industry',
    actionLabel: 'Take',
    x: 13.98,
    y: 43.17,
  },
]

export const turnMarkerSpaces: TurnMarkerSpace[] = [
  {
    id: 'turn-marker-1',
    turnIndex: 1,
    x: 10.65,
    y: 67.5,
  },
  {
    id: 'turn-marker-2',
    turnIndex: 2,
    x: 10.65,
    y: 75.5,
  },
  {
    id: 'turn-marker-3',
    turnIndex: 3,
    x: 10.65,
    y: 83.5,
  },
  {
    id: 'turn-marker-4',
    turnIndex: 4,
    x: 10.65,
    y: 91.5,
  },
]

export const incomeTrackSpaces: IncomeTrackSpace[] = [
  {
    "id": "income-0",
    "value": 0,
    "x": 1.67,
    "y": 92.9
  },
  {
    "id": "income-1",
    "value": 1,
    "x": 1.67,
    "y": 89.31
  },
  {
    "id": "income-2",
    "value": 2,
    "x": 1.67,
    "y": 85.73
  },
  {
    "id": "income-3",
    "value": 3,
    "x": 1.67,
    "y": 82.14
  },
  {
    "id": "income-4",
    "value": 4,
    "x": 1.67,
    "y": 78.55
  },
  {
    "id": "income-5",
    "value": 5,
    "x": 1.67,
    "y": 74.97
  },
  {
    "id": "income-6",
    "value": 6,
    "x": 1.67,
    "y": 71.38
  },
  {
    "id": "income-7",
    "value": 7,
    "x": 1.67,
    "y": 67.79
  },
  {
    "id": "income-8",
    "value": 8,
    "x": 1.67,
    "y": 64.2
  },
  {
    "id": "income-9",
    "value": 9,
    "x": 1.67,
    "y": 60.62
  },
  {
    "id": "income-10",
    "value": 10,
    "x": 1.67,
    "y": 57.03
  },
  {
    "id": "income-11",
    "value": 11,
    "x": 1.42,
    "y": 52.71
  },
  {
    "id": "income-12",
    "value": 12,
    "x": 1.62,
    "y": 49.78
  },
  {
    "id": "income-13",
    "value": 13,
    "x": 1.62,
    "y": 45.58
  },
  {
    "id": "income-14",
    "value": 14,
    "x": 1.62,
    "y": 42.65
  },
  {
    "id": "income-15",
    "value": 15,
    "x": 1.62,
    "y": 38.25
  },
  {
    "id": "income-16",
    "value": 16,
    "x": 1.62,
    "y": 35.52
  },
  {
    "id": "income-17",
    "value": 17,
    "x": 1.62,
    "y": 31.51
  },
  {
    "id": "income-18",
    "value": 18,
    "x": 1.62,
    "y": 28.49
  },
  {
    "id": "income-19",
    "value": 19,
    "x": 1.62,
    "y": 24.29
  },
  {
    "id": "income-20",
    "value": 20,
    "x": 1.62,
    "y": 21.16
  },
  {
    "id": "income-21",
    "value": 21,
    "x": 1.62,
    "y": 17.06
  },
  {
    "id": "income-22",
    "value": 22,
    "x": 1.62,
    "y": 14.13
  },
  {
    "id": "income-23",
    "value": 23,
    "x": 1.62,
    "y": 10.26
  },
  {
    "id": "income-24",
    "value": 24,
    "x": 1.62,
    "y": 7.1
  },
  {
    "id": "income-25",
    "value": 25,
    "x": 6.5,
    "y": 1.57
  },
  {
    "id": "income-26",
    "value": 26,
    "x": 9.53,
    "y": 1.57
  },
  {
    "id": "income-27",
    "value": 27,
    "x": 13.44,
    "y": 1.57
  },
  {
    "id": "income-28",
    "value": 28,
    "x": 16.56,
    "y": 1.37
  },
  {
    "id": "income-29",
    "value": 29,
    "x": 20.66,
    "y": 1.57
  },
  {
    "id": "income-30",
    "value": 30,
    "x": 23.88,
    "y": 1.66
  },
  {
    "id": "income-31",
    "value": 31,
    "x": 29.06,
    "y": 1.66
  },
  {
    "id": "income-32",
    "value": 32,
    "x": 31.89,
    "y": 1.57
  },
  {
    "id": "income-33",
    "value": 33,
    "x": 34.82,
    "y": 1.57
  },
  {
    "id": "income-34",
    "value": 34,
    "x": 40.49,
    "y": 1.66
  },
  {
    "id": "income-35",
    "value": 35,
    "x": 43.42,
    "y": 1.66
  },
  {
    "id": "income-36",
    "value": 36,
    "x": 46.54,
    "y": 1.57
  },
  {
    "id": "income-37",
    "value": 37,
    "x": 52.11,
    "y": 1.57
  },
  {
    "id": "income-38",
    "value": 38,
    "x": 55.33,
    "y": 1.57
  },
  {
    "id": "income-39",
    "value": 39,
    "x": 57.97,
    "y": 1.47
  },
  {
    "id": "income-40",
    "value": 40,
    "x": 63.73,
    "y": 1.66
  },
  {
    "id": "income-41",
    "value": 41,
    "x": 66.66,
    "y": 1.47
  },
  {
    "id": "income-42",
    "value": 42,
    "x": 69.69,
    "y": 1.57
  },
  {
    "id": "income-43",
    "value": 43,
    "x": 75.64,
    "y": 1.57
  },
  {
    "id": "income-44",
    "value": 44,
    "x": 78.48,
    "y": 1.47
  },
  {
    "id": "income-45",
    "value": 45,
    "x": 81.31,
    "y": 1.57
  },
  {
    "id": "income-46",
    "value": 46,
    "x": 87.07,
    "y": 1.47
  },
  {
    "id": "income-47",
    "value": 47,
    "x": 89.9,
    "y": 1.57
  },
  {
    "id": "income-48",
    "value": 48,
    "x": 92.93,
    "y": 1.57
  },
  {
    "id": "income-49",
    "value": 49,
    "x": 98.49,
    "y": 8.29
  },
  {
    "id": "income-50",
    "value": 50,
    "x": 98.4,
    "y": 11.22
  },
  {
    "id": "income-51",
    "value": 51,
    "x": 98.49,
    "y": 14.15
  },
  {
    "id": "income-52",
    "value": 52,
    "x": 98.49,
    "y": 19.82
  },
  {
    "id": "income-53",
    "value": 53,
    "x": 98.49,
    "y": 22.65
  },
  {
    "id": "income-54",
    "value": 54,
    "x": 98.49,
    "y": 25.68
  },
  {
    "id": "income-55",
    "value": 55,
    "x": 98.49,
    "y": 31.44
  },
  {
    "id": "income-56",
    "value": 56,
    "x": 98.59,
    "y": 34.37
  },
  {
    "id": "income-57",
    "value": 57,
    "x": 98.49,
    "y": 37.39
  },
  {
    "id": "income-58",
    "value": 58,
    "x": 98.4,
    "y": 43.06
  },
  {
    "id": "income-59",
    "value": 59,
    "x": 98.49,
    "y": 46.09
  },
  {
    "id": "income-60",
    "value": 60,
    "x": 98.49,
    "y": 49.02
  },
  {
    "id": "income-61",
    "value": 61,
    "x": 98.3,
    "y": 54.7
  },
  {
    "id": "income-62",
    "value": 62,
    "x": 98.3,
    "y": 57.53
  },
  {
    "id": "income-63",
    "value": 63,
    "x": 98.49,
    "y": 60.46
  },
  {
    "id": "income-64",
    "value": 64,
    "x": 98.59,
    "y": 63.19
  },
  {
    "id": "income-65",
    "value": 65,
    "x": 98.49,
    "y": 68.85
  },
  {
    "id": "income-66",
    "value": 66,
    "x": 98.49,
    "y": 71.79
  },
  {
    "id": "income-67",
    "value": 67,
    "x": 98.49,
    "y": 74.72
  },
  {
    "id": "income-68",
    "value": 68,
    "x": 98.4,
    "y": 77.55
  },
  {
    "id": "income-69",
    "value": 69,
    "x": 98.4,
    "y": 83.24
  },
  {
    "id": "income-70",
    "value": 70,
    "x": 98.49,
    "y": 86.18
  },
  {
    "id": "income-71",
    "value": 71,
    "x": 98.4,
    "y": 88.9
  },
  {
    "id": "income-72",
    "value": 72,
    "x": 98.3,
    "y": 91.83
  },
  {
    "id": "income-73",
    "value": 73,
    "x": 93.22,
    "y": 98.37
  },
  {
    "id": "income-74",
    "value": 74,
    "x": 90.29,
    "y": 98.28
  },
  {
    "id": "income-75",
    "value": 75,
    "x": 87.36,
    "y": 98.2
  },
  {
    "id": "income-76",
    "value": 76,
    "x": 84.33,
    "y": 98.48
  },
  {
    "id": "income-77",
    "value": 77,
    "x": 79.74,
    "y": 98.38
  },
  {
    "id": "income-78",
    "value": 78,
    "x": 76.81,
    "y": 98.46
  },
  {
    "id": "income-79",
    "value": 79,
    "x": 73.89,
    "y": 98.46
  },
  {
    "id": "income-80",
    "value": 80,
    "x": 71.15,
    "y": 98.48
  },
  {
    "id": "income-81",
    "value": 81,
    "x": 66.17,
    "y": 98.39
  },
  {
    "id": "income-82",
    "value": 82,
    "x": 63.24,
    "y": 98.4
  },
  {
    "id": "income-83",
    "value": 83,
    "x": 60.41,
    "y": 98.51
  },
  {
    "id": "income-84",
    "value": 84,
    "x": 57.58,
    "y": 98.34
  },
  {
    "id": "income-85",
    "value": 85,
    "x": 52.89,
    "y": 98.38
  },
  {
    "id": "income-86",
    "value": 86,
    "x": 49.96,
    "y": 98.45
  },
  {
    "id": "income-87",
    "value": 87,
    "x": 47.22,
    "y": 98.27
  },
  {
    "id": "income-88",
    "value": 88,
    "x": 44.3,
    "y": 98.38
  },
  {
    "id": "income-89",
    "value": 89,
    "x": 39.41,
    "y": 98.46
  },
  {
    "id": "income-90",
    "value": 90,
    "x": 36.48,
    "y": 98.28
  },
  {
    "id": "income-91",
    "value": 91,
    "x": 33.85,
    "y": 98.48
  },
  {
    "id": "income-92",
    "value": 92,
    "x": 30.92,
    "y": 98.5
  },
  {
    "id": "income-93",
    "value": 93,
    "x": 25.64,
    "y": 98.4
  },
  {
    "id": "income-94",
    "value": 94,
    "x": 22.71,
    "y": 98.47
  },
  {
    "id": "income-95",
    "value": 95,
    "x": 19.98,
    "y": 98.39
  },
  {
    "id": "income-96",
    "value": 96,
    "x": 17.05,
    "y": 98.5
  },
  {
    "id": "income-97",
    "value": 97,
    "x": 12.46,
    "y": 98.39
  },
  {
    "id": "income-98",
    "value": 98,
    "x": 9.53,
    "y": 98.39
  },
  {
    "id": "income-99",
    "value": 99,
    "x": 6.5,
    "y": 98.37
  }
]

export const marketResourceSpaces: MarketResourceSpace[] = [
  {
    id: 'coal-market-1',
    kind: 'coal',
    label: 'coal market 1',
    marketIndex: 1,
    x: 83.96,
    y: 50.42,
  },
  {
    id: 'coal-market-2',
    kind: 'coal',
    label: 'coal market 2',
    marketIndex: 2,
    x: 86.14,
    y: 50.42,
  },
  {
    id: 'coal-market-3',
    kind: 'coal',
    label: 'coal market 3',
    marketIndex: 3,
    x: 83.96,
    y: 47.47,
  },
  {
    id: 'coal-market-4',
    kind: 'coal',
    label: 'coal market 4',
    marketIndex: 4,
    x: 86.14,
    y: 47.47,
  },
  {
    id: 'coal-market-5',
    kind: 'coal',
    label: 'coal market 5',
    marketIndex: 5,
    x: 83.96,
    y: 44.52,
  },
  {
    id: 'coal-market-6',
    kind: 'coal',
    label: 'coal market 6',
    marketIndex: 6,
    x: 86.14,
    y: 44.52,
  },
  {
    id: 'coal-market-7',
    kind: 'coal',
    label: 'coal market 7',
    marketIndex: 7,
    x: 83.96,
    y: 41.57,
  },
  {
    id: 'coal-market-8',
    kind: 'coal',
    label: 'coal market 8',
    marketIndex: 8,
    x: 86.14,
    y: 41.57,
  },
  {
    id: 'coal-market-9',
    kind: 'coal',
    label: 'coal market 9',
    marketIndex: 9,
    x: 83.96,
    y: 38.62,
  },
  {
    id: 'coal-market-10',
    kind: 'coal',
    label: 'coal market 10',
    marketIndex: 10,
    x: 86.14,
    y: 38.62,
  },
  {
    id: 'coal-market-11',
    kind: 'coal',
    label: 'coal market 11',
    marketIndex: 11,
    x: 83.96,
    y: 35.67,
  },
  {
    id: 'coal-market-12',
    kind: 'coal',
    label: 'coal market 12',
    marketIndex: 12,
    x: 86.14,
    y: 35.67,
  },
  {
    id: 'coal-market-13',
    kind: 'coal',
    label: 'coal market 13',
    marketIndex: 13,
    x: 83.96,
    y: 32.72,
  },
  {
    id: 'coal-market-14',
    kind: 'coal',
    label: 'coal market 14',
    marketIndex: 14,
    x: 86.14,
    y: 32.72,
  },
  {
    id: 'iron-market-1',
    kind: 'iron',
    label: 'iron market 1',
    marketIndex: 1,
    x: 89.23,
    y: 50.42,
  },
  {
    id: 'iron-market-2',
    kind: 'iron',
    label: 'iron market 2',
    marketIndex: 2,
    x: 91.41,
    y: 50.42,
  },
  {
    id: 'iron-market-3',
    kind: 'iron',
    label: 'iron market 3',
    marketIndex: 3,
    x: 89.23,
    y: 47.47,
  },
  {
    id: 'iron-market-4',
    kind: 'iron',
    label: 'iron market 4',
    marketIndex: 4,
    x: 91.41,
    y: 47.47,
  },
  {
    id: 'iron-market-5',
    kind: 'iron',
    label: 'iron market 5',
    marketIndex: 5,
    x: 89.23,
    y: 44.52,
  },
  {
    id: 'iron-market-6',
    kind: 'iron',
    label: 'iron market 6',
    marketIndex: 6,
    x: 91.41,
    y: 44.52,
  },
  {
    id: 'iron-market-7',
    kind: 'iron',
    label: 'iron market 7',
    marketIndex: 7,
    x: 89.23,
    y: 41.57,
  },
  {
    id: 'iron-market-8',
    kind: 'iron',
    label: 'iron market 8',
    marketIndex: 8,
    x: 91.41,
    y: 41.57,
  },
  {
    id: 'iron-market-9',
    kind: 'iron',
    label: 'iron market 9',
    marketIndex: 9,
    x: 89.23,
    y: 38.62,
  },
  {
    id: 'iron-market-10',
    kind: 'iron',
    label: 'iron market 10',
    marketIndex: 10,
    x: 91.41,
    y: 38.62,
  },
]

export const beerResourceSpaces: BeerResourceSpace[] = [
  {
    id: 'board-beer-1',
    kind: 'beer',
    label: 'board beer 1',
    beerIndex: 1,
    x: 24.39,
    y: 17.4,
  },
  {
    id: 'board-beer-2',
    kind: 'beer',
    label: 'board beer 2',
    beerIndex: 2,
    x: 30.81,
    y: 17.27,
  },
  {
    id: 'board-beer-3',
    kind: 'beer',
    label: 'board beer 3',
    beerIndex: 3,
    x: 87.35,
    y: 22.84,
  },
  {
    id: 'board-beer-4',
    kind: 'beer',
    label: 'board beer 4',
    beerIndex: 4,
    x: 93.77,
    y: 22.84,
  },
  {
    id: 'board-beer-5',
    kind: 'beer',
    label: 'board beer 5',
    beerIndex: 5,
    x: 12.65,
    y: 59.28,
  },
  {
    id: 'board-beer-6',
    kind: 'beer',
    label: 'board beer 6',
    beerIndex: 6,
    x: 78.87,
    y: 82.17,
  },
  {
    id: 'board-beer-7',
    kind: 'beer',
    label: 'board beer 7',
    beerIndex: 7,
    x: 85.29,
    y: 82.29,
  },
  {
    id: 'board-beer-8',
    kind: 'beer',
    label: 'board beer 8',
    beerIndex: 8,
    x: 57.08,
    y: 89.43,
  },
  {
    id: 'board-beer-9',
    kind: 'beer',
    label: 'board beer 9',
    beerIndex: 9,
    x: 63.5,
    y: 89.31,
  },
]

export const merchantTileSpaces: MerchantTileSpace[] = [
  {
    id: 'merchant-tile-1',
    label: 'merchant tile 1',
    merchantIndex: 1,
    x: 25.44,
    y: 13.43,
  },
  {
    id: 'merchant-tile-2',
    label: 'merchant tile 2',
    merchantIndex: 2,
    x: 29.91,
    y: 13.43,
  },
  {
    id: 'merchant-tile-3',
    label: 'merchant tile 3',
    merchantIndex: 3,
    x: 88,
    y: 18.99,
  },
  {
    id: 'merchant-tile-4',
    label: 'merchant tile 4',
    merchantIndex: 4,
    x: 92.84,
    y: 18.99,
  },
  {
    id: 'merchant-tile-5',
    label: 'merchant tile 5',
    merchantIndex: 5,
    x: 8.86,
    y: 60.26,
  },
  {
    id: 'merchant-tile-6',
    label: 'merchant tile 6',
    merchantIndex: 6,
    x: 79.65,
    y: 85.91,
  },
  {
    id: 'merchant-tile-7',
    label: 'merchant tile 7',
    merchantIndex: 7,
    x: 84.12,
    y: 85.91,
  },
  {
    id: 'merchant-tile-8',
    label: 'merchant tile 8',
    merchantIndex: 8,
    x: 57.99,
    y: 93.05,
  },
  {
    id: 'merchant-tile-9',
    label: 'merchant tile 9',
    merchantIndex: 9,
    x: 62.46,
    y: 93.05,
  },
]

export const merchantTiles: MerchantTile[] = [
  { id: 'merchant-tile-face-1', tileIndex: 1, kind: 'manufacturer', label: 'Man' },
  { id: 'merchant-tile-face-2', tileIndex: 2, kind: 'cotton', label: 'Cotton' },
  { id: 'merchant-tile-face-3', tileIndex: 3, kind: 'all', label: 'All' },
  { id: 'merchant-tile-face-4', tileIndex: 4, kind: 'none', label: 'None' },
  { id: 'merchant-tile-face-5', tileIndex: 5, kind: 'none', label: 'None' },
  { id: 'merchant-tile-face-6', tileIndex: 6, kind: 'pottery', label: 'Pottery' },
  { id: 'merchant-tile-face-7', tileIndex: 7, kind: 'none', label: 'None' },
  { id: 'merchant-tile-face-8', tileIndex: 8, kind: 'manufacturer', label: 'Man' },
  { id: 'merchant-tile-face-9', tileIndex: 9, kind: 'cotton', label: 'Cotton' },
]

const merchantSpaceIdsByPlayerCount: Record<PlayerCount, string[]> = {
  2: ['merchant-tile-5', 'merchant-tile-6', 'merchant-tile-7', 'merchant-tile-8', 'merchant-tile-9'],
  3: [
    'merchant-tile-1',
    'merchant-tile-2',
    'merchant-tile-5',
    'merchant-tile-6',
    'merchant-tile-7',
    'merchant-tile-8',
    'merchant-tile-9',
  ],
  4: [
    'merchant-tile-1',
    'merchant-tile-2',
    'merchant-tile-3',
    'merchant-tile-4',
    'merchant-tile-5',
    'merchant-tile-6',
    'merchant-tile-7',
    'merchant-tile-8',
    'merchant-tile-9',
  ],
}

function shuffleMerchantTiles<T>(items: T[], random = Math.random): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function createInitialMerchantTilePlacements(
  playerCount: PlayerCount,
  random = Math.random,
): Record<string, MerchantTilePlacement> {
  const spaceIds = merchantSpaceIdsByPlayerCount[playerCount]
  const shuffledTiles = shuffleMerchantTiles(merchantTiles.slice(0, spaceIds.length), random)

  return Object.fromEntries(
    spaceIds.map((spaceId, index) => [
      spaceId,
      {
        ...shuffledTiles[index],
        spaceId,
      },
    ]),
  )
}

function createMerchantBeerPlacements(
  placements: Record<string, MerchantTilePlacement>,
): Record<string, MarketResourcePlacement> {
  return Object.fromEntries(
    Object.values(placements)
      .filter((tile) => tile.kind !== 'none')
      .map((tile) => {
        const spaceId = `board-beer-${tile.spaceId.replace('merchant-tile-', '')}`

        return [
          spaceId,
          {
            id: `${tile.spaceId}-beer-cube`,
            kind: 'beer',
            spaceId,
          },
        ]
      }),
  )
}

export function resetMerchantBeerPlacements(board: BoardState): BoardState {
  return {
    ...board,
    beerResourcePlacements: createMerchantBeerPlacements(board.merchantTilePlacements),
  }
}

export function getVisibleMerchantTilePlacements(
  state: BoardState,
): Record<string, MerchantTilePlacement> {
  return Object.fromEntries(
    Object.entries(state.merchantTilePlacements).filter(([, tile]) => tile.kind !== 'none'),
  )
}

export function createInitialMarketResourcePlacements(): Record<string, MarketResourcePlacement> {
  const emptyMarketSpaceIds = new Set(['coal-market-2', 'iron-market-1', 'iron-market-2'])

  return Object.fromEntries(
    marketResourceSpaces
      .filter((space) => !emptyMarketSpaceIds.has(space.id))
      .map((space) => [
        space.id,
        {
          id: `${space.id}-cube`,
          kind: space.kind,
          spaceId: space.id,
        },
      ]),
  )
}

export const industrySpaces: IndustrySpace[] = [
  {
    "id": "belper-1",
    "city": "Belper",
    "allowedIndustries": [
      "cotton",
      "manufacturer"
    ],
    "x": 71,
    "y": 10.92
  },
  {
    "id": "belper-2",
    "city": "Belper",
    "allowedIndustries": [
      "coal"
    ],
    "x": 75.73,
    "y": 10.92
  },
  {
    "id": "belper-3",
    "city": "Belper",
    "allowedIndustries": [
      "pottery"
    ],
    "x": 80.45,
    "y": 10.92
  },
  {
    "id": "derby-1",
    "city": "Derby",
    "allowedIndustries": [
      "cotton",
      "brewery"
    ],
    "x": 75.86,
    "y": 21.5
  },
  {
    "id": "derby-2",
    "city": "Derby",
    "allowedIndustries": [
      "cotton",
      "manufacturer"
    ],
    "x": 73.65,
    "y": 26.08
  },
  {
    "id": "derby-3",
    "city": "Derby",
    "allowedIndustries": [
      "iron"
    ],
    "x": 78.07,
    "y": 26.08
  },
  {
    "id": "leek-1",
    "city": "Leek",
    "allowedIndustries": [
      "cotton",
      "manufacturer"
    ],
    "x": 53.03,
    "y": 8.07
  },
  {
    "id": "leek-2",
    "city": "Leek",
    "allowedIndustries": [
      "cotton",
      "coal"
    ],
    "x": 57.5,
    "y": 8.07
  },
  {
    "id": "stoke-on-trent-1",
    "city": "Stoke-on-Trent",
    "allowedIndustries": [
      "cotton",
      "manufacturer"
    ],
    "x": 41.455,
    "y": 10.61
  },
  {
    "id": "stoke-on-trent-2",
    "city": "Stoke-on-Trent",
    "allowedIndustries": [
      "pottery",
      "iron"
    ],
    "x": 39.16,
    "y": 15.04
  },
  {
    "id": "stoke-on-trent-3",
    "city": "Stoke-on-Trent",
    "allowedIndustries": [
      "manufacturer"
    ],
    "x": 43.75,
    "y": 15.04
  },
  {
    "id": "stone-1",
    "city": "Stone",
    "allowedIndustries": [
      "cotton",
      "brewery"
    ],
    "x": 28.94,
    "y": 25.49
  },
  {
    "id": "stone-2",
    "city": "Stone",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 33.3,
    "y": 25.49
  },
  {
    "id": "uttoxeter-1",
    "city": "Uttoxeter",
    "allowedIndustries": [
      "manufacturer",
      "brewery"
    ],
    "x": 54.11,
    "y": 23.8
  },
  {
    "id": "uttoxeter-2",
    "city": "Uttoxeter",
    "allowedIndustries": [
      "cotton",
      "brewery"
    ],
    "x": 58.95,
    "y": 23.8
  },
  {
    "id": "stafford-1",
    "city": "Stafford",
    "allowedIndustries": [
      "manufacturer",
      "brewery"
    ],
    "x": 37.9,
    "y": 34.81
  },
  {
    "id": "stafford-2",
    "city": "Stafford",
    "allowedIndustries": [
      "pottery"
    ],
    "x": 42.62,
    "y": 34.81
  },
  {
    "id": "burton-on-trent-1",
    "city": "Burton-on-Trent",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 65.73,
    "y": 37.53
  },
  {
    "id": "burton-on-trent-2",
    "city": "Burton-on-Trent",
    "allowedIndustries": [
      "brewery"
    ],
    "x": 70.33,
    "y": 37.53
  },
  {
    "id": "cannock-1",
    "city": "Cannock",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 45.4,
    "y": 44.85
  },
  {
    "id": "cannock-2",
    "city": "Cannock",
    "allowedIndustries": [
      "coal"
    ],
    "x": 49.76,
    "y": 44.85
  },
  {
    "id": "tamworth-1",
    "city": "Tamworth",
    "allowedIndustries": [
      "cotton",
      "coal"
    ],
    "x": 67.42,
    "y": 50.05
  },
  {
    "id": "tamworth-2",
    "city": "Tamworth",
    "allowedIndustries": [
      "cotton",
      "coal"
    ],
    "x": 71.78,
    "y": 50.05
  },
  {
    "id": "walsall-1",
    "city": "Walsall",
    "allowedIndustries": [
      "iron",
      "manufacturer"
    ],
    "x": 50.97,
    "y": 56.1
  },
  {
    "id": "walsall-2",
    "city": "Walsall",
    "allowedIndustries": [
      "manufacturer",
      "brewery"
    ],
    "x": 55.57,
    "y": 56.1
  },
  {
    "id": "coalbrookdale-1",
    "city": "Coalbrookdale",
    "allowedIndustries": [
      "iron",
      "brewery"
    ],
    "x": 23.62,
    "y": 53.68
  },
  {
    "id": "coalbrookdale-2",
    "city": "Coalbrookdale",
    "allowedIndustries": [
      "iron"
    ],
    "x": 21.32,
    "y": 58.16
  },
  {
    "id": "coalbrookdale-3",
    "city": "Coalbrookdale",
    "allowedIndustries": [
      "coal"
    ],
    "x": 25.92,
    "y": 58.16
  },
  {
    "id": "dudley-1",
    "city": "Dudley",
    "allowedIndustries": [
      "coal"
    ],
    "x": 39.59,
    "y": 65.96
  },
  {
    "id": "dudley-2",
    "city": "Dudley",
    "allowedIndustries": [
      "iron"
    ],
    "x": 44.25,
    "y": 65.96
  },
  {
    "id": "kidderminster-1",
    "city": "Kidderminster",
    "allowedIndustries": [
      "cotton",
      "coal"
    ],
    "x": 32.87,
    "y": 76.17
  },
  {
    "id": "kidderminster-2",
    "city": "Kidderminster",
    "allowedIndustries": [
      "cotton"
    ],
    "x": 37.47,
    "y": 76.17
  },
  {
    "id": "wolverhampton-1",
    "city": "Wolverhampton",
    "allowedIndustries": [
      "manufacturer"
    ],
    "x": 35.17,
    "y": 54.02
  },
  {
    "id": "wolverhampton-2",
    "city": "Wolverhampton",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 39.65,
    "y": 54.02
  },
  {
    "id": "worcester-1",
    "city": "Worcester",
    "allowedIndustries": [
      "cotton"
    ],
    "x": 34.08,
    "y": 89.01
  },
  {
    "id": "worcester-2",
    "city": "Worcester",
    "allowedIndustries": [
      "cotton"
    ],
    "x": 38.68,
    "y": 89.01
  },
  {
    "id": "birmingham-1",
    "city": "Birmingham",
    "allowedIndustries": [
      "cotton",
      "manufacturer"
    ],
    "x": 60.59,
    "y": 65.16
  },
  {
    "id": "birmingham-2",
    "city": "Birmingham",
    "allowedIndustries": [
      "manufacturer"
    ],
    "x": 65.01,
    "y": 65.16
  },
  {
    "id": "birmingham-3",
    "city": "Birmingham",
    "allowedIndustries": [
      "iron"
    ],
    "x": 60.59,
    "y": 69.7
  },
  {
    "id": "birmingham-4",
    "city": "Birmingham",
    "allowedIndustries": [
      "manufacturer"
    ],
    "x": 65.01,
    "y": 69.7
  },
  {
    "id": "coventry-1",
    "city": "Coventry",
    "allowedIndustries": [
      "pottery"
    ],
    "x": 80.77,
    "y": 68.18
  },
  {
    "id": "coventry-2",
    "city": "Coventry",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 78.35,
    "y": 72.78
  },
  {
    "id": "coventry-3",
    "city": "Coventry",
    "allowedIndustries": [
      "iron",
      "manufacturer"
    ],
    "x": 83.19,
    "y": 72.78
  },
  {
    "id": "nuneaton-1",
    "city": "Nuneaton",
    "allowedIndustries": [
      "manufacturer",
      "brewery"
    ],
    "x": 76.21,
    "y": 59.83
  },
  {
    "id": "nuneaton-2",
    "city": "Nuneaton",
    "allowedIndustries": [
      "cotton",
      "coal"
    ],
    "x": 80.81,
    "y": 59.83
  },
  {
    "id": "redditch-1",
    "city": "Redditch",
    "allowedIndustries": [
      "manufacturer",
      "coal"
    ],
    "x": 55.87,
    "y": 81.5
  },
  {
    "id": "redditch-2",
    "city": "Redditch",
    "allowedIndustries": [
      "iron"
    ],
    "x": 60.47,
    "y": 81.5
  },
  {
    "id": "brewery-1",
    "city": "Brewery-1",
    "allowedIndustries": [
      "brewery"
    ],
    "x": 30.45,
    "y": 43.61
  },
  {
    "id": "brewery-2",
    "city": "Brewery-2",
    "allowedIndustries": [
      "brewery"
    ],
    "x": 24.76,
    "y": 83.56
  }
]

export const linkSpaces: LinkSpace[] = [
  {
    "id": "warrington-stoke-on-trent",
    "from": "Warrington",
    "to": "Stoke-on-Trent",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 34.34,
    "y": 9.77,
    "rotation": 18
  },
  {
    "id": "stoke-on-trent-leek",
    "from": "Stoke-on-Trent",
    "to": "Leek",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 46.81,
    "y": 8.92,
    "rotation": -26
  },
  {
    "id": "leek-belper",
    "from": "Leek",
    "to": "Belper",
    "allowedKinds": [
      "rail"
    ],
    "x": 64.49,
    "y": 7.83,
    "rotation": 10
  },
  {
    "id": "belper-derby",
    "from": "Belper",
    "to": "Derby",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 76.12,
    "y": 16.19,
    "rotation": 70
  },
  {
    "id": "derby-nottingham",
    "from": "Derby",
    "to": "Nottingham",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 81.69,
    "y": 21.15,
    "rotation": -18
  },
  {
    "id": "derby-uttoxeter",
    "from": "Derby",
    "to": "Uttoxeter",
    "allowedKinds": [
      "rail"
    ],
    "x": 66.19,
    "y": 25.88,
    "rotation": 13
  },
  {
    "id": "uttoxeter-stone",
    "from": "Uttoxeter",
    "to": "Stone",
    "allowedKinds": [
      "rail"
    ],
    "x": 43.66,
    "y": 24.18,
    "rotation": 0
  },
  {
    "id": "stone-stoke-on-trent",
    "from": "Stone",
    "to": "Stoke-on-Trent",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 36.4,
    "y": 21.52,
    "rotation": 140
  },
  {
    "id": "stone-stafford",
    "from": "Stone",
    "to": "Stafford",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 31.31,
    "y": 33.26,
    "rotation": 43
  },
  {
    "id": "stone-burton-on-trent",
    "from": "Stone",
    "to": "Burton-on-Trent",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 50.81,
    "y": 29.63,
    "rotation": 10
  },
  {
    "id": "derby-burton-on-trent",
    "from": "Derby",
    "to": "Burton-on-Trent",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 75.63,
    "y": 32.78,
    "rotation": 129
  },
  {
    "id": "burton-on-trent-cannock",
    "from": "Burton-on-Trent",
    "to": "Cannock",
    "allowedKinds": [
      "rail"
    ],
    "x": 56.98,
    "y": 39.8,
    "rotation": 143
  },
  {
    "id": "stafford-cannock",
    "from": "Stafford",
    "to": "Cannock",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 47.3,
    "y": 38.95,
    "rotation": 60
  },
  {
    "id": "cannock-brewery-1",
    "from": "Cannock",
    "to": "Brewery-1",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 37.97,
    "y": 43.19,
    "rotation": 0
  },
  {
    "id": "cannock-wolverhampton",
    "from": "Cannock",
    "to": "Wolverhampton",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 39.67,
    "y": 48.28,
    "rotation": 131
  },
  {
    "id": "cannock-walsall",
    "from": "Cannock",
    "to": "Walsall",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 53.59,
    "y": 49.49,
    "rotation": 70
  },
  {
    "id": "burton-on-trent-walsall",
    "from": "Burton-on-Trent",
    "to": "Walsall",
    "allowedKinds": [
      "canal"
    ],
    "x": 58.44,
    "y": 47.43,
    "rotation": 110
  },
  {
    "id": "burton-on-trent-tamworth",
    "from": "Burton-on-Trent",
    "to": "Tamworth",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 69.46,
    "y": 44.28,
    "rotation": 85
  },
  {
    "id": "shrewsbury-coalbrookdale",
    "from": "Shrewsbury",
    "to": "Coalbrookdale",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 17.14,
    "y": 53.85,
    "rotation": -3
  },
  {
    "id": "coalbrookdale-wolverhampton",
    "from": "Coalbrookdale",
    "to": "Wolverhampton",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 29.5,
    "y": 53.36,
    "rotation": -1
  },
  {
    "id": "wolverhampton-walsall",
    "from": "Wolverhampton",
    "to": "Walsall",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 45.36,
    "y": 54.33,
    "rotation": 15
  },
  {
    "id": "walsall-tamworth",
    "from": "Walsall",
    "to": "Tamworth",
    "allowedKinds": [
      "rail"
    ],
    "x": 61.95,
    "y": 55.06,
    "rotation": -22
  },
  {
    "id": "coalbrookdale-kidderminster",
    "from": "Coalbrookdale",
    "to": "Kidderminster",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 26.35,
    "y": 68.5,
    "rotation": 61
  },
  {
    "id": "kidderminster-dudley",
    "from": "Kidderminster",
    "to": "Dudley",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 35.43,
    "y": 70.32,
    "rotation": -60
  },
  {
    "id": "wolverhampton-dudley",
    "from": "Wolverhampton",
    "to": "Dudley",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 37.49,
    "y": 60.75,
    "rotation": 56
  },
  {
    "id": "dudley-birmingham",
    "from": "Dudley",
    "to": "Birmingham",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 51.66,
    "y": 67.17,
    "rotation": 20
  },
  {
    "id": "walsall-birmingham",
    "from": "Walsall",
    "to": "Birmingham",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 55.65,
    "y": 63.41,
    "rotation": 51
  },
  {
    "id": "tamworth-birmingham",
    "from": "Tamworth",
    "to": "Birmingham",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 69.38,
    "y": 58.21,
    "rotation": -64
  },
  {
    "id": "birmingham-nuneaton",
    "from": "Birmingham",
    "to": "Nuneaton",
    "allowedKinds": [
      "rail"
    ],
    "x": 70.55,
    "y": 64.38,
    "rotation": -51
  },
  {
    "id": "tamworth-nuneaton",
    "from": "Tamworth",
    "to": "Nuneaton",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 77.57,
    "y": 52.52,
    "rotation": 56
  },
  {
    "id": "nuneaton-coventry",
    "from": "Nuneaton",
    "to": "Coventry",
    "allowedKinds": [
      "rail"
    ],
    "x": 85.32,
    "y": 65.47,
    "rotation": 90
  },
  {
    "id": "birmingham-coventry",
    "from": "Birmingham",
    "to": "Coventry",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 71.51,
    "y": 71.53,
    "rotation": 20
  },
  {
    "id": "birmingham-oxford",
    "from": "Birmingham",
    "to": "Oxford",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 71.51,
    "y": 76.85,
    "rotation": 52
  },
  {
    "id": "birmingham-redditch",
    "from": "Birmingham",
    "to": "Redditch",
    "allowedKinds": [
      "rail"
    ],
    "x": 61.1,
    "y": 76.01,
    "rotation": 96
  },
  {
    "id": "redditch-oxford",
    "from": "Redditch",
    "to": "Oxford",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 65.94,
    "y": 82.79,
    "rotation": 13
  },
  {
    "id": "redditch-gloucester",
    "from": "Redditch",
    "to": "Gloucester",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 50.69,
    "y": 85.69,
    "rotation": -55
  },
  {
    "id": "birmingham-worcester",
    "from": "Birmingham",
    "to": "Worcester",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 48.39,
    "y": 78.07,
    "rotation": -60
  },
  {
    "id": "worcester-gloucester",
    "from": "Worcester",
    "to": "Gloucester",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 43.66,
    "y": 91.75,
    "rotation": 20
  },
  {
    "id": "kidderminster-worcester-brewery-2",
    "from": "Kidderminster",
    "to": "Worcester",
    "via": "Brewery-2",
    "allowedKinds": [
      "canal",
      "rail"
    ],
    "x": 34.27,
    "y": 83.33,
    "rotation": 65
  }
]

export function createBoardState(
  playerCount?: PlayerCount,
  random = Math.random,
): BoardState {
  const merchantTilePlacements = playerCount
    ? createInitialMerchantTilePlacements(playerCount, random)
    : {}

  return {
    industryPlacements: {},
    industryResourcePlacements: {},
    beerResourcePlacements: createMerchantBeerPlacements(merchantTilePlacements),
    linkPlacements: {},
    marketResourcePlacements: createInitialMarketResourcePlacements(),
    merchantTilePlacements,
  }
}

const roundPercent = (value: number) => Math.round(value * 100) / 100

export function getBoardPointFromClientPosition(
  rect: BoardRect,
  clientX: number,
  clientY: number,
): BoardPoint {
  return {
    x: roundPercent(((clientX - rect.left) / rect.width) * 100),
    y: roundPercent(((clientY - rect.top) / rect.height) * 100),
  }
}

export function updateIndustrySpaceCalibration(
  spaces: IndustrySpace[],
  spaceId: string,
  point: BoardPoint,
): IndustrySpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateLinkSpaceCalibration(
  spaces: LinkSpace[],
  spaceId: string,
  point: BoardPoint & Pick<LinkSpace, 'rotation'>,
): LinkSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateBoardControlSpaceCalibration(
  spaces: BoardControlSpace[],
  spaceId: string,
  point: BoardPoint,
): BoardControlSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateTurnMarkerSpaceCalibration(
  spaces: TurnMarkerSpace[],
  spaceId: string,
  point: BoardPoint,
): TurnMarkerSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateMarketResourceSpaceCalibration(
  spaces: MarketResourceSpace[],
  spaceId: string,
  point: BoardPoint,
): MarketResourceSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateBeerResourceSpaceCalibration(
  spaces: BeerResourceSpace[],
  spaceId: string,
  point: BoardPoint,
): BeerResourceSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateMerchantTileSpaceCalibration(
  spaces: MerchantTileSpace[],
  spaceId: string,
  point: BoardPoint,
): MerchantTileSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function updateIncomeTrackSpaceCalibration(
  spaces: IncomeTrackSpace[],
  spaceId: string,
  point: BoardPoint,
): IncomeTrackSpace[] {
  return spaces.map((space) =>
    space.id === spaceId
      ? {
          ...space,
          ...point,
        }
      : space,
  )
}

export function placeIndustryTile(
  state: BoardState,
  spaceId: string,
  tile: IndustryTilePlacement,
): BoardState {
  const space = industrySpaces.find((currentSpace) => currentSpace.id === spaceId)

  if (!space || state.industryPlacements[spaceId] || !space.allowedIndustries.includes(tile.industry)) {
    return state
  }

  return {
    ...state,
    industryPlacements: {
      ...state.industryPlacements,
      [spaceId]: tile,
    },
  }
}

export function removeIndustryTile(state: BoardState, spaceId: string): BoardState {
  if (!state.industryPlacements[spaceId]) {
    return state
  }

  const industryPlacements = { ...state.industryPlacements }
  const industryResourcePlacements = { ...state.industryResourcePlacements }
  delete industryPlacements[spaceId]
  delete industryResourcePlacements[spaceId]

  return {
    ...state,
    industryPlacements,
    industryResourcePlacements,
  }
}

export function moveIndustryTile(
  state: BoardState,
  sourceSpaceId: string,
  targetSpaceId: string,
  tile: IndustryTilePlacement,
): BoardState {
  if (sourceSpaceId === targetSpaceId) {
    return state
  }

  const nextState = placeIndustryTile(state, targetSpaceId, tile)

  if (nextState === state) {
    return state
  }

  const industryPlacements = { ...nextState.industryPlacements }
  const sourceResources = state.industryResourcePlacements[sourceSpaceId]
  const industryResourcePlacements = { ...nextState.industryResourcePlacements }
  delete industryPlacements[sourceSpaceId]
  delete industryResourcePlacements[sourceSpaceId]

  return {
    ...nextState,
    industryPlacements,
    industryResourcePlacements: sourceResources
      ? {
          ...industryResourcePlacements,
          [targetSpaceId]: sourceResources.map((resource) => ({
            ...resource,
            spaceId: targetSpaceId,
          })),
        }
      : industryResourcePlacements,
  }
}

export function flipIndustryTile(state: BoardState, spaceId: string): BoardState {
  const placement = state.industryPlacements[spaceId]
  const resources = state.industryResourcePlacements[spaceId] ?? []

  if (!placement || resources.length > 0) {
    return state
  }

  return {
    ...state,
    industryPlacements: {
      ...state.industryPlacements,
      [spaceId]: {
        ...placement,
        flipped: !placement.flipped,
      },
    },
  }
}

export function placeLinkTile(
  state: BoardState,
  spaceId: string,
  tile: LinkTilePlacement,
): BoardState {
  const space = linkSpaces.find((currentSpace) => currentSpace.id === spaceId)

  if (!space || state.linkPlacements[spaceId] || !space.allowedKinds.includes(tile.kind)) {
    return state
  }

  return {
    ...state,
    linkPlacements: {
      ...state.linkPlacements,
      [spaceId]: tile,
    },
  }
}

export function removeLinkTile(state: BoardState, spaceId: string): BoardState {
  if (!state.linkPlacements[spaceId]) {
    return state
  }

  const linkPlacements = { ...state.linkPlacements }
  delete linkPlacements[spaceId]

  return {
    ...state,
    linkPlacements,
  }
}

export function moveLinkTile(
  state: BoardState,
  sourceSpaceId: string,
  targetSpaceId: string,
  tile: LinkTilePlacement,
): BoardState {
  if (sourceSpaceId === targetSpaceId) {
    return state
  }

  const nextState = placeLinkTile(state, targetSpaceId, tile)

  if (nextState === state) {
    return state
  }

  return removeLinkTile(nextState, sourceSpaceId)
}

export function placeIndustryResourceCube(
  state: BoardState,
  spaceId: string,
  cube: MarketResourcePlacement,
): BoardState {
  const industryPlacement = state.industryPlacements[spaceId]
  const rule = industryPlacement ? industryResourceRules[industryPlacement.industry] : undefined
  const currentResources = state.industryResourcePlacements[spaceId] ?? []

  if (
    !rule ||
    industryPlacement.flipped ||
    cube.kind !== rule.kind ||
    currentResources.length >= rule.capacity
  ) {
    return state
  }

  return {
    ...state,
    industryResourcePlacements: {
      ...state.industryResourcePlacements,
      [spaceId]: [
        ...currentResources,
        {
          ...cube,
          spaceId,
        },
      ],
    },
  }
}

export function removeIndustryResourceCube(
  state: BoardState,
  spaceId: string,
  cubeId: string,
): BoardState {
  const currentResources = state.industryResourcePlacements[spaceId]

  if (!currentResources?.some((cube) => cube.id === cubeId)) {
    return state
  }

  return {
    ...state,
    industryResourcePlacements: {
      ...state.industryResourcePlacements,
      [spaceId]: currentResources.filter((cube) => cube.id !== cubeId),
    },
  }
}

export function placeMarketResourceCube(
  state: BoardState,
  spaceId: string,
  cube: MarketResourcePlacement,
): BoardState {
  const space = marketResourceSpaces.find((currentSpace) => currentSpace.id === spaceId)

  if (!space || state.marketResourcePlacements[spaceId] || cube.kind !== space.kind) {
    return state
  }

  return {
    ...state,
    marketResourcePlacements: {
      ...state.marketResourcePlacements,
      [spaceId]: {
        ...cube,
        spaceId,
      },
    },
  }
}

export function placeBeerResourceCube(
  state: BoardState,
  spaceId: string,
  cube: MarketResourcePlacement,
): BoardState {
  const space = beerResourceSpaces.find((currentSpace) => currentSpace.id === spaceId)

  if (!space || state.beerResourcePlacements[spaceId] || cube.kind !== 'beer') {
    return state
  }

  return {
    ...state,
    beerResourcePlacements: {
      ...state.beerResourcePlacements,
      [spaceId]: {
        ...cube,
        spaceId,
      },
    },
  }
}

export function removeBeerResourceCube(state: BoardState, spaceId: string): BoardState {
  if (!state.beerResourcePlacements[spaceId]) {
    return state
  }

  const beerResourcePlacements = { ...state.beerResourcePlacements }
  delete beerResourcePlacements[spaceId]

  return {
    ...state,
    beerResourcePlacements,
  }
}

export function moveResourceCubeToBeer(
  state: BoardState,
  spaceId: string,
  cube: MarketResourcePlacement,
  source?: {
    beerSpaceId?: string
    industrySpaceId?: string
    marketSpaceId?: string
  },
): BoardState {
  const nextState = placeBeerResourceCube(state, spaceId, cube)

  if (nextState === state) {
    return state
  }

  if (source?.industrySpaceId) {
    return removeIndustryResourceCube(nextState, source.industrySpaceId, cube.id)
  }

  if (source?.marketSpaceId) {
    return removeMarketResourceCube(nextState, source.marketSpaceId)
  }

  if (source?.beerSpaceId) {
    return removeBeerResourceCube(nextState, source.beerSpaceId)
  }

  return nextState
}

export function moveResourceCubeToMarket(
  state: BoardState,
  spaceId: string,
  cube: MarketResourcePlacement,
  source?: {
    industrySpaceId?: string
    marketSpaceId?: string
  },
): BoardState {
  const nextState = placeMarketResourceCube(state, spaceId, cube)

  if (nextState === state) {
    return state
  }

  if (source?.industrySpaceId) {
    return removeIndustryResourceCube(nextState, source.industrySpaceId, cube.id)
  }

  if (source?.marketSpaceId) {
    return removeMarketResourceCube(nextState, source.marketSpaceId)
  }

  return nextState
}

export function removeMarketResourceCube(state: BoardState, spaceId: string): BoardState {
  if (!state.marketResourcePlacements[spaceId]) {
    return state
  }

  const marketResourcePlacements = { ...state.marketResourcePlacements }
  delete marketResourcePlacements[spaceId]

  return {
    ...state,
    marketResourcePlacements,
  }
}
