import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ArrowLeft, RotateCcw, Play, CheckCircle, XCircle, Clock,
  User, Bot, History, ChevronRight, Server, Wrench, GitBranch,
  Shield, FileDown, Sparkles, UserCheck,
} from 'lucide-react'
import {
  fetchExecution, fetchDecision, fetchIntent, fetchContext,
  fetchIntentHierarchy, replayExecution, revertExecution,
  updateExecution, overrideExecution, reportOutcome, ReplayResponse,
} from '../api'
import SemanticDiff from '../components/SemanticDiff'
import ContextSnapshot from '../components/ContextSnapshot'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

const CARD = 'bg-obsidian-900 rounded-xl border border-white/[0.07] p-5'
const LABEL = 'text-[10px] font-semibold text-slate-600 uppercase tracking-widest'
const VAL = 'text-sm text-slate-200'

export default function ExecutionDetail() {
  const { id } = useParams<{ id: string }>()
  const [revertReason, setRevertReason] = useState('')
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideSaveStatus, setOverrideSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [overrideAction, setOverrideAction] = useState('approve_full_refund')
  const [overrideModalReason, setOverrideModalReason] = useState('')
  const [overrideBy, setOverrideBy] = useState('')
  const [newOverrideId, setNewOverrideId] = useState<string | null>(null)
  const [outcomeScore, setOutcomeScore] = useState<number>(50)
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const queryClient = useQueryClient()

  const { data: execution, isLoading: executionLoading } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => fetchExecution(id!),
    enabled: !!id,
  })

  const { data: decision, isLoading: decisionLoading } = useQuery({
    queryKey: ['decision', execution?.decision_id],
    queryFn: () => fetchDecision(execution!.decision_id),
    enabled: !!execution?.decision_id,
  })

  const { data: intent, isLoading: intentLoading } = useQuery({
    queryKey: ['intent', decision?.intent_id],
    queryFn: () => fetchIntent(decision!.intent_id),
    enabled: !!decision?.intent_id,
  })

  const { data: intentHierarchy } = useQuery({
    queryKey: ['intentHierarchy', decision?.intent_id],
    queryFn: () => fetchIntentHierarchy(decision!.intent_id),
    enabled: !!decision?.intent_id,
  })

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['context', decision?.context_id],
    queryFn: () => fetchContext(decision!.context_id),
    enabled: !!decision?.context_id,
  })

  const replayMutation = useMutation({ mutationFn: () => replayExecution(id!) })

  const revertMutation = useMutation({
    mutationFn: () => revertExecution(id!, revertReason),
    onSuccess: () => { setShowRevertModal(false); setRevertReason('') },
  })

  const createOverrideMutation = useMutation({
    mutationFn: () => overrideExecution(id!, {
      action: overrideAction,
      reason: overrideModalReason,
      overridden_by: overrideBy || undefined,
    }),
    onSuccess: (data) => {
      setShowOverrideModal(false)
      setNewOverrideId(data.id)
      setOverrideModalReason('')
      setOverrideBy('')
    },
  })

  const outcomeMutation = useMutation({
    mutationFn: (data: { score: number; notes?: string }) => reportOutcome(id!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['execution', id] }) },
  })

  const overrideMutation = useMutation({
    mutationFn: (data: { override_reason?: string; overridden_by?: string }) => updateExecution(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution', id] })
      setOverrideSaveStatus('success')
      setTimeout(() => setOverrideSaveStatus('idle'), 3000)
    },
    onError: () => {
      setOverrideSaveStatus('error')
      setTimeout(() => setOverrideSaveStatus('idle'), 3000)
    },
  })

  useEffect(() => {
    if (execution?.override_reason != null) setOverrideReason(execution.override_reason)
  }, [execution?.override_reason])

  if (executionLoading || decisionLoading || intentLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse opacity-50" />
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="bg-signal-500/10 border border-signal-500/20 rounded-xl p-4">
        <p className="text-signal-400 text-sm">Execution not found.</p>
      </div>
    )
  }

  const ResultBadge = ({ result }: { result: string }) => {
    const cfg = {
      success: { icon: CheckCircle, cls: 'bg-neptune-500/10 text-neptune-400 border-neptune-500/20' },
      failure: { icon: XCircle,     cls: 'bg-signal-500/10 text-signal-400 border-signal-500/20' },
      pending: { icon: Clock,       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    }[result] || { icon: Clock, cls: 'bg-white/5 text-slate-400 border-white/10' }
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {result}
      </span>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-slate-600 hover:text-slate-300 text-sm mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Executions
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-xl font-semibold text-slate-100 font-mono">{execution.action}</h1>
              <ResultBadge result={execution.result} />
              {execution.actor === 'human' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <UserCheck className="h-3 w-3" /> Override
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-mono">
              {format(parseUTCDate(execution.created_at), 'MMM d, yyyy HH:mm:ss')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {execution.session_id && (
              <Link
                to={`/sessions/${execution.session_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                Session
              </Link>
            )}
            <button
              onClick={() => replayMutation.mutate()}
              disabled={replayMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              {replayMutation.isPending ? 'Replaying…' : 'Replay'}
            </button>
            {execution.actor === 'agent' && (
              <button
                onClick={() => setShowOverrideModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/25 rounded-lg text-sm text-amber-400 hover:bg-amber-500/[0.08] transition-colors"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Override
              </button>
            )}
            {decision && intent && context && (
              <button
                onClick={async () => {
                  const { generateAuditReport } = await import('../utils/generateAuditReport')
                  let replayResult = replayMutation.data as ReplayResponse | undefined
                  if (!replayResult && execution.actor !== 'human') {
                    try { replayResult = await replayExecution(id!) } catch { /* ignore */ }
                  }
                  generateAuditReport({ execution, decision, intent, context, replayResult })
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export
              </button>
            )}
            {execution.revert_action && (
              <button
                onClick={() => setShowRevertModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-signal-500/25 rounded-lg text-sm text-signal-400 hover:bg-signal-500/[0.08] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replay result */}
      {replayMutation.data && (
        <div className="mb-6">
          <SemanticDiff
            replayData={replayMutation.data as ReplayResponse}
            onOverride={execution.actor === 'agent' ? () => setShowOverrideModal(true) : undefined}
          />
        </div>
      )}

      {/* Intent hierarchy */}
      {intentHierarchy && intentHierarchy.length > 1 && (
        <div className="mb-5 bg-obsidian-900 border border-violet-500/15 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-3.5 w-3.5 text-violet-400" />
            <span className={LABEL + ' !text-violet-500'}>Intent Hierarchy</span>
          </div>
          <div className="flex items-center flex-wrap gap-1.5">
            {intentHierarchy.map((item, index) => (
              <div key={item.id} className="flex items-center">
                <div className={`px-3 py-1.5 rounded-lg text-xs border ${
                  index === intentHierarchy.length - 1
                    ? 'bg-violet-600 border-violet-500 text-white font-semibold'
                    : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                }`}>
                  <div className="flex items-center gap-1">
                    {item.mcp_server && <Server className="h-3 w-3" />}
                    {item.tool_name && <Wrench className="h-3 w-3" />}
                    <span className="truncate max-w-[150px]" title={item.goal}>
                      {item.goal.length > 25 ? item.goal.slice(0, 25) + '…' : item.goal}
                    </span>
                  </div>
                  {(item.mcp_server || item.tool_name) && (
                    <div className="text-[10px] opacity-60 mt-0.5 font-mono">
                      {item.mcp_server}{item.mcp_server && item.tool_name && ' / '}{item.tool_name}
                    </div>
                  )}
                </div>
                {index < intentHierarchy.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-700 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intent + Execution row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Intent */}
        {intent && (
          <div className={CARD}>
            <h2 className={LABEL + ' mb-4'}>Intent</h2>
            <div className="space-y-3">
              <div>
                <p className={LABEL + ' mb-1'}>Goal</p>
                <p className="text-sm text-slate-200 font-medium">{intent.goal}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={LABEL + ' mb-1'}>Origin</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                    intent.origin === 'human'
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : intent.origin === 'agent'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}>
                    {intent.origin}
                  </span>
                </div>
                <div>
                  <p className={LABEL + ' mb-1'}>Agent</p>
                  <p className="text-xs font-mono text-slate-400">{intent.agent_id}</p>
                </div>
              </div>
              <div>
                <p className={LABEL + ' mb-1'}>Session</p>
                <p className="text-xs font-mono text-slate-500">{intent.session_id}</p>
              </div>
              {intent.mcp_server && (
                <div>
                  <p className={LABEL + ' mb-1'}>MCP Server</p>
                  <div className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-violet-400" />
                    <p className="text-xs font-mono text-slate-400">{intent.mcp_server}</p>
                  </div>
                </div>
              )}
              {intent.tool_name && (
                <div>
                  <p className={LABEL + ' mb-1'}>Tool</p>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-400" />
                    <p className="text-xs font-mono text-slate-400">{intent.tool_name}</p>
                  </div>
                </div>
              )}
              {intent.parent_intent_id && (
                <div>
                  <p className={LABEL + ' mb-1'}>Parent Intent</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border bg-white/[0.04] text-slate-500 border-white/[0.08]">
                    <GitBranch className="h-3 w-3" />
                    {intent.parent_intent_id.slice(0, 8)}…
                  </span>
                </div>
              )}
              {intent.constraints.length > 0 && (
                <div>
                  <p className={LABEL + ' mb-1'}>Constraints</p>
                  <ul className="space-y-0.5">
                    {intent.constraints.map((c, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-slate-700 mt-0.5">·</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Details */}
        <div className={CARD}>
          <h2 className={LABEL + ' mb-4'}>Execution</h2>
          <div className="space-y-3">
            <div>
              <p className={LABEL + ' mb-1'}>Status</p>
              <ResultBadge result={execution.result} />
            </div>
            <div>
              <p className={LABEL + ' mb-1'}>Actor</p>
              <div className="flex items-center gap-2">
                {execution.actor === 'human'
                  ? <User className="h-4 w-4 text-violet-400" />
                  : <Bot className="h-4 w-4 text-slate-500" />}
                <span className={VAL + ' capitalize'}>{execution.actor}</span>
              </div>
            </div>

            {execution.actor === 'human' && (
              <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-violet-400">Human Override</p>
                {execution.overridden_by && (
                  <p className="text-xs text-slate-400">By: <span className="text-slate-200">{execution.overridden_by}</span></p>
                )}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Override Reason</label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Describe why this decision was overridden…"
                    className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                    rows={3}
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => overrideMutation.mutate({ override_reason: overrideReason })}
                      disabled={overrideMutation.isPending}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
                    >
                      {overrideMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    {overrideSaveStatus === 'success' && <span className="text-xs text-neptune-400">Saved</span>}
                    {overrideSaveStatus === 'error' && <span className="text-xs text-signal-400">Failed to save</span>}
                  </div>
                </div>
                <Link
                  to={`/executions/${execution.id}/proof`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  View Override Proof
                </Link>
                <div className="flex items-start gap-2 p-2.5 bg-obsidian-950/60 rounded-lg border border-white/[0.05]">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This override is stored as a correction precedent. Future similar decisions will reference it — no model retraining required.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className={LABEL + ' mb-1'}>Side Effects</p>
              {execution.side_effects.length > 0 ? (
                <ul className="space-y-1">
                  {execution.side_effects.map((effect, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span className="h-1 w-1 rounded-full bg-neptune-500 flex-shrink-0" />
                      {effect}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-slate-600">None</span>
              )}
            </div>

            <div>
              <p className={LABEL + ' mb-1'}>Target</p>
              <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {JSON.stringify(execution.target, null, 2)}
              </pre>
            </div>
            {execution.revert_action && (
              <div>
                <p className={LABEL + ' mb-1'}>Revert Action</p>
                <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-500 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  {JSON.stringify(execution.revert_action, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Snapshot */}
      {context && (
        <div className="mb-5">
          <ContextSnapshot context={context} />
        </div>
      )}

      {/* Decision Details */}
      {decision && (
        <div className={CARD + ' mb-5'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={LABEL}>Decision</h2>
            <span className="text-[10px] font-mono text-slate-600">{decision.model_version}</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={LABEL + ' mb-1'}>Chosen Action</p>
                <p className="text-sm font-mono font-semibold text-slate-200">{decision.chosen_action}</p>
              </div>
              <div>
                <p className={LABEL + ' mb-1'}>Confidence</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/[0.05] rounded-full h-1.5">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full"
                      style={{ width: `${decision.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-300 tabular-nums">
                    {(decision.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {decision.rules_evaluated.length > 0 && (
              <div>
                <p className={LABEL + ' mb-2'}>Rules Evaluated</p>
                <div className="flex flex-wrap gap-1.5">
                  {decision.rules_evaluated.map((rule, i) => (
                    <span key={i} className="text-xs font-mono bg-white/[0.04] border border-white/[0.07] text-slate-500 px-2 py-0.5 rounded">
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {decision.reasoning && (
              <div>
                <p className={LABEL + ' mb-1'}>Reasoning</p>
                <p className="text-sm text-slate-400 leading-relaxed">{decision.reasoning}</p>
              </div>
            )}

            <div>
              <p className={LABEL + ' mb-2'}>Options Considered</p>
              <div className="space-y-2">
                {decision.options.map((option, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      option.action === decision.chosen_action
                        ? 'border-violet-500/25 bg-violet-500/[0.07]'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-mono font-semibold text-slate-200">{option.action}</span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">{option.score.toFixed(2)}</span>
                    </div>
                    {option.reason && (
                      <p className="text-xs text-slate-500">{option.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Quality */}
      <div className={CARD + ' mb-5'}>
        <h2 className={LABEL + ' mb-4'}>Outcome Quality</h2>
        {execution.outcome_score !== null ? (
          <div className="space-y-3">
            <div>
              <p className={LABEL + ' mb-2'}>Score</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 max-w-xs">
                  <div
                    className={`h-1.5 rounded-full ${
                      execution.outcome_score >= 0.7 ? 'bg-neptune-500' :
                      execution.outcome_score >= 0.4 ? 'bg-amber-400' : 'bg-signal-500'
                    }`}
                    style={{ width: `${execution.outcome_score * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-mono font-semibold px-2 py-0.5 rounded border ${
                  execution.outcome_score >= 0.7
                    ? 'bg-neptune-500/10 text-neptune-400 border-neptune-500/20'
                    : execution.outcome_score >= 0.4
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-signal-500/10 text-signal-400 border-signal-500/20'
                }`}>
                  {Math.round(execution.outcome_score * 100)}%
                </span>
              </div>
            </div>
            {execution.outcome_notes && (
              <div>
                <p className={LABEL + ' mb-1'}>Notes</p>
                <p className="text-sm text-slate-400">{execution.outcome_notes}</p>
              </div>
            )}
            {execution.outcome_reported_at && (
              <div>
                <p className={LABEL + ' mb-1'}>Reported</p>
                <p className="text-xs font-mono text-slate-600">
                  {format(new Date(execution.outcome_reported_at.endsWith('Z')
                    ? execution.outcome_reported_at
                    : execution.outcome_reported_at + 'Z'), 'MMM d, yyyy HH:mm:ss')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No outcome reported yet. Rate this execution.</p>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Score: <span className="text-slate-300 font-mono">{outcomeScore}%</span>
              </label>
              <input
                type="range"
                min={0} max={100}
                value={outcomeScore}
                onChange={(e) => setOutcomeScore(Number(e.target.value))}
                className="w-full max-w-xs"
              />
              <div className="flex justify-between text-[10px] text-slate-700 max-w-xs mt-0.5">
                <span>Worst</span><span>Best</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Notes <span className="text-slate-700 normal-case">(optional)</span>
              </label>
              <textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Describe the outcome…"
                className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 max-w-lg resize-none transition-colors"
                rows={3}
              />
            </div>
            <button
              onClick={() => outcomeMutation.mutate({ score: outcomeScore / 100, notes: outcomeNotes || undefined })}
              disabled={outcomeMutation.isPending}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
            >
              {outcomeMutation.isPending ? 'Saving…' : 'Save Outcome'}
            </button>
            {outcomeMutation.isError && (
              <span className="text-sm text-signal-400 ml-3">Failed to save.</span>
            )}
          </div>
        )}
      </div>

      {/* Override success toast */}
      {newOverrideId && (
        <div className="fixed bottom-6 right-6 bg-obsidian-900 border border-neptune-500/25 rounded-xl shadow-2xl p-4 flex items-start gap-3 z-50 max-w-sm">
          <CheckCircle className="h-4 w-4 text-neptune-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Override recorded</p>
            <p className="text-xs text-slate-500 mt-0.5">Human decision captured and added to the session timeline.</p>
            <Link
              to={`/executions/${newOverrideId}`}
              className="text-xs text-violet-400 hover:text-violet-300 mt-1.5 inline-block transition-colors"
              onClick={() => setNewOverrideId(null)}
            >
              View override execution →
            </Link>
          </div>
          <button onClick={() => setNewOverrideId(null)} className="text-slate-600 hover:text-slate-400 transition-colors text-sm">✕</button>
        </div>
      )}

      {/* Override modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-obsidian-900 border border-white/[0.10] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-4 w-4 text-amber-400" />
              <h3 className="text-base font-semibold text-slate-100">Human Override</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Override the agent's decision. This will be recorded in the session timeline and used as a correction precedent.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">New Action</label>
                <select
                  value={overrideAction}
                  onChange={(e) => setOverrideAction(e.target.value)}
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 transition-colors"
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
                  value={overrideModalReason}
                  onChange={(e) => setOverrideModalReason(e.target.value)}
                  placeholder="Why are you overriding this decision?"
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Your name <span className="text-slate-700 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={overrideBy}
                  onChange={(e) => setOverrideBy(e.target.value)}
                  placeholder="e.g. Sarah Chen, Support Lead"
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 transition-colors"
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
                onClick={() => { setShowOverrideModal(false); setOverrideModalReason(''); setOverrideBy('') }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createOverrideMutation.mutate()}
                disabled={!overrideModalReason.trim() || createOverrideMutation.isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
              >
                {createOverrideMutation.isPending ? 'Saving…' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert modal */}
      {showRevertModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-obsidian-900 border border-white/[0.10] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-2">Revert Execution</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              This will create a new execution to undo the action. Please provide a reason.
            </p>
            <textarea
              value={revertReason}
              onChange={(e) => setRevertReason(e.target.value)}
              placeholder="Reason for reverting…"
              className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg p-3 mb-4 text-sm text-slate-300 placeholder-slate-700 focus:outline-none focus:border-signal-500/50 resize-none transition-colors"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevertModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => revertMutation.mutate()}
                disabled={!revertReason || revertMutation.isPending}
                className="px-4 py-2 bg-signal-500 hover:bg-signal-400 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
              >
                {revertMutation.isPending ? 'Reverting…' : 'Revert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
