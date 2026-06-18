import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

import { printDebugLogEntry, type DebugLogEntry } from './log'

const DEBUG_LOG_PATH = '/__debug/log'

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    })

    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })

    request.on('error', reject)
  })
}

async function handleDebugLogRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.end('Method not allowed')
    return
  }

  try {
    const body = await readRequestBody(request)
    const entry = JSON.parse(body) as DebugLogEntry

    printDebugLogEntry({
      ...entry,
      source: 'client',
      at: entry.at ?? new Date().toISOString(),
    })

    response.statusCode = 204
    response.end()
  } catch {
    response.statusCode = 400
    response.end('Invalid debug log payload')
  }
}

export function devDebugLogPlugin(): Plugin {
  return {
    name: 'brass-dev-debug-log',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== DEBUG_LOG_PATH) {
          next()
          return
        }

        void handleDebugLogRequest(request, response)
      })

      server.httpServer?.once('listening', () => {
        printDebugLogEntry({
          category: 'dev',
          message: 'Client debug logs will print here (POST /__debug/log)',
          source: 'server',
        })
      })
    },
  }
}
