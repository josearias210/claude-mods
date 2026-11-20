import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Snap } from '../types'

const initial: Snap = { model: '', effort: '', cacheUntil: 0, now: 0, window: 0, percent: null, fiveHour: null, sevenDay: null }
const snap = atom({ plugin: 'status-bar', key: 'snap' } as const, initial)

const SKY = '#7dcfff'
const LILAC = '#bb9af7'
const MINT = '#8fd1a4'
const PEACH = '#f2a379'
const ROSE = '#f7768e'
const MUTED = '#7f849c'

const fmtTokens = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}k`)

const fmtLeft = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const quotaColor = (p: number) => (p >= 90 ? ROSE : p >= 70 ? PEACH : MINT)

const fmtReset = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  if (min >= 1440) return ` · ${Math.floor(min / 1440)}d${Math.floor((min % 1440) / 60)}h`
  if (min >= 60) return ` · ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return ` · ${min}m`
}

const shortModel = (m: string) => m.replace(/^claude-/, '').replace(/-\d{8}$/, '')

async function refresh($: any) {
  const now = await $.clock.now()
  const { context, rateLimits } = await $.session.usage()
  const pick = (k: string) => {
    const r = (rateLimits ?? []).find((x: any) => x.kind === k)
    return r ? { pct: Math.round(r.percentUsed), resetsAt: r.resetsAt } : null
  }
  await update($, snap, (s: Snap) => ({
    ...s,
    now,
    window: context.window,
    percent: context.percent ?? null,
    fiveHour: pick('five_hour'),
    sevenDay: pick('seven_day'),
  }))
}

let timer: { cancel: () => void } | undefined

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.ui.status(undefined)
    timer?.cancel()
    timer = $.clock.every(1000, () => refresh($))
    await refresh($)
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId) return yield* next(e)
    const sentAt = await $.clock.now()
    await update($, snap, (s: Snap) => ({
      ...s,
      model: e.model,
      effort: e.effort === undefined ? '' : String(e.effort),
    }))
    const res = yield* next(e)
    const u = res.usage
    if (u) {
      const ttl = (u.ephemeral_1h_input_tokens ?? 0) > 0 ? 3_600_000 : 300_000
      const touched = u.cache_read_input_tokens > 0 || u.cache_creation_input_tokens > 0
      await update($, snap, (s: Snap) => ({
        ...s,
        model: u.model || s.model,
        cacheUntil: touched ? sentAt + ttl : s.cacheUntil,
      }))
    }
    await refresh($)
    return res
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const s = await read($, snap)
    const { Box, Text } = $.ui.resolve(e)

    const left = s.cacheUntil - s.now
    const cacheColor = left <= 0 ? ROSE : left < 60_000 ? PEACH : MINT
    const cacheText = s.cacheUntil === 0 ? '--' : left <= 0 ? 'expired' : fmtLeft(left)

    const free = s.percent === null ? null : Math.max(0, 100 - s.percent)
    const ctxColor = free === null ? MUTED : free < 10 ? ROSE : free < 25 ? PEACH : MINT


    return (
      <Box>
        {await next(e)}<Text> </Text>
        <Text color={SKY}>◆ {s.model ? shortModel(s.model) : 'model'}</Text>
        <Text color={MUTED}> │ </Text>
        <Text color={LILAC}>✦ {s.effort || 'n/a'}</Text>
        <Text color={MUTED}> │ </Text>
        <Text color={cacheColor}>◷ cache {cacheText}</Text>
        <Text color={MUTED}> │ </Text>
        <Text color={ctxColor}>
          ▤ {s.window ? fmtTokens(s.window) : '--'}
          {free === null ? '' : ` · ${free}% left`}
        </Text>
        {s.fiveHour ? <Text color={MUTED}> │ </Text> : null}
        {s.fiveHour ? (
          <Text color={quotaColor(s.fiveHour.pct)}>
            ⏱ 5h {s.fiveHour.pct}%{fmtReset(s.fiveHour.resetsAt, s.now)}
          </Text>
        ) : null}
        {s.sevenDay ? <Text color={MUTED}> │ </Text> : null}
        {s.sevenDay ? (
          <Text color={quotaColor(s.sevenDay.pct)}>
            ▦ 7d {s.sevenDay.pct}%{fmtReset(s.sevenDay.resetsAt, s.now)}
          </Text>
        ) : null}
      </Box>
    )
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    const hint = e.props.hint
    if (!hint) return next(e)

    const cut = hint.indexOf(' (')
    const mode = cut > 0 ? hint.slice(0, cut) : hint
    const rest = cut > 0 ? hint.slice(cut) : ''

    return (
      <Box>
        <Text color={MINT}>{mode}</Text>
        <Text color={MUTED}>{rest}</Text>
      </Box>
    )
  })
}
