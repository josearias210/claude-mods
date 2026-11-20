export type Row = {
  id: string
  parentId?: string
  name: string
  type: string
  status: string
  label: string
  model?: string
  tokens: number
  window?: number
  startTime: number
  isTeammate: boolean
}

export type Snap = { rows: Row[]; now: number }

declare module 'claude-code' {
  interface PluginState {
    'agent-panel': {
      snap: Snap
      selected: string | null
      open: Record<string, boolean>
    }
  }
}
