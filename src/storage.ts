export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`invoker:${key}`)
    return raw == null ? fallback : { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`invoker:${key}`, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode etc.) — settings just won't persist
  }
}
