export type DebugLogSource = 'client' | 'server'

export type DebugLogEntry = {
  category: string
  message: string
  data?: Record<string, unknown>
  at?: string
  source?: DebugLogSource
}

export function formatDebugLogEntry(entry: DebugLogEntry): string {
  const timestamp = entry.at ?? new Date().toISOString()
  const source = entry.source ?? 'client'
  const dataSuffix =
    entry.data && Object.keys(entry.data).length > 0 ? ` ${JSON.stringify(entry.data)}` : ''

  return `[${timestamp}] [${source}] [${entry.category}] ${entry.message}${dataSuffix}`
}

export function printDebugLogEntry(entry: DebugLogEntry): void {
  console.log(formatDebugLogEntry(entry))
}

export function writeDebugLog(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  source: DebugLogSource = 'server',
): void {
  printDebugLogEntry({
    category,
    message,
    data,
    at: new Date().toISOString(),
    source,
  })
}
