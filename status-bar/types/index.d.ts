export type Snap = {
  model: string
  effort: string
  cacheUntil: number
  now: number
  window: number
  percent: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'status-bar': { snap: Snap }
  }
}
