import { availableParallelism } from 'node:os'
import { fork, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import type {
  EvaluateGenomeWorkerJob,
  EvaluateGenomeWorkerResult,
  WeightEvolutionWorkerError,
  WeightEvolutionWorkerRequest,
  WeightEvolutionWorkerResponse,
} from './weightEvolutionEvaluate'

type WorkerSlot = {
  child: ChildProcess
  busy: boolean
  currentTask?: PendingTask
}

type PendingTask = {
  job: EvaluateGenomeWorkerJob
  resolve: (result: EvaluateGenomeWorkerResult) => void
  reject: (error: Error) => void
}

function getWorkerExecArgv(): string[] {
  return ['--import', 'tsx']
}

const workerModuleUrl = new URL('../../../scripts/tune-ai-weight-worker.ts', import.meta.url)

export function resolveWorkerCount(workers: number | undefined): number {
  if (workers === undefined || workers === 1) {
    return 1
  }

  if (workers <= 0) {
    return Math.max(1, availableParallelism() - 1)
  }

  return Math.max(1, Math.floor(workers))
}

export class WeightEvolutionWorkerPool {
  private readonly slots: WorkerSlot[]
  private readonly pending: PendingTask[] = []
  private closed = false

  constructor(workerCount: number) {
    const workerPath = fileURLToPath(workerModuleUrl)
    const execArgv = getWorkerExecArgv()

    this.slots = Array.from({ length: workerCount }, () => ({
      child: fork(workerPath, [], {
        execArgv,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      }),
      busy: false,
    }))

    for (const slot of this.slots) {
      slot.child.on('message', (message: WeightEvolutionWorkerResponse | WeightEvolutionWorkerError) => {
        if (message.type === 'error') {
          this.finishSlot(slot, undefined, new Error(message.error))
          return
        }

        if (message.type === 'done') {
          this.finishSlot(slot, message.result)
        }
      })

      slot.child.on('error', (error) => {
        this.finishSlot(slot, undefined, error)
      })

      slot.child.on('exit', (code) => {
        if (code !== 0 && !this.closed) {
          const stderr = slot.child.stderr?.read()?.toString()
          const detail = stderr ? `: ${stderr.trim()}` : ''
          this.finishSlot(slot, undefined, new Error(`Worker exited with code ${code}${detail}`))
        }
      })
    }
  }

  run(job: EvaluateGenomeWorkerJob): Promise<EvaluateGenomeWorkerResult> {
    if (this.closed) {
      return Promise.reject(new Error('Worker pool is closed'))
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ job, resolve, reject })
      this.dispatch()
    })
  }

  async runAll(jobs: EvaluateGenomeWorkerJob[]): Promise<EvaluateGenomeWorkerResult[]> {
    const results = await Promise.all(jobs.map((job) => this.run(job)))
    results.sort((left, right) => left.genomeIndex - right.genomeIndex)
    return results
  }

  async close(): Promise<void> {
    this.closed = true
    await Promise.all(
      this.slots.map(
        (slot) =>
          new Promise<void>((resolve) => {
            if (slot.child.connected) {
              slot.child.once('exit', () => resolve())
              slot.child.kill()
              return
            }

            resolve()
          }),
      ),
    )
  }

  private dispatch(): void {
    while (this.pending.length > 0) {
      const idleSlot = this.slots.find((slot) => !slot.busy)

      if (!idleSlot) {
        return
      }

      const task = this.pending.shift()

      if (!task) {
        return
      }

      idleSlot.busy = true
      idleSlot.currentTask = task

      const request: WeightEvolutionWorkerRequest = {
        type: 'run',
        job: task.job,
      }
      idleSlot.child.send(request)
    }
  }

  private finishSlot(
    slot: WorkerSlot,
    result: EvaluateGenomeWorkerResult | undefined,
    error?: Error,
  ): void {
    const task = slot.currentTask
    slot.busy = false
    slot.currentTask = undefined

    if (!task) {
      return
    }

    if (error || !result) {
      task.reject(error ?? new Error('Worker returned no result'))
    } else {
      task.resolve(result)
    }

    this.dispatch()
  }
}
