import type {
  WeightEvolutionWorkerError,
  WeightEvolutionWorkerRequest,
  WeightEvolutionWorkerResponse,
} from '../src/game/ai/weightEvolutionEvaluate.ts'
import { evaluateGenomeWorkerJob } from '../src/game/ai/weightEvolutionEvaluate.ts'

process.on('message', (message: WeightEvolutionWorkerRequest) => {
  if (message.type !== 'run') {
    return
  }

  try {
    const result = evaluateGenomeWorkerJob(message.job)
    const response: WeightEvolutionWorkerResponse = { type: 'done', result }
    process.send?.(response)
  } catch (error) {
    const response: WeightEvolutionWorkerError = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
    process.send?.(response)
  }
})
