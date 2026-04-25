import axios from 'axios'
import { API_BASE } from './config'

const api = axios.create({
  baseURL: API_BASE,
})

export interface Execution {
  id: string
  decision_id: string
  action: string
  target: Record<string, unknown>
  result: 'success' | 'failure' | 'pending'
  side_effects: string[]
  revert_action: Record<string, unknown> | null
  actor: 'agent' | 'human'
  override_reason: string | null
  overridden_by: string | null
  outcome_score: number | null
  outcome_notes: string | null
  outcome_reported_at: string | null
  created_at: string
  session_id: string | null
}

export interface Intent {
  id: string
  goal: string
  origin: 'human' | 'agent' | 'scheduler'
  constraints: string[]
  agent_id: string
  session_id: string
  parent_intent_id: string | null
  mcp_server: string | null
  tool_name: string | null
  created_at: string
}

export interface Context {
  id: string
  intent_id: string
  inputs: Record<string, unknown>
  external_versions: Record<string, string>
  snapshot_hash: string
  created_at: string
}

export interface Decision {
  id: string
  intent_id: string
  context_id: string
  options: Array<{
    action: string
    target?: Record<string, unknown>
    score: number
    reason?: string
  }>
  chosen_action: string
  confidence: number
  model_version: string
  rules_evaluated: string[]
  reasoning: string | null
  created_at: string
}

export interface TimelineEntry {
  type: 'intent' | 'context' | 'decision' | 'execution'
  id: string
  timestamp: string
  summary: string
  data: Record<string, unknown>
}

export interface SessionTimeline {
  session_id: string
  entries: TimelineEntry[]
}

export const fetchExecutions = async (params?: {
  workspace_id?: string
  session_id?: string
  agent_id?: string
  limit?: number
  offset?: number
}): Promise<Execution[]> => {
  const { data } = await api.get('/executions', { params })
  return data
}

export const fetchExecution = async (id: string): Promise<Execution> => {
  const { data } = await api.get(`/executions/${id}`)
  return data
}

export const fetchDecision = async (id: string): Promise<Decision> => {
  const { data } = await api.get(`/decisions/${id}`)
  return data
}

export const fetchIntent = async (id: string): Promise<Intent> => {
  const { data } = await api.get(`/intents/${id}`)
  return data
}

export const fetchIntentHierarchy = async (id: string): Promise<Intent[]> => {
  const { data } = await api.get(`/intents/${id}/hierarchy`)
  return data
}

export const fetchIntentChildren = async (id: string): Promise<Intent[]> => {
  const { data } = await api.get(`/intents/${id}/children`)
  return data
}

export interface IntentTreeNode {
  intent: Intent
  children: IntentTreeNode[]
}

export const fetchIntentTree = async (id: string): Promise<IntentTreeNode> => {
  const { data } = await api.get(`/intents/${id}/tree`)
  return data
}

export const fetchContext = async (id: string): Promise<Context> => {
  const { data } = await api.get(`/contexts/${id}`)
  return data
}

export const fetchSessionTimeline = async (sessionId: string): Promise<SessionTimeline> => {
  const { data } = await api.get(`/sessions/${sessionId}/timeline`)
  return data
}

export interface FieldDiff {
  field: string
  original: string | null
  replayed: string | null
  changed: boolean
}

export interface ReplayedDecision {
  chosen_action: string
  confidence: number | null
  reasoning: string | null
  raw_response: string | null
}

export interface ReplayResponse {
  original_decision: Decision & { replay_prompt?: string | null; replay_config?: Record<string, unknown> | null }
  replayed_decision: ReplayedDecision | null
  diverged: boolean
  divergence_reason: string | null
  replay_executed: boolean
  replay_error: string | null
  diffs: FieldDiff[]
}

export const replayExecution = async (id: string, contextId?: string): Promise<ReplayResponse> => {
  const { data } = await api.post(`/replay/${id}`, {
    with_context_id: contextId,
  })
  return data
}

export const updateExecution = async (
  id: string,
  data: { override_reason?: string; overridden_by?: string }
): Promise<Execution> => {
  const { data: result } = await api.patch(`/executions/${id}`, data)
  return result
}

export const revertExecution = async (id: string, reason: string, force = false) => {
  const { data } = await api.post(`/revert/${id}`, { reason, force })
  return data
}

export interface AnalyticsSummary {
  period_days: number
  total_executions: number
  total_agent_executions: number
  override_count: number
  override_rate: number
  avg_confidence: number
  overrides_this_week: number
  decision_distribution: Array<{ action: string; count: number; pct: number }>
  top_corrections: Array<{ action: string; count: number }>
  recent_overrides: Array<{
    id: string
    action: string
    override_reason: string | null
    overridden_by: string | null
    created_at: string
  }>
}

export const fetchAnalytics = async (params?: {
  workspace_id?: string
  days?: number
}): Promise<AnalyticsSummary> => {
  const { data } = await api.get('/analytics/summary', { params })
  return data
}

export const exportTrainingData = async (params?: {
  workspace_id?: string
  include_overrides?: boolean
  include_outcome_rated?: boolean
  max_outcome_score?: number
}): Promise<void> => {
  const response = await api.get('/training-data/export', {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/x-ndjson' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'tenet-training-data.jsonl'
  a.click()
  URL.revokeObjectURL(url)
}

export interface CaptureHealth {
  status: 'active' | 'silent' | 'inactive' | 'never' | 'unknown'
  last_capture_at: string | null
  captures_24h: number
  captures_1h: number
  message: string
}

export const fetchCaptureHealth = async (workspace_id?: string): Promise<CaptureHealth> => {
  const { data } = await api.get('/capture-health', { params: { workspace_id } })
  return data
}

export const overrideExecution = async (
  id: string,
  data: { action: string; reason: string; overridden_by?: string }
): Promise<Execution> => {
  const { data: result } = await api.post(`/executions/${id}/override`, data)
  return result
}

export const reportOutcome = async (
  id: string,
  data: { score: number; notes?: string }
): Promise<Execution> => {
  const { data: result } = await api.post(`/executions/${id}/outcome`, data)
  return result
}
