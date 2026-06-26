import { availableParallelism } from 'node:os'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const { runWeightEvolution, loadTunedWeightsFromSerialized } = await import(
  '../src/game/ai/weightEvolution'
)
const { resolveWorkerCount } = await import('../src/game/ai/weightEvolutionPool')
const { AI_PARAM_COUNT } = await import('../src/game/ai/params')

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}

function readNumberFlag(name: string, fallback: number): number {
  const value = readFlag(name)

  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

async function loadResumeWeights(path: string | undefined) {
  if (!path) {
    return undefined
  }

  const resolved = resolve(path)
  const serialized = JSON.parse(await readFile(resolved, 'utf8'))
  const weights = loadTunedWeightsFromSerialized(serialized)

  if (Object.keys(weights).length !== AI_PARAM_COUNT) {
    throw new Error(
      `Resume weights at ${resolved} do not match current parameter count (${Object.keys(weights).length} vs ${AI_PARAM_COUNT}).`,
    )
  }

  return weights
}

const generations = readNumberFlag('--generations', 50)
const population = readNumberFlag('--population', 24)
const games = readNumberFlag('--games', 16)
const seed = readNumberFlag('--seed', 42)
const playerCount = readNumberFlag('--players', 2) as 2 | 3 | 4
const output = readFlag('--output') ?? 'public/ai/tuned-weights.json'
const resumeFrom = readFlag('--resume-from')
const mode = readFlag('--mode') === 'league' || hasFlag('--league') ? 'league' : 'fixed'
function readWorkersFlag(): number {
  const value = readFlag('--workers')

  if (!value) {
    return 1
  }

  if (value === 'auto') {
    return 0
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 1
}

const workers = readWorkersFlag()
const resolvedWorkers = resolveWorkerCount(workers)
const verboseGames = hasFlag('--verbose-games')
const totalGames = generations * population * games

const league =
  mode === 'league'
    ? {
        heuristicWeight: readNumberFlag('--league-heuristic', 0.35),
        randomWeight: readNumberFlag('--league-random', 0.1),
        populationWeight: readNumberFlag('--league-population', 0.4),
        championWeight: readNumberFlag('--league-champion', 0.15),
        hallOfFameSize: readNumberFlag('--league-hall-size', 3),
      }
    : undefined

console.log(
  `Starting AI weight tuning: mode=${mode} generations=${generations} population=${population} games=${games} players=${playerCount} seed=${seed} workers=${resolvedWorkers}`,
)

if (mode === 'league') {
  console.log(
    'League training mixes heuristic, random, population self-play, and hall-of-fame champions each game.',
  )

  if (!resumeFrom) {
    console.log(
      'Tip: after a fixed run, continue with --mode league --resume-from public/ai/tuned-weights.json',
    )
  }
} else {
  console.log('Fixed mode trains every genome against the heuristic baseline.')
  console.log(
    'Next step after this run: npm run tune-ai-weights -- --mode league --resume-from public/ai/tuned-weights.json --generations 20 --population 12 --games 12',
  )
}

if (resumeFrom) {
  console.log(`Resuming from ${resumeFrom}`)
}

console.log(`Total simulations: ${totalGames.toLocaleString()} full ${playerCount}-player games`)
console.log(
  'Tip: each game takes ~1-3s. Defaults can take many hours. Try --generations 5 --population 8 --games 4 for a quick test.',
)
if (resolvedWorkers === 1) {
  console.log(
    `Tip: use --workers auto (${Math.max(1, availableParallelism() - 1)} cores) or --workers N to evaluate genomes in parallel.`,
  )
}
console.log('Progress logs appear below as each genome finishes.\n')

const resumeWeights = await loadResumeWeights(resumeFrom)

const result = await runWeightEvolution({
  generations,
  populationSize: population,
  gamesPerGenome: games,
  seed,
  playerCount,
  outputPath: output,
  verboseGames,
  mode,
  league,
  resumeWeights,
  workers,
})

if (result.outputPath) {
  const resolved = resolve(result.outputPath)
  await mkdir(dirname(resolved), { recursive: true })
  await writeFile(resolved, JSON.stringify(result.serialized, null, 2), 'utf8')
}

const lastGenerationBest = result.generations.at(-1)?.bestFitness.toFixed(3) ?? 'n/a'

console.log(
  `Weight tuning complete. mode=${result.mode} allTimeBestFitness=${result.bestFitness.toFixed(3)} lastGenBest=${lastGenerationBest} saved to ${output}`,
)
