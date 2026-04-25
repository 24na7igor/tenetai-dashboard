import { CheckCircle, XCircle, ShieldAlert, AlertTriangle, UserCheck, ArrowRight } from 'lucide-react'
import type { ReplayResponse, FieldDiff } from '../api'

// Three-tier drift system:
//   🔴 CRITICAL  — chosen action changed
//   🟡 SEMANTIC  — action same, reasoning/confidence shifted beyond tolerance
//   🟢 MATCH     — decision is stable

const CONFIDENCE_TOLERANCE = 0.05

type DriftLevel = 'match' | 'semantic' | 'critical'

function confidenceDelta(diff: FieldDiff): number {
  return Math.abs(
    parseFloat(diff.original ?? '0') - parseFloat(diff.replayed ?? '0')
  )
}

function getDriftLevel(replayData: ReplayResponse): DriftLevel {
  if (!replayData.diverged) return 'match'

  const actionChanged = replayData.diffs.some(
    (d) => (d.field === 'chosen_action' || d.field === 'action') && d.changed
  )
  if (actionChanged) return 'critical'

  const changed = replayData.diffs.filter((d) => d.changed)
  if (
    changed.length === 1 &&
    changed[0].field === 'confidence' &&
    confidenceDelta(changed[0]) <= CONFIDENCE_TOLERANCE
  ) {
    return 'match'
  }

  return 'semantic'
}

function DriftBadge({ level }: { level: DriftLevel }) {
  if (level === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-signal-500/15 text-signal-400 border border-signal-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-500 animate-pulse" />
        Critical Drift
      </span>
    )
  }
  if (level === 'semantic') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Semantic Drift
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neptune-500/15 text-neptune-400 border border-neptune-500/30">
      <span className="h-1.5 w-1.5 rounded-full bg-neptune-500" />
      Match
    </span>
  )
}

function DiffRow({ diff }: { diff: FieldDiff }) {
  const withinTolerance =
    diff.field === 'confidence' && diff.changed && confidenceDelta(diff) <= CONFIDENCE_TOLERANCE

  const effectiveChange = diff.changed && !withinTolerance

  return (
    <tr className={effectiveChange ? 'bg-amber-500/[0.05]' : 'bg-neptune-500/[0.03]'}>
      <td className="px-4 py-3 text-sm font-medium text-slate-300 capitalize">
        {diff.field}
        {withinTolerance && (
          <span className="ml-2 text-xs text-slate-600 font-normal">(±{CONFIDENCE_TOLERANCE} tolerance)</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-pre-wrap break-words max-w-xs">
        {diff.original ?? <span className="text-slate-700 italic">none</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-pre-wrap break-words max-w-xs">
        {diff.replayed ?? <span className="text-slate-700 italic">none</span>}
      </td>
      <td className="px-4 py-3 text-center">
        {effectiveChange ? (
          <XCircle className="h-4 w-4 text-amber-400 inline-block" />
        ) : (
          <CheckCircle className="h-4 w-4 text-neptune-500 inline-block" />
        )}
      </td>
    </tr>
  )
}

interface Props {
  replayData: ReplayResponse
  onOverride?: () => void
}

const LEVEL_CONFIG = {
  critical: {
    border: 'border-signal-500/30',
    bg: 'bg-signal-500/[0.07]',
    Icon: ShieldAlert,
    iconColor: 'text-signal-400',
    titleColor: 'text-slate-100',
    textColor: 'text-signal-400',
    title: 'Critical Drift — Agent Would Make a Different Decision Today',
    defaultDesc: 'The chosen action has changed. This decision would lead to a materially different outcome if made now.',
    ctaColor: 'bg-signal-500 hover:bg-signal-400',
  },
  semantic: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/[0.05]',
    Icon: AlertTriangle,
    iconColor: 'text-amber-400',
    titleColor: 'text-slate-100',
    textColor: 'text-amber-400',
    title: 'Semantic Drift — Reasoning Has Shifted',
    defaultDesc: "The final action is the same, but the agent's reasoning has changed. The decision is technically correct — but its justification has drifted.",
    ctaColor: 'bg-amber-600 hover:bg-amber-500',
  },
  match: {
    border: 'border-neptune-500/20',
    bg: 'bg-neptune-500/[0.05]',
    Icon: CheckCircle,
    iconColor: 'text-neptune-500',
    titleColor: 'text-slate-100',
    textColor: 'text-slate-400',
    title: 'Replay Matched — Decision Is Stable',
    defaultDesc: 'The agent would make the same decision with the same reasoning today. No drift detected.',
    ctaColor: '',
  },
}

export default function SemanticDiff({ replayData, onOverride }: Props) {
  const { divergence_reason, replay_error, diffs } = replayData
  const level = getDriftLevel(replayData)
  const cfg = LEVEL_CONFIG[level]
  const Icon = cfg.Icon

  const effectiveChanges = diffs.filter((d) => {
    if (!d.changed) return false
    if (d.field === 'confidence' && confidenceDelta(d) <= CONFIDENCE_TOLERANCE) return false
    return true
  })

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg}`}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h3 className={`font-semibold text-sm ${cfg.titleColor}`}>{cfg.title}</h3>
            <DriftBadge level={level} />
          </div>
          <p className={`text-sm leading-relaxed ${cfg.textColor}`}>
            {divergence_reason || cfg.defaultDesc}
          </p>
          {replay_error && (
            <p className="text-sm text-signal-400 mt-1">{replay_error}</p>
          )}
          {level !== 'match' && effectiveChanges.length > 0 && (
            <p className="text-xs text-slate-600 mt-2">
              {effectiveChanges.length} field{effectiveChanges.length > 1 ? 's' : ''} changed
              {diffs.some((d) => d.field === 'confidence' && d.changed && confidenceDelta(d) <= CONFIDENCE_TOLERANCE)
                ? ' · confidence within tolerance (ignored)'
                : ''}
            </p>
          )}
        </div>

        {level !== 'match' && onOverride && (
          <div className="flex-shrink-0 pl-3">
            <button
              onClick={onOverride}
              className={`inline-flex items-center px-3 py-1.5 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${cfg.ctaColor}`}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Fix This
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </button>
          </div>
        )}
      </div>

      {/* Diff table */}
      {diffs.length > 0 && (
        <div className="border-t border-white/[0.07] overflow-x-auto">
          <table className="min-w-full divide-y divide-white/[0.05]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Field</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Original</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Replayed</th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {diffs.map((diff) => (
                <DiffRow key={diff.field} diff={diff} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
