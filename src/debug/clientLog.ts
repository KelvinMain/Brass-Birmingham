const DEBUG_LOG_PATH = '/__debug/log'

export function clientDebugLog(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) {
    return
  }

  const payload = {
    category,
    message,
    data,
    at: new Date().toISOString(),
  }

  void fetch(DEBUG_LOG_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Dev log endpoint is optional when the app is not served by Vite.
  })
}
