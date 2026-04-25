/**
 * ContextSnapshot — dark "context window ledger" visualizer.
 *
 * Renders in two modes:
 *   1. Conversation ledger — when inputs.messages is an array (canonical mode, inspired by 4.png)
 *   2. Data fields fallback — generic key-value pairs
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { Shield, Copy, ChevronDown, ChevronRight, Hash, Clock, Layers } from 'lucide-react'
import type { Context } from '../api'

// ─── Message types ────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool_result' | 'tool_call' | 'memory'

export interface ContextMessage {
  role: MessageRole
  label: string
  content: string | Record<string, unknown> | unknown[]
  tokens?: number
}

const ROLE: Record<MessageRole, { short: string; badge: string; bar: string; dot: string }> = {
  system:      { short: 'SYS',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   bar: 'bg-blue-500',   dot: 'bg-blue-400'   },
  tool_result: { short: 'TOOL',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', bar: 'bg-amber-500',  dot: 'bg-amber-400'  },
  user:        { short: 'USER',  badge: 'bg-green-500/20 text-green-300 border-green-500/30', bar: 'bg-green-500',  dot: 'bg-green-400'  },
  assistant:   { short: 'ASST',  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', bar: 'bg-purple-500', dot: 'bg-purple-400' },
  tool_call:   { short: 'CALL',  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', bar: 'bg-orange-500', dot: 'bg-orange-400' },
  memory:      { short: 'MEM',   badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',   bar: 'bg-gray-500',   dot: 'bg-gray-400'   },
}

// ─── Conversation ledger mode ─────────────────────────────────────────────────

function contentPreview(content: ContextMessage['content']): string {
  if (typeof content === 'string') return content
  return JSON.stringify(content)
}

function MessageRow({
  msg,
  maxTokens,
  index,
}: {
  msg: ContextMessage
  maxTokens: number
  index: number
}) {
  const [open, setOpen] = useState(false)
  const cfg = ROLE[msg.role]
  const tokens = msg.tokens ?? 0
  const barPct = maxTokens > 0 ? Math.max((tokens / maxTokens) * 100, 2) : 2
  const preview = contentPreview(msg.content)

  return (
    <div
      className="group border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-3 px-5 py-2.5">
        {/* Index */}
        <span className="text-[11px] text-gray-600 font-mono w-5 text-right flex-shrink-0 select-none">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Role badge */}
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono flex-shrink-0 w-[38px] text-center ${cfg.badge}`}
        >
          {cfg.short}
        </span>

        {/* Label */}
        <span className="text-sm text-gray-300 font-mono min-w-0 flex-1 truncate">
          {msg.label}
        </span>

        {/* Bar */}
        <div className="w-32 flex-shrink-0 hidden sm:block">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${barPct}%` }} />
          </div>
        </div>

        {/* Token count */}
        {tokens > 0 && (
          <span className="text-[11px] text-gray-500 font-mono flex-shrink-0 w-16 text-right tabular-nums">
            {tokens.toLocaleString()} tok
          </span>
        )}

        {/* Expand */}
        <span className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-3 ml-8">
          <div className="rounded-md bg-white/5 border border-white/10 p-3">
            <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {typeof msg.content === 'string'
                ? msg.content
                : JSON.stringify(msg.content, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationLedger({
  messages,
  context,
}: {
  messages: ContextMessage[]
  context: Context
}) {
  const [copied, setCopied] = useState(false)

  const totalTokens = messages.reduce((s, m) => s + (m.tokens ?? 0), 0)
  const maxTokens = Math.max(...messages.map((m) => m.tokens ?? 0), 1)

  // Composition totals by role
  type RoleKey = MessageRole
  const byRole = messages.reduce<Partial<Record<RoleKey, number>>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + (m.tokens ?? 1)
    return acc
  }, {})

  const compositionEntries = (Object.entries(byRole) as [RoleKey, number][]).sort(
    (a, b) => b[1] - a[1]
  )

  const parseUTC = (ts: string) => new Date(ts.endsWith('Z') ? ts : ts + 'Z')

  const copyHash = () => {
    navigator.clipboard.writeText(context.snapshot_hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const hasExternal = Object.keys(context.external_versions).length > 0

  return (
    <div className="bg-[#0d0d14] rounded-xl border border-white/10 overflow-hidden shadow-xl">
      {/* ── Top stats bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-5">
          <span className="text-white font-semibold text-sm tracking-wider">Context Window</span>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">blocks </span>
              <span className="text-white font-mono font-semibold">{messages.length}</span>
            </div>
            {totalTokens > 0 && (
              <div>
                <span className="text-gray-500">tokens </span>
                <span className="text-white font-mono font-semibold">
                  ~{totalTokens.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            <span>Immutable</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(parseUTC(context.created_at), 'MMM d, HH:mm:ss')}</span>
          </div>
        </div>
      </div>

      {/* ── Composition bar ───────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-white/10">
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {compositionEntries.map(([role, count]) => (
            <div
              key={role}
              className={`h-full ${ROLE[role].bar}`}
              style={{ width: `${(count / totalTokens) * 100}%` }}
              title={`${role}: ${count} tokens`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          {compositionEntries.map(([role]) => (
            <div key={role} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${ROLE[role].dot}`} />
              <span className="text-[11px] text-gray-500 font-mono uppercase">{role.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hash strip ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 bg-white/3 border-b border-white/8">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-3 w-3 text-gray-600 flex-shrink-0" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold flex-shrink-0">
            SHA-256
          </span>
          <span className="text-[11px] font-mono text-gray-500 truncate">
            {context.snapshot_hash}
          </span>
        </div>
        <button
          onClick={copyHash}
          className="ml-3 flex-shrink-0 text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* ── Message ledger ────────────────────────────────────────────────── */}
      <div>
        {messages.map((msg, i) => (
          <MessageRow key={i} msg={msg} maxTokens={maxTokens} index={i} />
        ))}
      </div>

      {/* ── External dependencies ─────────────────────────────────────────── */}
      {hasExternal && (
        <div className="px-5 py-3 border-t border-white/10 bg-white/3">
          <div className="flex items-center gap-2 mb-2.5">
            <Layers className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
              External Dependencies at Snapshot Time
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(context.external_versions).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md"
              >
                <span className="text-[11px] font-mono text-gray-400">{k}</span>
                <span className="text-gray-700">·</span>
                <span className="text-[11px] font-mono text-gray-500">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Data fields fallback mode ────────────────────────────────────────────────

type FieldType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'null'

function detectType(v: unknown): FieldType {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return 'array'
  if (typeof v === 'object') return 'object'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  return 'string'
}

const FIELD_CFG: Record<FieldType, { label: string; badge: string }> = {
  number:  { label: 'NUM',  badge: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  string:  { label: 'STR',  badge: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  boolean: { label: 'BOOL', badge: 'text-amber-600 bg-amber-50 border-amber-100' },
  array:   { label: 'ARR',  badge: 'text-purple-600 bg-purple-50 border-purple-100' },
  object:  { label: 'OBJ',  badge: 'text-blue-600 bg-blue-50 border-blue-100' },
  null:    { label: 'NULL', badge: 'text-gray-400 bg-gray-50 border-gray-100' },
}

function DataRow({ name, value, numericMax }: { name: string; value: unknown; numericMax: number }) {
  const [open, setOpen] = useState(false)
  const type = detectType(value)
  const cfg = FIELD_CFG[type]
  const expandable = type === 'object' || type === 'array'

  return (
    <div>
      <div
        className={`flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-gray-50 transition-colors ${expandable ? 'cursor-pointer' : ''}`}
        onClick={expandable ? () => setOpen((v) => !v) : undefined}
      >
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>
        <span className="text-sm font-mono text-gray-500 flex-shrink-0 min-w-[130px]">{name}</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {type === 'number' && (() => {
            const pct = numericMax > 0 ? Math.min((Math.abs(value as number) / numericMax) * 100, 100) : 0
            return (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                  <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-mono text-gray-700 tabular-nums">{value as number}</span>
              </div>
            )
          })()}
          {type === 'string' && <span className="text-sm text-gray-800 truncate font-mono">&quot;{value as string}&quot;</span>}
          {type === 'boolean' && <span className={`text-sm font-semibold ${value ? 'text-green-600' : 'text-red-500'}`}>{String(value)}</span>}
          {type === 'array' && !open && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(value as unknown[]).slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-mono">
                  {typeof item === 'object' ? '{…}' : String(item)}
                </span>
              ))}
              {(value as unknown[]).length > 3 && <span className="text-xs text-gray-400">+{(value as unknown[]).length - 3}</span>}
            </div>
          )}
          {type === 'object' && !open && <span className="text-xs text-gray-400">{Object.keys(value as object).length} fields</span>}
          {type === 'null' && <span className="text-sm text-gray-400 italic">null</span>}
        </div>
        {expandable && (
          <span className="flex-shrink-0 text-gray-300">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </div>
      {expandable && open && (
        <div className="ml-5 border-l-2 border-gray-100 pl-3 mt-0.5 mb-1">
          {type === 'object' && Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <DataRow key={k} name={k} value={v} numericMax={numericMax} />
          ))}
          {type === 'array' && (value as unknown[]).map((item, i) => (
            <DataRow key={i} name={`[${i}]`} value={item} numericMax={numericMax} />
          ))}
        </div>
      )}
    </div>
  )
}

function DataFieldsFallback({ context }: { context: Context }) {
  const [copied, setCopied] = useState(false)
  const fields = Object.entries(context.inputs)
  const numericMax = Math.max(...Object.values(context.inputs).filter((v): v is number => typeof v === 'number').map(Math.abs), 1)
  const parseUTC = (ts: string) => new Date(ts.endsWith('Z') ? ts : ts + 'Z')

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm tracking-wide">CONTEXT SNAPSHOT</span>
          <span className="text-gray-500 text-sm">·</span>
          <span className="text-gray-400 text-sm">{fields.length} fields</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            <span>Immutable</span>
          </div>
          <span className="text-gray-600">·</span>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(parseUTC(context.created_at), 'MMM d, HH:mm:ss')}</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex-shrink-0">SHA-256</span>
          <span className="text-xs font-mono text-gray-500 truncate">{context.snapshot_hash}</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(context.snapshot_hash); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="ml-3 flex-shrink-0 text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
          <Copy className="h-3 w-3" />{copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-5 space-y-0.5">
        {fields.map(([k, v]) => <DataRow key={k} name={k} value={v} numericMax={numericMax} />)}
      </div>
      {Object.keys(context.external_versions).length > 0 && (
        <div className="px-5 pb-5 pt-0 border-t border-gray-100 mt-2">
          <div className="flex items-center gap-2 mb-2 mt-4">
            <Layers className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">External Dependencies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(context.external_versions).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-xs font-mono font-medium text-gray-700">{k}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-mono text-gray-500">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  context: Context
}

export default function ContextSnapshot({ context }: Props) {
  const messages = (context.inputs as Record<string, unknown>).messages

  if (Array.isArray(messages)) {
    return (
      <ConversationLedger
        messages={messages as ContextMessage[]}
        context={context}
      />
    )
  }

  return <DataFieldsFallback context={context} />
}
