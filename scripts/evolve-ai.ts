import { mkdir, writeFile } from 'node:fs/promises'
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

const { runEvolution } = await import('../src/game/ai/evolution')

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

const generations = readNumberFlag('--generations', 50)
const population = readNumberFlag('--population', 24)
const games = readNumberFlag('--games', 16)
const seed = readNumberFlag('--seed', 42)
const output = readFlag('--output') ?? 'public/ai/evolved-model.json'
const verboseGames = process.argv.includes('--verbose-games')
const totalGames = generations * population * games

console.log(
  `Starting AI evolution: generations=${generations} population=${population} games=${games} seed=${seed}`,
)
console.log(`Total simulations: ${totalGames.toLocaleString()} full 2-player games`)
console.log(
  'Tip: each game takes ~1-3s. Defaults can take many hours. Try --generations 5 --population 8 --games 4 for a quick test.',
)
console.log('Progress logs appear below as each genome finishes.\n')

const result = await runEvolution({
  generations,
  populationSize: population,
  gamesPerGenome: games,
  seed,
  outputPath: output,
  verboseGames,
})

if (result.outputPath) {
  const resolved = resolve(result.outputPath)
  await mkdir(dirname(resolved), { recursive: true })
  await writeFile(resolved, JSON.stringify(result.serialized), 'utf8')
}

console.log(
  `Evolution complete. Best fitness=${result.generations.at(-1)?.bestFitness.toFixed(3)} saved to ${output}`,
)
