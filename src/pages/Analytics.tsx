import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Download, TrendingUp, UserCheck, Brain, ShieldCheck, Sparkles, Mail } from 'lucide-react'
import { fetchAnalytics, exportTrainingData } from '../api'
import { useWorkspace } from '../context/WorkspaceContext'
import { useState } from 'react'

const parseUTCDate = (ts: string) => new Date(ts.endsWith('Z') ? ts : ts + 'Z')

const ACTION_COLORS: Record<string, string> = {
  approve_full_refund:    'bg-neptune-500',
  approve_partial_refund: 'bg-neptune-600',
  escalate_to_human:      'bg-amber-400',
  deny_refund:            'bg-signal-500',
}
const actionColor = (action: string) => ACTION_COLORS[action] ?? 'bg-violet-500'

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100 font-mono">{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  )
}

export default function Analytics() {
  const { currentWorkspace } = useWorkspace()
  const [days, setDays] = useState(30)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', currentWorkspace?.id, days],
    queryFn: () => fetchAnalytics({ workspace_id: currentWorkspace?.id, days }),
    enabled: !!currentWorkspace,
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportTrainingData({ workspace_id: currentWorkspace?.id })
    } finally {
      setExporting(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse opacity-50" />
      </div>
    )
  }

  const overridePct = (data.override_rate * 100).toFixed(1)
  const confPct = (data.avg_confidence * 100).toFixed(0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Decision quality, override patterns, and training data</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-obsidian-900 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-colors"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Decisions"
          value={data.total_agent_executions.toLocaleString()}
          sub={`${data.total_executions} total incl. overrides`}
          icon={Brain}
          accent="bg-violet-600"
        />
        <StatCard
          label="Override Rate"
          value={`${overridePct}%`}
          sub={`${data.override_count} corrections`}
          icon={UserCheck}
          accent={data.override_rate > 0.2 ? 'bg-signal-500' : data.override_rate > 0.1 ? 'bg-amber-500' : 'bg-neptune-600'}
        />
        <StatCard
          label="Avg Confidence"
          value={`${confPct}%`}
          sub="across all agent decisions"
          icon={TrendingUp}
          accent={Number(confPct) >= 80 ? 'bg-neptune-600' : Number(confPct) >= 60 ? 'bg-amber-500' : 'bg-signal-500'}
        />
        <StatCard
          label="Corrections This Week"
          value={data.overrides_this_week.toString()}
          sub="human override executions"
          icon={ShieldCheck}
          accent="bg-violet-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Decision distribution */}
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
          <h2 className="text-xs font-semibold text-slate-400 mb-4">Decision Distribution</h2>
          {data.decision_distribution.length === 0 ? (
            <p className="text-sm text-slate-600">No agent decisions in this period.</p>
          ) : (
            <div className="space-y-3">
              {data.decision_distribution.map((row) => (
                <div key={row.action}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-300">{row.action}</span>
                    <span className="text-slate-600 tabular-nums">{row.count} · {(row.pct * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${actionColor(row.action)}`}
                      style={{ width: `${(row.pct * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top corrections */}
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
          <h2 className="text-xs font-semibold text-slate-400 mb-4">What Supervisors Correct To</h2>
          {data.top_corrections.length === 0 ? (
            <p className="text-sm text-slate-600">No human overrides recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.top_corrections.map((row) => {
                const maxCount = data.top_corrections[0].count
                return (
                  <div key={row.action}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-mono text-slate-300">{row.action}</span>
                      <span className="text-slate-600 tabular-nums">{row.count} override{row.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${actionColor(row.action)}`}
                        style={{ width: `${(row.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {data.top_corrections.length > 0 && (
            <p className="text-[11px] text-slate-700 mt-4 leading-relaxed">
              High correction rate to a single action = agent consistently under-approving or over-escalating.
            </p>
          )}
        </div>
      </div>

      {/* Training data export */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg flex-shrink-0">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Training Dataset</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                Every human override with a reason is structured as a labeled training example.
                Export as JSONL (OpenAI fine-tuning format) to feed directly into your model improvement pipeline.
              </p>
              <p className="text-sm font-semibold text-violet-400 mt-2 font-mono">
                {data.override_count} example{data.override_count !== 1 ? 's' : ''} ready
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || data.override_count === 0}
            className="inline-flex items-center px-3 py-1.5 border border-white/[0.10] rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.05] hover:text-white disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            {exporting ? 'Exporting…' : 'Export JSONL'}
          </button>
        </div>
      </div>

      {/* Email drift alerts */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex-shrink-0">
            <Mail className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Drift Alerts</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              Tenet automatically sends an email alert whenever a decision divergence is detected during replay.
              No configuration needed — alerts go to all workspace owners and admins.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neptune-500/10 text-neptune-400 border border-neptune-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-neptune-500 inline-block" />
                Active
              </span>
              <span className="text-xs text-slate-600 font-mono">alerts@tenetai.dev · managed by Tenet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent overrides */}
      {data.recent_overrides.length > 0 && (
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <h2 className="text-xs font-semibold text-slate-400">Recent Overrides</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {data.recent_overrides.map((o) => (
              <div key={o.id} className="px-5 py-3.5 flex items-start justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {o.action}
                    </span>
                    {o.overridden_by && (
                      <span className="text-xs text-slate-500">by {o.overridden_by}</span>
                    )}
                  </div>
                  {o.override_reason && (
                    <p className="text-sm text-slate-400 mt-1">{o.override_reason}</p>
                  )}
                </div>
                <span className="text-xs font-mono text-slate-600 whitespace-nowrap ml-4 mt-0.5">
                  {format(parseUTCDate(o.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
