import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Row, Snap } from '../types'

const PANE = 'agents'
const MAIN = 'main'

const snap = atom({ plugin: 'agent-panel', key: 'snap' } as const, { rows: [], now: 0 } as Snap)
const selected = atom({ plugin: 'agent-panel', key: 'selected' } as const, null)
const open = atom({ plugin: 'agent-panel', key: 'open' } as const, {} as Record<string, boolean>)

const SKY = '#7dcfff'
const LILAC = '#bb9af7'
const MINT = '#8fd1a4'
const PEACH = '#f2a379'
const ROSE = '#f7768e'
const MUTED = '#7f849c'

const ICON: Record<string, [string, string]> = {
  running: ['▶', MINT],
  waiting: ['◐', PEACH],
  idle: ['◌', MUTED],
  pending: ['○', MUTED],
  completed: ['✓', MUTED],
  failed: ['✗', ROSE],
  killed: ['⊘', ROSE],
}

const fmtAge = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`
}

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`

const addressOf = (r: Row) => r.name || r.id

function childrenOf(rows: Row[], id: string): Row[] {
  return rows.filter(r => (r.parentId ?? (r.isTeammate ? undefined : MAIN)) === id)
}

function hasWaiting(rows: Row[], id: string): boolean {
  return childrenOf(rows, id).some(c => c.status === 'waiting' || hasWaiting(rows, c.id))
}

function chain(rows: Row[], r: Row): string {
  const names = [addressOf(r)]
  let parentId = r.parentId
  while (parentId) {
    const p = rows.find(x => x.id === parentId)
    if (!p) break
    names.unshift(addressOf(p))
    parentId = p.parentId
  }
  return r.isTeammate ? names.join(' › ') : [MAIN, ...names].join(' › ')
}

async function refresh($: any) {
  const now = await $.clock.now()
  const list = await $.agent.list()
  const rows: Row[] = list.map((a: any) => ({
    id: a.id,
    parentId: a.parentId,
    name: a.name || a.description || a.type,
    type: a.type,
    status: a.status,
    label: a.label,
    model: a.model,
    tokens: a.tokenCount,
    window: a.contextWindowSize,
    startTime: a.startTime,
    isTeammate: a.kind === 'in_process_teammate',
  }))
  await update($, snap, () => ({ rows, now }))
}

let timer: { cancel: () => void } | undefined

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agent-panel', description: 'Open the agents pane' })
    timer?.cancel()
    timer = $.clock.every(1000, () => refresh($))
    await refresh($)
    return next(e)
  })

  on('command.run', { command: 'agent-panel' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents' })
    return { text: 'Agents pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const { rows, now } = await read($, snap)
    const sel = await read($, selected)
    const overrides = await read($, open)

    const waiting = rows.filter(r => r.status === 'waiting')
    const chosen = rows.find(r => r.id === sel)

    const lines: any[] = []
    const walk = (parent: Row[], prefix: string) => {
      parent.forEach((r, i) => {
        const isLast = i === parent.length - 1
        const kids = childrenOf(rows, r.id)
        const isOpen = overrides[r.id] ?? r.status !== 'completed'
        const [glyph, color] = ICON[r.status] ?? ['•', MUTED]
        const mark = hasWaiting(rows, r.id) ? ' ●' : ''
        const isLive = r.status === 'running' || r.status === 'waiting'
        const age = isLive ? ` ${fmtAge(now - r.startTime)}` : ''

        lines.push(
          <Box key={`row-${r.id}`}>
            <Text color={MUTED}>
              {prefix}
              {isLast ? '└─' : '├─'}
            </Text>
            {kids.length > 0 ? (
              <Button
                key={`tog-${r.id}`}
                plain
                dimColor
                label={isOpen ? '▾' : '▸'}
                onPress={() =>
                  update($, open, (o: Record<string, boolean>) => ({ ...o, [r.id]: !isOpen }))
                }
              />
            ) : (
              <Text> </Text>
            )}
            <Button
              key={`sel-${r.id}`}
              plain
              label={`${glyph} ${r.name}`}
              onPress={() => update($, selected, () => r.id)}
            />
            <Text color={color} bold={r.id === sel}>
              {' '}
              {r.status}
              {age}
            </Text>
            <Text color={PEACH}>{mark}</Text>
          </Box>,
        )
        if (kids.length > 0 && isOpen) walk(kids, prefix + (isLast ? '   ' : '│  '))
      })
    }

    lines.push(
      <Box key="main">
        <Text color={SKY} bold>
          ▶ {MAIN}
        </Text>
        <Text color={MUTED}> running</Text>
        {waiting.length > 0 ? <Text color={PEACH}> ●</Text> : null}
      </Box>,
    )
    walk(childrenOf(rows, MAIN), '')

    const roots = rows.filter(r => r.isTeammate && !r.parentId)
    if (roots.length > 0) {
      lines.push(
        <Text key="team" color={LILAC}>
          team
        </Text>,
      )
      walk(roots, '')
    }

    return (
      <Box flexDirection="column">
        {rows.length === 0 && <Text color={MUTED}>No agents yet.</Text>}
        {lines}
        <Text> </Text>
        {waiting.length > 0 ? (
          <Text color={PEACH}>
            ⚠ {waiting.length} waiting: {waiting.map(addressOf).join(', ')}
          </Text>
        ) : (
          <Text color={MUTED}>Nothing waiting for you.</Text>
        )}
        {chosen ? (
          <Box flexDirection="column" borderStyle="round" borderColor={MUTED} paddingX={1}>
            <Text color={SKY} bold>
              {chain(rows, chosen)}
            </Text>
            <Text color={MUTED}>
              {chosen.type}
              {chosen.model ? ` · ${chosen.model}` : ''} · {fmtTokens(chosen.tokens)}
              {chosen.window ? ` / ${fmtTokens(chosen.window)}` : ''}
            </Text>
            {chosen.label ? <Text>{chosen.label}</Text> : null}
            <Box>
              <Button
                key="copy"
                label="Copy name"
                onPress={(press: any) =>
                  $.ui.copy({ text: addressOf(chosen), surface: press.surface })
                }
              />
              <Text> </Text>
              <Button
                key="reply"
                label="Reply"
                onPress={() => $.prompt.fill({ text: `@${addressOf(chosen)} `, mode: 'replace' })}
              />
            </Box>
          </Box>
        ) : (
          <Text color={MUTED}>Click an agent for details.</Text>
        )}
      </Box>
    )
  })
}
