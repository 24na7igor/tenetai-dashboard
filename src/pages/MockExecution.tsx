/**
 * Demo — report RPT-d846c55d-2026-0313
 *
 * Mirrors the real ExecutionDetail feature set:
 *  - Replay result appears at the top (pushing content down)
 *  - Override + Revert modals with confirmation
 *  - Export Report (generates PDF via generateAuditReport utility)
 *  - Execution Details (Status / Actor / Target / Side Effects / Revert Action)
 *  - Clickable Session Timeline with JSON detail panels
 *  - Outcome Quality section
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle,
  UserCheck, Sparkles, RotateCcw, FlaskConical,
  ChevronRight, Clock, Bot, User, FileDown, Shield,
  ArrowRight, Code2,
} from 'lucide-react'
import ContextSnapshot from '../components/ContextSnapshot'
import SemanticDiff from '../components/SemanticDiff'
import type { Context, Decision, Execution, Intent, ReplayResponse } from '../api'
import type { ContextMessage } from '../components/ContextSnapshot'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INTENT: Intent = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  goal: 'Process customer refund claim — manufacturing defect',
  origin: 'human',
  constraints: [],
  agent_id: 'cs-refund-agent',
  session_id: 'b7f6312-c953-4d4a-88fc-8774833d1d10',
  parent_intent_id: null,
  mcp_server: null,
  tool_name: null,
  created_at: '2026-03-13T08:20:08.000Z',
}

const CONTEXT_MESSAGES: ContextMessage[] = [
  {
    role: 'system',
    label: 'Agent Instructions (cs-refund-agent v3.3.0)',
    tokens: 1840,
    content:
      'You are cs-refund-agent v3.3.0, a customer service AI for refund processing. Handle refund requests according to company policy. VIP Gold/Platinum customers with tenure > 24 months are exempt from defect verification requirements. Auto-approve threshold: $500 for VIP segment. Always log reasoning for compliance.',
  },
  {
    role: 'system',
    label: 'Policy §4.2 — Manufacturing Defect Clause',
    tokens: 920,
    content:
      'Manufacturing defects qualify for refund approval when: (1) Customer tier is Gold or Platinum; (2) Order value is ≤ $500; (3) Claim submitted within 90 days of purchase. For VIP customers with tenure > 24 months, defect verification is waived per internal policy update 2025-Q4.',
  },
  {
    role: 'tool_result',
    label: 'CRM: customer_lookup(cust-vip-00421)',
    tokens: 380,
    content: {
      customer_id: 'cust-vip-00421',
      status: 'VIP Gold',
      tenure_months: 128,
      lifetime_value_usd: 41200,
      open_disputes: 0,
      claim_history: 'clean',
      spending_cap_active: false,
    },
  },
  {
    role: 'user',
    label: 'Turn 1 — Refund request',
    tokens: 45,
    content: 'I received order ORD-2026-03-4821 ($329) and there is a clear manufacturing defect on the product. I need a full refund.',
  },
  {
    role: 'assistant',
    label: 'Turn 2 — VIP profile confirmed',
    tokens: 118,
    content: "I can see you're a VIP Gold customer with 128 months of tenure and a clean history. Your order ($329) is within our auto-approve threshold. Let me check the applicable policy for manufacturing defect claims.",
  },
  {
    role: 'user',
    label: 'Turn 3 — Defect confirmed',
    tokens: 28,
    content: 'Yes, the defect is clearly visible. Photos are attached to the ticket.',
  },
]

const MOCK_CONTEXT: Context = {
  id: 'ctx-d5c04b35-5983-7000-e4d0-ba104e006907',
  intent_id: MOCK_INTENT.id,
  inputs: { messages: CONTEXT_MESSAGES },
  external_versions: {
    policy_version: '§4.2-2026-Q4',
    model: 'gpt-4o-2024-05-13',
    stripe_api: 'v1.2024.03',
    crm_sdk: '3.1.0',
  },
  snapshot_hash: 'd5c04b3559837a8e4d0ba104e00690730c9fb1a2e3d4f5c6a7b8e9f0a1b2c3d4',
  created_at: '2026-03-13T08:20:08.000Z',
}

const MOCK_DECISION: Decision = {
  id: '21d80516-8037-456c-a286-d038881fcf3a',
  intent_id: MOCK_INTENT.id,
  context_id: MOCK_CONTEXT.id,
  options: [
    { action: 'approve_full_refund',  score: 0.87, reason: 'VIP Gold customer, 128-month tenure, clean history. Order $329 within $500 threshold. Policy §4.2 applies.' },
    { action: 'escalate_to_human',    score: 0.34, reason: 'Defect claim unverified — no physical inspection completed.' },
    { action: 'deny_refund',          score: 0.02, reason: 'No valid defect documentation on file at time of request.' },
  ],
  chosen_action: 'approve_full_refund',
  confidence: 0.87,
  model_version: 'gpt-4o-2024-05-13',
  rules_evaluated: ['§4.2_manufacturing_defect', 'vip_threshold_check', 'spending_cap_bypass', 'tenure_verification_waiver'],
  reasoning: 'Customer is VIP Gold with 128 months of tenure and a clean dispute history. Order value ($329) is within the VIP auto-approve threshold ($500). Per policy §4.2 and the 2025-Q4 update, defect verification is waived for customers with tenure > 24 months. Proceeding with full refund approval.',
  created_at: '2026-03-13T08:20:08.000Z',
}

const MOCK_EXECUTION: Execution = {
  id: 'exec-4053113b-3b5d-4ab7-0ae2-1305f8af7d64',
  decision_id: MOCK_DECISION.id,
  action: 'approve_partial_refund',
  target: { customer_id: 'cust-vip-00421', order_id: 'ORD-2026-03-4821', amount_usd: 329.00, currency: 'USD' },
  result: 'success',
  side_effects: ['human_override_recorded', 'stripe_refund_initiated', 'crm_note_added'],
  revert_action: { action: 'cancel_refund', order_id: 'ORD-2026-03-4821' },
  actor: 'human',
  override_reason: 'VIP policy §4.2 correctly applies — approve partial refund. Defect verification not required for customers with tenure > 24 months per 2025-Q4 update.',
  overridden_by: 'Anna K. (Compliance Lead)',
  outcome_score: null,
  outcome_notes: null,
  outcome_reported_at: null,
  created_at: '2026-03-13T08:28:20.000Z',
  session_id: MOCK_INTENT.session_id,
}

const MOCK_REPLAY: ReplayResponse = {
  original_decision: { ...MOCK_DECISION, replay_prompt: null, replay_config: null },
  replayed_decision: {
    chosen_action: 'escalate_to_human',
    confidence: 0.34,
    reasoning: 'Manufacturing defect claim is unverified. Despite VIP Gold status and 128-month tenure, updated risk calibration requires human review before approving refunds on unverified defect claims. Escalating to compliance team.',
    raw_response: null,
  },
  diverged: true,
  divergence_reason: 'Model update (gpt-4o May → Nov 2024) altered risk calibration. The updated model applies a stricter threshold on unverified defect claims — it now requires human review regardless of customer tier.',
  replay_executed: true,
  replay_error: null,
  diffs: [
    { field: 'chosen_action', original: 'approve_full_refund', replayed: 'escalate_to_human', changed: true },
    { field: 'confidence',    original: '0.87',                replayed: '0.34',              changed: true },
    { field: 'reasoning',
      original: 'VIP Gold with 128-month tenure. Policy §4.2 applies. Defect verification waived for tenure > 24 months.',
      replayed: 'Defect claim unverified. Updated risk calibration requires human review regardless of tier.',
      changed: true },
  ],
}

// ─── Session timeline step detail data ───────────────────────────────────────

const SESSION_STEP_DETAIL: Record<string, object> = {
  intent: {
    id: MOCK_INTENT.id,
    goal: MOCK_INTENT.goal,
    origin: MOCK_INTENT.origin,
    agent_id: MOCK_INTENT.agent_id,
    session_id: MOCK_INTENT.session_id,
    created_at: MOCK_INTENT.created_at,
  },
  context: {
    id: MOCK_CONTEXT.id,
    snapshot_hash: MOCK_CONTEXT.snapshot_hash,
    token_count: 3331,
    blocks: 6,
    external_versions: MOCK_CONTEXT.external_versions,
    created_at: MOCK_CONTEXT.created_at,
  },
  decision: {
    id: MOCK_DECISION.id,
    chosen_action: MOCK_DECISION.chosen_action,
    confidence: MOCK_DECISION.confidence,
    model_version: MOCK_DECISION.model_version,
    rules_evaluated: MOCK_DECISION.rules_evaluated,
    reasoning: (MOCK_DECISION.reasoning ?? '').slice(0, 120) + '…',
    created_at: MOCK_DECISION.created_at,
  },
  override: {
    overridden_by: MOCK_EXECUTION.overridden_by,
    original_action: MOCK_DECISION.chosen_action,
    new_action: MOCK_EXECUTION.action,
    reason: MOCK_EXECUTION.override_reason,
    at: MOCK_EXECUTION.created_at,
  },
  execution: {
    id: MOCK_EXECUTION.id,
    action: MOCK_EXECUTION.action,
    result: MOCK_EXECUTION.result,
    actor: MOCK_EXECUTION.actor,
    side_effects: MOCK_EXECUTION.side_effects,
    target: MOCK_EXECUTION.target,
    revert_action: MOCK_EXECUTION.revert_action,
    created_at: MOCK_EXECUTION.created_at,
  },
}

const SESSION_ENTRIES = [
  { type: 'intent',    time: '08:20:08', label: 'Intent created',     detail: 'Process customer refund claim — manufacturing defect',                      dot: 'bg-violet-500',  badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { type: 'context',   time: '08:20:08', label: 'Context snapshot',   detail: `6 blocks · 3,331 tok · SHA: d5c04b35…`,                                     dot: 'bg-blue-500',    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { type: 'decision',  time: '08:20:09', label: 'AI decision',        detail: 'approve_full_refund · 87% confidence · gpt-4o-2024-05-13',                  dot: 'bg-amber-400',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { type: 'override',  time: '08:28:20', label: 'Human override',     detail: 'Anna K. → approve_partial_refund · §4.2 VIP policy',                        dot: 'bg-orange-400',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { type: 'execution', time: '08:28:21', label: 'Execution: success', detail: 'stripe_refund_initiated · human_override_recorded · crm_note_added',        dot: 'bg-neptune-500', badge: 'bg-neptune-500/10 text-neptune-400 border-neptune-500/20' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseUTC(ts: string) {
  return new Date(ts.endsWith('Z') ? ts : ts + 'Z')
}

function ConfidenceBar({ value, color = 'bg-violet-500' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-white/[0.07] rounded-full h-1.5 max-w-[160px]">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums text-slate-300">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

function SectionLabel({ n, label, accent = 'text-slate-700 border-white/[0.07]' }: { n: string; label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded border ${accent} bg-white/[0.03] tracking-widest`}>
        {n}
      </span>
      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  )
}

// ─── Session timeline (clickable) ────────────────────────────────────────────

function SessionTimeline({ selected, onSelect }: {
  selected: string | null
  onSelect: (type: string | null) => void
}) {
  return (
    <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
      <h3 className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        Session Timeline
        <span className="font-mono normal-case font-normal ml-1 text-slate-700">
          {MOCK_INTENT.session_id.slice(0, 16)}…
        </span>
      </h3>
      <div className="relative">
        <div className="absolute left-[6px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.07] via-white/[0.04] to-transparent" />
        <div className="space-y-0.5">
          {SESSION_ENTRIES.map((e, i) => {
            const isSelected = selected === e.type
            return (
              <button
                key={i}
                onClick={() => onSelect(isSelected ? null : e.type)}
                className={`w-full text-left flex items-start gap-3 relative rounded-lg px-2 py-2 transition-colors ${
                  isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className={`h-3 w-3 rounded-full ${e.dot} flex-shrink-0 mt-1 z-10 ring-2 ring-obsidian-900 transition-all ${
                  isSelected ? 'ring-white/20 scale-125' : ''
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${e.badge}`}>
                      {e.label}
                    </span>
                    <span className="text-[10px] text-slate-700 font-mono">{e.time}</span>
                    {isSelected && <Code2 className="h-3 w-3 text-slate-600 ml-auto" />}
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 truncate font-mono">{e.detail}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail panel — expands below when a step is selected */}
      {selected && SESSION_STEP_DETAIL[selected] && (
        <div className="mt-3 border-t border-white/[0.05] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
              <Code2 className="h-3 w-3" />
              {SESSION_ENTRIES.find(e => e.type === selected)?.label} · Raw Data
            </span>
            <button
              onClick={() => onSelect(null)}
              className="text-xs text-slate-700 hover:text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>
          <pre className="bg-obsidian-950 border border-white/[0.06] rounded-lg p-3 text-[11px] font-mono text-neptune-400 overflow-x-auto max-h-56 overflow-y-auto leading-relaxed">
            {JSON.stringify(SESSION_STEP_DETAIL[selected], null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Override modal ───────────────────────────────────────────────────────────

function OverrideModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState('approve_partial_refund')
  const [reason, setReason] = useState('')
  const [by, setBy] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = () => {
    if (!reason.trim()) return
    setSaving(true)
    setTimeout(() => { setSaving(false); onDone() }, 800)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-obsidian-900 border border-white/[0.10] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Human Override</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Override the agent's decision. This will be recorded in the session timeline and stored as a correction precedent.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">New Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-500/40 transition-colors"
            >
              <option value="approve_full_refund">approve_full_refund</option>
              <option value="approve_partial_refund">approve_partial_refund</option>
              <option value="escalate_to_human">escalate_to_human</option>
              <option value="deny_refund">deny_refund</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Reason <span className="text-signal-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you overriding this decision?"
              className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-3 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-amber-500/40 resize-none transition-colors"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Your name <span className="text-slate-700 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={by}
              onChange={(e) => setBy(e.target.value)}
              placeholder="e.g. Sarah Chen, Support Lead"
              className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          <div className="flex items-start gap-2 p-3 bg-violet-500/[0.06] border border-violet-500/20 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Your correction is stored as a precedent. Future decisions in similar contexts will reference this override — no model retraining required.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Revert modal ─────────────────────────────────────────────────────────────

function RevertModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = () => {
    if (!reason.trim()) return
    setSaving(true)
    setTimeout(() => { setSaving(false); onDone() }, 800)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-obsidian-900 border border-white/[0.10] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-signal-500/10 border border-signal-500/20 flex items-center justify-center">
            <RotateCcw className="h-3.5 w-3.5 text-signal-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-100">Revert Execution</h3>
        </div>
        <p className="text-sm text-slate-500 mb-1 leading-relaxed">
          This will execute the revert action: <code className="font-mono text-xs bg-white/[0.05] px-1 rounded text-slate-400">cancel_refund · ORD-2026-03-4821</code>
        </p>
        <p className="text-sm text-slate-500 mb-5">Please provide a reason for the audit trail.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for reverting…"
          className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-3 mb-5 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-signal-500/50 resize-none transition-colors"
          rows={3}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || saving}
            className="px-4 py-2 bg-signal-500 hover:bg-signal-400 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
          >
            {saving ? 'Reverting…' : 'Revert Execution'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MockExecution() {
  const [replayState, setReplayState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [overrideDone, setOverrideDone] = useState(false)
  const [revertDone, setRevertDone] = useState(false)
  const [outcomeScore, setOutcomeScore] = useState(80)
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [outcomeSubmitted, setOutcomeSubmitted] = useState(false)

  const runReplay = () => {
    setReplayState('loading')
    setTimeout(() => setReplayState('done'), 1400)
  }

  const handleExport = async () => {
    const { generateAuditReport } = await import('../utils/generateAuditReport')
    generateAuditReport({
      execution: MOCK_EXECUTION,
      decision: MOCK_DECISION,
      intent: MOCK_INTENT,
      context: MOCK_CONTEXT,
      replayResult: replayState === 'done' ? MOCK_REPLAY : undefined,
    })
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Aurora hero header ──────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 border border-white/[0.06]">
        <div className="absolute inset-0 bg-obsidian-900" />
        <div className="absolute top-0 left-1/4 w-80 h-40 bg-violet-500/[0.13] rounded-full blur-3xl animate-aurora-a pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-neptune-500/[0.08] rounded-full blur-3xl animate-aurora-b pointer-events-none" />
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />

        <div className="relative px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <Link to="/" className="inline-flex items-center text-slate-600 hover:text-slate-300 text-xs transition-colors">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Executions
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/[0.07] border border-violet-500/20 rounded-lg">
              <FlaskConical className="h-3 w-3 text-violet-400" />
              <span className="text-xs text-violet-300 font-semibold">Demo</span>
              <span className="text-xs text-slate-600">·</span>
              <code className="font-mono text-[10px] text-slate-500">RPT-d846c55d-2026-0313</code>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-mono font-bold gradient-text">
                  approve_partial_refund
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neptune-500/10 text-neptune-400 border border-neptune-500/20">
                  <CheckCircle className="h-3.5 w-3.5" />
                  success
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <UserCheck className="h-3 w-3" />
                  Override
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                {format(parseUTC(MOCK_EXECUTION.created_at), "MMM d, yyyy · HH:mm:ss 'UTC'")}
                {' · '}cs-refund-agent v3.3.0
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Report
              </button>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/25 rounded-lg text-sm text-amber-400 hover:bg-amber-500/[0.08] transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Override
              </button>
              {MOCK_EXECUTION.revert_action && (
                <button
                  onClick={() => setShowRevertModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-signal-500/25 rounded-lg text-sm text-signal-400 hover:bg-signal-500/[0.08] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert
                </button>
              )}
              <button
                onClick={runReplay}
                disabled={replayState !== 'idle'}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  replayState === 'idle'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white glow-violet'
                    : 'bg-obsidian-800 border border-white/[0.07] text-slate-500 cursor-default'
                }`}
              >
                {replayState === 'loading' ? (
                  <><RotateCcw className="h-3.5 w-3.5 animate-spin" />Replaying…</>
                ) : replayState === 'done' ? (
                  <><CheckCircle className="h-3.5 w-3.5 text-neptune-500" />Replayed</>
                ) : (
                  <><Play className="h-3.5 w-3.5" />Replay Decision</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Replay zone — ALWAYS near the top ──────────────────────────────── */}
      {replayState === 'idle' && (
        <div
          className="relative rounded-xl border-2 border-dashed border-violet-500/20 bg-violet-500/[0.03] p-5 mb-6 cursor-pointer hover:border-violet-500/35 hover:bg-violet-500/[0.05] transition-all group"
          onClick={runReplay}
        >
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/3 w-48 h-20 bg-violet-500/[0.07] rounded-full blur-2xl group-hover:bg-violet-500/[0.1] transition-colors" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-violet-500/10 border border-violet-500/25 flex items-center justify-center">
              <Play className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-200 mb-0.5">
                Verify this decision is still valid today
              </p>
              <p className="text-xs text-slate-600">
                Re-run the frozen context against <span className="font-mono text-slate-500">gpt-4o-2024-11-20</span> to detect reasoning or action drift.
              </p>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors">
              <Play className="h-3 w-3" />
              Run Replay
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      )}

      {replayState === 'loading' && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="h-4 w-4 text-violet-400 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-200">Replaying decision against current model…</p>
              <p className="text-xs text-slate-600 mt-0.5 font-mono">Submitting frozen context snapshot → gpt-4o-2024-11-20</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {replayState === 'done' && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2.5 font-mono">
            <AlertTriangle className="h-3.5 w-3.5 text-signal-400" />
            Replay complete · Critical drift detected · gpt-4o-2024-11-20
          </div>
          <SemanticDiff
            replayData={MOCK_REPLAY}
            onOverride={() => setShowOverrideModal(true)}
          />
        </div>
      )}

      {/* ── 01 · Intent & Session ───────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="01" label="Intent & Session" accent="text-violet-500 border-violet-500/25" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-slate-100 font-semibold text-base leading-snug max-w-sm">
                {MOCK_INTENT.goal}
              </p>
              <span className="inline-flex items-center ml-3 px-2 py-0.5 rounded text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex-shrink-0">
                {MOCK_INTENT.origin}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Agent</span>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{MOCK_INTENT.agent_id}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Model</span>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{MOCK_CONTEXT.external_versions.model}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Framework</span>
                <p className="font-mono text-xs text-slate-400 mt-0.5">LangGraph / OpenAI</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Environment</span>
                <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neptune-500/10 text-neptune-400 border border-neptune-500/20">production</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Session ID</span>
                <p className="font-mono text-[11px] text-slate-600 mt-0.5 truncate">{MOCK_INTENT.session_id}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <SessionTimeline selected={selectedStep} onSelect={setSelectedStep} />
          </div>
        </div>
      </div>

      {/* ── 02 · Execution Details ──────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="02" label="Execution Details" accent="text-neptune-500 border-neptune-500/25" />
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Status</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neptune-500/10 text-neptune-400 border border-neptune-500/20">
                <CheckCircle className="h-3.5 w-3.5" />
                {MOCK_EXECUTION.result}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Actor</p>
              <div className="flex items-center gap-2">
                {MOCK_EXECUTION.actor === 'human'
                  ? <User className="h-4 w-4 text-violet-400" />
                  : <Bot className="h-4 w-4 text-slate-500" />}
                <span className="text-sm text-slate-200 capitalize">{MOCK_EXECUTION.actor}</span>
                {MOCK_EXECUTION.overridden_by && (
                  <span className="text-xs text-slate-600">· {MOCK_EXECUTION.overridden_by}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Side Effects</p>
              <div className="flex flex-col gap-1">
                {MOCK_EXECUTION.side_effects.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-neptune-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-500">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Target</p>
              <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-400 p-3 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(MOCK_EXECUTION.target, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Revert Action</p>
              <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-500 p-3 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                {JSON.stringify(MOCK_EXECUTION.revert_action, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* ── 03 · Context Snapshot ───────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="03" label="Context Snapshot — immutable record of what the agent saw" accent="text-blue-500 border-blue-500/25" />
        <ContextSnapshot context={MOCK_CONTEXT} />
      </div>

      {/* ── 04 · AI Decision ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="04" label="AI Decision — original model output" accent="text-amber-500 border-amber-500/25" />
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">Chosen Action</p>
              <span className="font-mono font-bold text-xl text-slate-100">{MOCK_DECISION.chosen_action}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Confidence</p>
              <ConfidenceBar value={MOCK_DECISION.confidence} color="bg-amber-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Reasoning</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{MOCK_DECISION.reasoning}</p>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Rules Evaluated</p>
              <div className="flex flex-wrap gap-1.5">
                {MOCK_DECISION.rules_evaluated.map((r, i) => (
                  <span key={i} className="text-[10px] font-mono bg-white/[0.04] border border-white/[0.07] text-slate-600 px-2 py-0.5 rounded">{r}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">All Options Scored</p>
              <div className="space-y-2">
                {MOCK_DECISION.options.map((opt, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${opt.action === MOCK_DECISION.chosen_action ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-200">{opt.action}</span>
                      <span className={`text-xs font-mono tabular-nums font-bold ${opt.action === MOCK_DECISION.chosen_action ? 'text-amber-400' : 'text-slate-600'}`}>
                        {(opt.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-0.5 bg-white/[0.05] rounded-full mb-1.5">
                      <div className={`h-0.5 rounded-full ${opt.action === MOCK_DECISION.chosen_action ? 'bg-amber-400' : 'bg-slate-700'}`} style={{ width: `${opt.score * 100}%` }} />
                    </div>
                    {opt.reason && <p className="text-[11px] text-slate-600">{opt.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 05 · Human Override record ──────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="05" label="Human Override — Art. 14(5) compliance record" accent="text-orange-500 border-orange-500/25" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">Overridden By</p>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">{MOCK_EXECUTION.overridden_by}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">At</p>
                <span className="text-xs text-slate-500 font-mono">
                  {format(parseUTC(MOCK_EXECUTION.created_at), "HH:mm:ss 'UTC'")}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Decision Change</p>
              <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-slate-700 uppercase tracking-widest mb-1">AI Said</p>
                  <span className="font-mono text-xs text-slate-500 line-through">{MOCK_DECISION.chosen_action}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-slate-700 uppercase tracking-widest mb-1">Human Changed To</p>
                  <span className="font-mono text-xs font-bold text-amber-400">{MOCK_EXECUTION.action}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">Override Reason</p>
              <p className="text-sm text-slate-400 leading-relaxed p-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                {MOCK_EXECUTION.override_reason}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-neptune-500" />
                EU AI Act Compliance
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { article: 'Art. 9', label: 'Risk Management' },
                  { article: 'Art. 10', label: 'Data Governance' },
                  { article: 'Art. 13', label: 'Transparency' },
                  { article: 'Art. 14(5)', label: 'Human Oversight' },
                ].map((item) => (
                  <div key={item.article} className="flex items-center gap-2 p-2 bg-neptune-500/[0.04] border border-neptune-500/10 rounded-lg">
                    <CheckCircle className="h-3 w-3 text-neptune-500 flex-shrink-0" />
                    <span className="text-[11px] text-slate-500">
                      <span className="font-mono text-slate-400">{item.article}</span>{' '}{item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-obsidian-900 rounded-xl border border-violet-500/15 p-4">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">Stored as a precedent</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This correction is recorded in the audit chain. Future VIP refund decisions will reference this override — no model retraining required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 06 · Outcome Quality ────────────────────────────────────────────── */}
      <div className="mb-6">
        <SectionLabel n="06" label="Outcome Quality" accent="text-slate-600 border-white/[0.08]" />
        <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] p-5">
          {outcomeSubmitted ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-neptune-500" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Outcome recorded</p>
                <p className="text-xs text-slate-600 mt-0.5">Score: {outcomeScore}% · {outcomeNotes || 'No additional notes'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">No outcome reported yet. Rate the quality of this execution decision.</p>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
                  Quality Score: <span className="text-slate-300 font-mono ml-1">
                    {outcomeScore >= 70 ? '🟢' : outcomeScore >= 40 ? '🟡' : '🔴'} {outcomeScore}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0} max={100}
                  value={outcomeScore}
                  onChange={(e) => setOutcomeScore(Number(e.target.value))}
                  className="w-full max-w-xs"
                />
                <div className="flex justify-between text-[10px] text-slate-700 max-w-xs mt-0.5">
                  <span>Worst outcome</span>
                  <span>Best outcome</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
                  Notes <span className="text-slate-700 normal-case">(optional)</span>
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Describe the actual outcome of this execution…"
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-3 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/40 max-w-lg resize-none transition-colors"
                  rows={3}
                />
              </div>
              <button
                onClick={() => setOutcomeSubmitted(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save Outcome
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showOverrideModal && (
        <OverrideModal
          onClose={() => setShowOverrideModal(false)}
          onDone={() => { setShowOverrideModal(false); setOverrideDone(true) }}
        />
      )}
      {showRevertModal && (
        <RevertModal
          onClose={() => setShowRevertModal(false)}
          onDone={() => { setShowRevertModal(false); setRevertDone(true) }}
        />
      )}

      {/* ── Success toasts ───────────────────────────────────────────────────── */}
      {overrideDone && (
        <div className="fixed bottom-6 right-6 bg-obsidian-900 border border-neptune-500/25 rounded-xl shadow-2xl p-4 flex items-start gap-3 z-50 max-w-xs">
          <CheckCircle className="h-4 w-4 text-neptune-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Override recorded</p>
            <p className="text-xs text-slate-500 mt-0.5">Stored as a correction precedent in the session timeline.</p>
          </div>
          <button onClick={() => setOverrideDone(false)} className="text-slate-600 hover:text-slate-400 transition-colors text-sm">✕</button>
        </div>
      )}
      {revertDone && (
        <div className="fixed bottom-6 right-6 bg-obsidian-900 border border-signal-500/25 rounded-xl shadow-2xl p-4 flex items-start gap-3 z-50 max-w-xs">
          <RotateCcw className="h-4 w-4 text-signal-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Revert scheduled</p>
            <p className="text-xs text-slate-500 mt-0.5">cancel_refund · ORD-2026-03-4821 will be issued.</p>
          </div>
          <button onClick={() => setRevertDone(false)} className="text-slate-600 hover:text-slate-400 transition-colors text-sm">✕</button>
        </div>
      )}
    </div>
  )
}
