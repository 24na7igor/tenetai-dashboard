import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  CheckCircle, XCircle, Clock, User, Bot, ChevronRight,
  Search, History, Filter, Activity, AlertTriangle, WifiOff,
  TrendingUp, Zap, ShieldAlert,
} from 'lucide-react'
import { fetchExecutions, fetchCaptureHealth, CaptureHealth, Execution } from '../api'
import { useWorkspace } from '../context/WorkspaceContext'
import { useState } from 'react'

const parseUTCDateMaybe = (ts: string | null): Date | null =>
  ts ? new Date(ts.endsWith('Z') ? ts : ts + 'Z') : null

const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

function StatsStrip({ executions }: { executions?: Execution[] }) {
  const total = executions?.length ?? 0
  const overrides = executions?.filter(e => e.actor === 'human').length ?? 0
  const successes = executions?.filter(e => e.result === 'success').length ?? 0
  const failures = executions?.filter(e => e.result === 'failure').length ?? 0
  const overrideRate = total > 0 ? (overrides / total * 100).toFixed(1) : null
  const successRate = total > 0 ? (successes / total * 100).toFixed(1) : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* Total */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] px-4 py-3.5 relative overflow-hidden group hover:border-white/[0.11] transition-colors">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-500/[0.06] rounded-full blur-2xl group-hover:bg-violet-500/[0.09] transition-colors" />
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3 w-3 text-slate-600" />
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Executions</p>
        </div>
        <p className="text-3xl font-mono font-bold tabular-nums text-slate-100 leading-none">{total}</p>
        <p className="text-[11px] text-slate-700 mt-1.5">last 50 captured</p>
      </div>

      {/* Override rate */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] px-4 py-3.5 relative overflow-hidden group hover:border-violet-500/20 transition-colors">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-500/[0.08] rounded-full blur-2xl group-hover:bg-violet-500/[0.12] transition-colors" />
        <div className="flex items-center gap-1.5 mb-2">
          <User className="h-3 w-3 text-slate-600" />
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Override Rate</p>
        </div>
        <p className="text-3xl font-mono font-bold tabular-nums leading-none text-violet-400">
          {overrideRate !== null ? `${overrideRate}%` : '—'}
        </p>
        <p className="text-[11px] text-slate-700 mt-1.5">{overrides} human overrides</p>
      </div>

      {/* Success rate */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] px-4 py-3.5 relative overflow-hidden group hover:border-neptune-500/20 transition-colors">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-neptune-500/[0.05] rounded-full blur-2xl group-hover:bg-neptune-500/[0.09] transition-colors" />
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="h-3 w-3 text-slate-600" />
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Success Rate</p>
        </div>
        <p className="text-3xl font-mono font-bold tabular-nums leading-none text-neptune-400">
          {successRate !== null ? `${successRate}%` : '—'}
        </p>
        <p className="text-[11px] text-slate-700 mt-1.5">{successes} succeeded</p>
      </div>

      {/* Failures */}
      <div className={`bg-obsidian-900 rounded-xl border px-4 py-3.5 relative overflow-hidden group transition-colors ${
        failures > 0
          ? 'border-signal-500/20 hover:border-signal-500/30'
          : 'border-white/[0.07] hover:border-white/[0.11]'
      }`}>
        <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl transition-colors ${
          failures > 0 ? 'bg-signal-500/[0.07]' : 'bg-white/[0.02]'
        }`} />
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldAlert className="h-3 w-3 text-slate-600" />
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Failures</p>
        </div>
        <p className={`text-3xl font-mono font-bold tabular-nums leading-none ${
          failures > 0 ? 'text-signal-400' : 'text-slate-600'
        }`}>
          {failures}
        </p>
        <p className="text-[11px] text-slate-700 mt-1.5">
          {failures > 0 ? `${failures} need review` : 'all clear'}
        </p>
      </div>
    </div>
  )
}

// ─── Health banner ────────────────────────────────────────────────────────────

function IntegrationHealthBanner({ workspaceId }: { workspaceId?: string }) {
  const { data, isLoading, isError } = useQuery<CaptureHealth>({
    queryKey: ['capture-health', workspaceId],
    queryFn: () => fetchCaptureHealth(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 60_000,
    retry: 1,
  })

  if (isLoading) return null

  const effectiveData: CaptureHealth = data ?? (isError ? {
    status: 'unknown',
    last_capture_at: null,
    captures_24h: 0,
    captures_1h: 0,
    message: 'Could not reach capture-health endpoint.',
  } : null as any)

  if (!effectiveData) return null

  const lastSeen = parseUTCDateMaybe(effectiveData.last_capture_at)

  const config: Record<CaptureHealth['status'], {
    border: string; icon: React.ElementType; iconColor: string;
    dot: string; label: string; labelColor: string; ping: boolean
  }> = {
    active: {
      border: 'border-neptune-500/20', icon: Activity,
      iconColor: 'text-neptune-500', dot: 'bg-neptune-500', label: 'Active',
      labelColor: 'text-neptune-400', ping: true,
    },
    silent: {
      border: 'border-amber-500/20', icon: AlertTriangle,
      iconColor: 'text-amber-400', dot: 'bg-amber-400', label: 'Silent',
      labelColor: 'text-amber-400', ping: false,
    },
    inactive: {
      border: 'border-amber-500/20', icon: AlertTriangle,
      iconColor: 'text-amber-500', dot: 'bg-amber-500', label: 'Inactive',
      labelColor: 'text-amber-400', ping: false,
    },
    never: {
      border: 'border-white/[0.07]', icon: WifiOff,
      iconColor: 'text-slate-500', dot: 'bg-slate-600', label: 'Not connected',
      labelColor: 'text-slate-400', ping: false,
    },
    unknown: {
      border: 'border-white/[0.07]', icon: WifiOff,
      iconColor: 'text-slate-600', dot: 'bg-slate-700', label: 'Unknown',
      labelColor: 'text-slate-500', ping: false,
    },
  }

  const c = config[effectiveData.status]
  const Icon = c.icon

  return (
    <div className={`rounded-xl border ${c.border} bg-white/[0.02] px-4 py-3 mb-5 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="relative flex h-2 w-2">
          {c.ping && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neptune-500 opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
        </div>
        <Icon className={`h-3.5 w-3.5 ${c.iconColor}`} />
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${c.labelColor}`}>
            SDK {c.label}
          </span>
          <span className="text-sm text-slate-600 opacity-75">
            {effectiveData.message}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5 text-xs text-slate-600 shrink-0 ml-4">
        {lastSeen && (
          <span>
            Last capture{' '}
            <span className="font-medium text-slate-400">
              {formatDistanceToNow(lastSeen, { addSuffix: true })}
            </span>
          </span>
        )}
        <span>
          <span className="font-mono font-semibold text-slate-300">{effectiveData.captures_24h}</span>
          <span className="text-slate-600 ml-1">/ 24h</span>
        </span>
        <span>
          <span className="font-mono font-semibold text-slate-300">{effectiveData.captures_1h}</span>
          <span className="text-slate-600 ml-1">/ 1h</span>
        </span>
      </div>
    </div>
  )
}

function ResultDot({ result }: { result: Execution['result'] }) {
  switch (result) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1.5 text-neptune-500">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">success</span>
        </span>
      )
    case 'failure':
      return (
        <span className="inline-flex items-center gap-1.5 text-signal-400">
          <XCircle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">failure</span>
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">pending</span>
        </span>
      )
  }
}

// Result → left-border color
const BORDER_COLOR: Record<Execution['result'], string> = {
  success: 'inset 2px 0 0 #00d4aa',
  failure: 'inset 2px 0 0 #ff4757',
  pending: 'inset 2px 0 0 #f59e0b',
}

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace()
  const [sessionIdFilter, setSessionIdFilter] = useState('')
  const [overridesOnly, setOverridesOnly] = useState(false)

  const { data: executions, isLoading, error } = useQuery({
    queryKey: ['executions', currentWorkspace?.id, sessionIdFilter],
    queryFn: () => fetchExecutions({
      workspace_id: currentWorkspace?.id,
      session_id: sessionIdFilter || undefined,
      limit: 50
    }),
    enabled: !!currentWorkspace,
  })

  if (isLoading) {
    return (
      <div>
        <IntegrationHealthBanner workspaceId={currentWorkspace?.id} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-obsidian-900 rounded-xl border border-white/[0.07] h-24 animate-pulse" />
          ))}
        </div>
        <div className="flex items-center justify-center h-40">
          <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse opacity-50" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <IntegrationHealthBanner workspaceId={currentWorkspace?.id} />
        <div className="bg-signal-500/10 border border-signal-500/20 rounded-xl p-4">
          <p className="text-signal-400 text-sm">Failed to load executions. Make sure the API is running.</p>
        </div>
      </div>
    )
  }

  const filteredExecutions = overridesOnly
    ? executions?.filter((e) => e.actor === 'human')
    : executions

  return (
    <div>
      <IntegrationHealthBanner workspaceId={currentWorkspace?.id} />

      {/* Stats strip — computed from data */}
      <StatsStrip executions={executions} />

      {/* Page header + filters */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Executions</h1>
          <p className="text-xs text-slate-600 mt-0.5">Audit log of agent decisions and actions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setOverridesOnly(!overridesOnly)}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              overridesOnly
                ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                : 'border-white/[0.08] bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            <Filter className="h-3 w-3 mr-1.5" />
            Overrides Only
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by Session ID…"
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-obsidian-900 border border-white/[0.08] rounded-lg text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/40 w-full sm:w-52 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {!filteredExecutions || filteredExecutions.length === 0 ? (
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-12 text-center">
          <div className="relative inline-flex mb-5">
            <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl" />
            <Bot className="relative h-10 w-10 text-slate-700" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-1">
            {overridesOnly ? 'No overrides found' : 'No executions yet'}
          </h3>
          <p className="text-xs text-slate-600">
            {overridesOnly
              ? 'No human override executions match the current filters.'
              : 'Run your agent with the Tenet SDK to see executions appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {/* spacer for the left-border stripe */}
                  <th className="w-0" />
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Action</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Actor</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Time</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Session</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-700 uppercase tracking-widest">Effects</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredExecutions.map((execution) => (
                  <tr
                    key={execution.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                    style={{ boxShadow: BORDER_COLOR[execution.result] }}
                  >
                    {/* color stripe placeholder */}
                    <td className="w-0 p-0" />
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ResultDot result={execution.result} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-slate-200">{execution.action}</span>
                        {execution.actor === 'human' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-violet-500/10 text-violet-400 border-violet-500/20">
                            Override
                          </span>
                        )}
                        {execution.outcome_score !== null && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            execution.outcome_score >= 0.7
                              ? 'bg-neptune-500/10 text-neptune-400 border-neptune-500/20'
                              : execution.outcome_score >= 0.4
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-signal-500/10 text-signal-400 border-signal-500/20'
                          }`}>
                            {Math.round(execution.outcome_score * 100)}%
                          </span>
                        )}
                      </div>
                      {execution.override_reason && (
                        <p className="text-[11px] text-slate-700 mt-0.5 font-mono truncate max-w-xs">
                          {execution.override_reason.length > 64
                            ? execution.override_reason.slice(0, 64) + '…'
                            : execution.override_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {execution.actor === 'human' ? (
                          <User className="h-3 w-3 text-violet-400" />
                        ) : (
                          <Bot className="h-3 w-3 text-slate-600" />
                        )}
                        <span className="text-xs text-slate-500 capitalize">{execution.actor}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-600">
                        {format(parseUTCDate(execution.created_at), 'MMM d, HH:mm:ss')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {execution.session_id ? (
                        <Link
                          to={`/sessions/${execution.session_id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-violet-400 transition-colors"
                        >
                          <History className="h-3 w-3" />
                          {execution.session_id.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-slate-800 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {execution.side_effects.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 border border-white/[0.05] bg-white/[0.02]">
                          {execution.side_effects.length} fx
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        to={`/executions/${execution.id}`}
                        className="inline-flex items-center gap-0.5 text-xs text-slate-700 hover:text-violet-400 transition-colors"
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
            <p className="text-[11px] text-slate-700">
              {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? 's' : ''}
              {overridesOnly ? ' · override filter active' : ''}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-slate-800">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neptune-500 inline-block" /> success</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-signal-500 inline-block" /> failure</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
