import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

async function tryEnableTfjsNodeBackend(): Promise<boolean> {
  try {
    require('@tensorflow/tfjs-node')
    console.log('TensorFlow backend: @tensorflow/tfjs-node (native — faster inference)')
    return true
  } catch {
    console.log(
      'TensorFlow backend: pure JavaScript (default). Optional native speedup: npm install @tensorflow/tfjs-node',
    )
    console.log(
      '  On Windows this often needs Node 20 LTS + Visual Studio "Desktop development with C++" workload.',
    )
    return false
  }
}

const usingNativeBackend = await tryEnableTfjsNodeBackend()
console.log(
  usingNativeBackend
    ? 'Note: most evolution time is still spent simulating full games, not running the neural net.\n'
    : 'Note: most evolution time is simulating full games (~1-2s each), not TensorFlow inference.\n',
)

const { runEvolution, loadEvolutionModelFromSerialized } = await import('../src/game/ai/evolution')
const { AI_PARAM_COUNT, AI_STATE_FEATURE_COUNT } = await import('../src/game/ai')

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

async function loadResumeModel(path: string | undefined) {
  if (!path) {
    return undefined
  }

  const resolved = resolve(path)
  const serialized = JSON.parse(await readFile(resolved, 'utf8'))

  if (
    serialized.stateFeatureCount !== AI_STATE_FEATURE_COUNT ||
    serialized.paramCount !== AI_PARAM_COUNT
  ) {
    throw new Error(
      `Resume model at ${resolved} does not match current architecture (${serialized.stateFeatureCount}/${serialized.paramCount} vs ${AI_STATE_FEATURE_COUNT}/${AI_PARAM_COUNT}). Retrain from scratch first.`,
    )
  }

  return loadEvolutionModelFromSerialized(serialized)
}

const generations = readNumberFlag('--generations', 50)
const population = readNumberFlag('--population', 24)
const games = readNumberFlag('--games', 16)
const seed = readNumberFlag('--seed', 42)
const output = readFlag('--output') ?? 'public/ai/evolved-model.json'
const resumeFrom = readFlag('--resume-from')
const mode = readFlag('--mode') === 'league' || hasFlag('--league') ? 'league' : 'fixed'
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
  `Starting AI evolution: mode=${mode} generations=${generations} population=${population} games=${games} seed=${seed}`,
)

if (mode === 'league') {
  console.log(
    'League training mixes heuristic, random, population self-play, and hall-of-fame champions each game.',
  )

  if (!resumeFrom) {
    console.log(
      'Tip: after a fixed-strategy run, continue with --mode league --resume-from public/ai/evolved-model.json',
    )
  }
} else {
  console.log('Fixed mode trains every genome only against the heuristic baseline.')
  console.log(
    'Next step after this run: npm run evolve-ai -- --mode league --resume-from public/ai/evolved-model.json --generations 20 --population 12 --games 12',
  )
}

if (resumeFrom) {
  console.log(`Resuming from ${resumeFrom}`)
}

console.log(`Total simulations: ${totalGames.toLocaleString()} full 2-player games`)
console.log(
  'Tip: each game takes ~1-3s. Defaults can take many hours. Try --generations 5 --population 8 --games 4 for a quick test.',
)
console.log('Progress logs appear below as each genome finishes.\n')

const resumeModel = await loadResumeModel(resumeFrom)

const result = await runEvolution({
  generations,
  populationSize: population,
  gamesPerGenome: games,
  seed,
  outputPath: output,
  verboseGames,
  mode,
  league,
  resumeModel,
})

if (result.outputPath) {
  const resolved = resolve(result.outputPath)
  await mkdir(dirname(resolved), { recursive: true })
  await writeFile(resolved, JSON.stringify(result.serialized), 'utf8')
}

const lastGenerationBest = result.generations.at(-1)?.bestFitness.toFixed(3) ?? 'n/a'

console.log(
  `Evolution complete. mode=${result.mode} allTimeBestFitness=${result.bestFitness.toFixed(3)} lastGenBest=${lastGenerationBest} saved to ${output}`,
)
