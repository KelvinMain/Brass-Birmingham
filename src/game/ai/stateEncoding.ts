import type { Industry } from '../cards'
import { industrySpaces, marketLocations } from '../board'
import type { GameState } from '../game'
import { getActionsPerTurn } from '../game'

const TRACKED_CITIES = [
  'Birmingham',
  'Coventry',
  'Worcester',
  'Stoke-on-Trent',
  'Cannock',
  'Walsall',
  'Oxford',
  'Nottingham',
  'Gloucester',
  'Shrewsbury',
  'Warrington',
  'Burton-on-Trent',
  'Coalbrookdale',
  'Wolverhampton',
  'Blackburn',
] as const

const TRACKED_INDUSTRIES: Industry[] = [
  'brewery',
  'coal',
  'iron',
  'cotton',
  'manufacturer',
  'pottery',
]

export const AI_STATE_FEATURE_COUNT =
  2 + // era one-hot
  4 + // round, actions, hand size, developed count
  4 + // money, income, vp, money spent
  3 + // card kind counts
  TRACKED_INDUSTRIES.length + // industry cards in hand
  TRACKED_CITIES.length + // location cards in hand
  TRACKED_INDUSTRIES.length + // owned industries
  3 + // owned links canal/rail/total
  3 + // flipped industries, connected market, beer on board
  3 + // opponent vp lead, max opponent vp, opponent industry delta
  3 // market coal/iron/beer availability

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalize(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return clamp01(value / max)
}

function normalizeSigned(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return Math.max(-1, Math.min(1, value / max))
}

export function encodeAiState(game: GameState, playerId: string): Float32Array {
  const features = new Float32Array(AI_STATE_FEATURE_COUNT)
  let index = 0
  const player = game.players.find((entry) => entry.id === playerId)
  const opponents = game.players.filter((entry) => entry.id !== playerId)

  if (!player) {
    return features
  }

  features[index++] = game.era === 'canal' ? 1 : 0
  features[index++] = game.era === 'rail' ? 1 : 0
  features[index++] = normalize(game.roundNumber, 12)
  features[index++] = normalize(getActionsPerTurn(game), 6)
  features[index++] = normalize(player.hand.length, 8)
  features[index++] = normalize(game.developedIndustries.length, 12)
  features[index++] = normalize(player.money, 50)
  features[index++] = normalize(player.income, 40)
  features[index++] = normalize(player.victoryPoints, 120)
  features[index++] = normalize(player.moneySpentThisRound, 30)

  const industryCards = player.hand.filter((card) => card.kind === 'industry').length
  const locationCards = player.hand.filter((card) => card.kind === 'location').length
  const wildCards = player.hand.filter(
    (card) => card.kind === 'wild-industry' || card.kind === 'wild-location',
  ).length

  features[index++] = normalize(industryCards, 8)
  features[index++] = normalize(locationCards, 8)
  features[index++] = normalize(wildCards, 2)

  for (const industry of TRACKED_INDUSTRIES) {
    const count = player.hand.filter(
      (card) => card.kind === 'industry' && card.industries.includes(industry),
    ).length
    features[index++] = normalize(count, 3)
  }

  for (const city of TRACKED_CITIES) {
    const hasCity = player.hand.some(
      (card) => card.kind === 'location' && card.name === city,
    )
    features[index++] = hasCity ? 1 : 0
  }

  for (const industry of TRACKED_INDUSTRIES) {
    const count = Object.values(game.board.industryPlacements).filter(
      (placement) => placement.ownerId === playerId && placement.industry === industry,
    ).length
    features[index++] = normalize(count, 6)
  }

  const ownedLinks = Object.values(game.board.linkPlacements).filter(
    (placement) => placement.ownerId === playerId,
  )
  const canalLinks = ownedLinks.filter((placement) => placement.kind === 'canal').length
  const railLinks = ownedLinks.filter((placement) => placement.kind === 'rail').length

  features[index++] = normalize(canalLinks, 10)
  features[index++] = normalize(railLinks, 20)
  features[index++] = normalize(ownedLinks.length, 25)

  const flippedIndustries = Object.values(game.board.industryPlacements).filter(
    (placement) => placement.ownerId === playerId && placement.flipped,
  ).length
  features[index++] = normalize(flippedIndustries, 10)

  const connectedToMarket = industrySpaces
    .filter((space) =>
      Object.values(game.board.industryPlacements).some(
        (placement) =>
          placement.ownerId === playerId &&
          industrySpaces.find((entry) => entry.id === space.id)?.city === space.city,
      ),
    )
    .some((space) =>
      marketLocations.some((market) => {
        const playerCities = new Set(
          Object.entries(game.board.industryPlacements)
            .filter(([, placement]) => placement.ownerId === playerId)
            .map(([spaceId]) => industrySpaces.find((entry) => entry.id === spaceId)?.city)
            .filter(Boolean) as string[],
        )

        return [...playerCities].some((city) => city === market || city === space.city)
      }),
    )

  features[index++] = connectedToMarket ? 1 : 0

  const beerOnBoard = Object.values(game.board.industryResourcePlacements).reduce(
    (total, resources) => total + resources.filter((resource) => resource.kind === 'beer').length,
    0,
  )
  features[index++] = normalize(beerOnBoard, 12)

  const maxOpponentVp = opponents.reduce(
    (best, opponent) => Math.max(best, opponent.victoryPoints),
    0,
  )
  features[index++] = normalizeSigned(player.victoryPoints - maxOpponentVp, 40)
  features[index++] = normalize(maxOpponentVp, 120)

  const playerIndustryCount = Object.values(game.board.industryPlacements).filter(
    (placement) => placement.ownerId === playerId,
  ).length
  const maxOpponentIndustryCount = opponents.reduce((best, opponent) => {
    const count = Object.values(game.board.industryPlacements).filter(
      (placement) => placement.ownerId === opponent.id,
    ).length

    return Math.max(best, count)
  }, 0)
  features[index++] = normalizeSigned(playerIndustryCount - maxOpponentIndustryCount, 12)

  const coalMarket = Object.values(game.board.marketResourcePlacements).filter(
    (placement) => placement.kind === 'coal',
  ).length
  const ironMarket = Object.values(game.board.marketResourcePlacements).filter(
    (placement) => placement.kind === 'iron',
  ).length
  const beerMarket = Object.values(game.board.beerResourcePlacements).length

  features[index++] = normalize(coalMarket, 4)
  features[index++] = normalize(ironMarket, 4)
  features[index++] = normalize(beerMarket, 6)

  return features
}
