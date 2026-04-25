import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, User, Bot, AlertTriangle, Shield } from 'lucide-react'
import { fetchExecution, fetchDecision, fetchIntent } from '../api'

const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

export default function OverrideProof() {
  const { id } = useParams<{ id: string }>()

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

  const { data: intent } = useQuery({
    queryKey: ['intent', decision?.intent_id],
    queryFn: () => fetchIntent(decision!.intent_id),
    enabled: !!decision?.intent_id,
  })

  if (executionLoading || decisionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse" />
      </div>
    )
  }

  if (!execution || execution.actor !== 'human') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          {!execution ? 'Execution not found.' : 'This execution is not a human override.'}
        </p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-900 text-sm mt-2 inline-block">
          Back to Executions
        </Link>
      </div>
    )
  }

  const actionChanged = decision && execution.action !== decision.chosen_action

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to={`/executions/${id}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Execution Detail
        </Link>
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Override Proof</h1>
            <p className="text-gray-500 mt-1">Audit record for human override</p>
          </div>
        </div>
      </div>

      {/* Who / When / Why Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <dt className="text-xs font-medium text-blue-600 uppercase tracking-wider">Who</dt>
            <dd className="mt-1 text-gray-900 font-medium flex items-center">
              <User className="h-4 w-4 text-blue-500 mr-2" />
              {execution.overridden_by || 'Unknown user'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-blue-600 uppercase tracking-wider">When</dt>
            <dd className="mt-1 text-gray-900">
              {format(parseUTCDate(execution.created_at), 'MMM d, yyyy at HH:mm:ss')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-blue-600 uppercase tracking-wider">Why</dt>
            <dd className="mt-1 text-gray-900">
              {execution.override_reason || <span className="text-gray-400 italic">No reason provided</span>}
            </dd>
          </div>
        </div>
      </div>

      {/* Action Changed Alert */}
      {actionChanged && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Action Changed</h3>
            <p className="text-sm text-yellow-700 mt-1">
              The human chose a different action (<span className="font-mono font-medium">{execution.action}</span>) than the AI recommended (<span className="font-mono font-medium">{decision?.chosen_action}</span>).
            </p>
          </div>
        </div>
      )}

      {/* Side-by-side: AI vs Human Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* AI Decision Card */}
        {decision && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Bot className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900">AI Decision</h2>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Recommended Action</dt>
                <dd className="mt-1 text-gray-900 font-medium font-mono">{decision.chosen_action}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Confidence</dt>
                <dd className="mt-1">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${decision.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{(decision.confidence * 100).toFixed(0)}%</span>
                  </div>
                </dd>
              </div>
              {decision.reasoning && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reasoning</dt>
                  <dd className="mt-1 text-gray-900 text-sm">{decision.reasoning}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Options Considered</dt>
                <dd className="mt-2 space-y-2">
                  {decision.options.map((option, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded border text-sm ${
                        option.action === decision.chosen_action
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{option.action}</span>
                        <span className="text-gray-500">Score: {option.score.toFixed(2)}</span>
                      </div>
                      {option.reason && <p className="text-gray-600 mt-1">{option.reason}</p>}
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Human Decision Card */}
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Human Decision</h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Action Taken</dt>
              <dd className="mt-1 text-gray-900 font-medium font-mono">{execution.action}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Result</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  execution.result === 'success' ? 'bg-green-100 text-green-800' :
                  execution.result === 'failure' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {execution.result}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Override Reason</dt>
              <dd className="mt-1 text-gray-900 text-sm">
                {execution.override_reason || <span className="text-gray-400 italic">No reason provided</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Target</dt>
              <dd className="mt-1">
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto max-h-48">
                  {JSON.stringify(execution.target, null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Context Section */}
      {intent && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Context</h2>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Intent Goal</dt>
              <dd className="mt-1 text-gray-900">{intent.goal}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Agent</dt>
              <dd className="mt-1 text-gray-900 font-mono text-sm">{intent.agent_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Session</dt>
              <dd className="mt-1">
                <Link
                  to={`/sessions/${intent.session_id}`}
                  className="text-indigo-600 hover:text-indigo-900 font-mono text-sm"
                >
                  {intent.session_id.slice(0, 12)}...
                </Link>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
