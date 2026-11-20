export type Snap = {
  model: string
  effort: string
  cacheUntil: number
  now: number
  window: number
  percent: number | null
  fiveHour: { pct: number; resetsAt?: string } | null
  sevenDay: { pct: number; resetsAt?: string } | null
}

declare module 'claude-code' {
  interface PluginState {
    'status-bar': { snap: Snap }
  }
}
