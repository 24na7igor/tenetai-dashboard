import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, Target, Database, Brain, Zap } from 'lucide-react'
import { fetchSessionTimeline, TimelineEntry } from '../api'

// Parse UTC timestamp from backend and convert to local time
const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

const EntryIcon = ({ type }: { type: TimelineEntry['type'] }) => {
  const config = {
    intent: { icon: Target, color: 'text-purple-500', bg: 'bg-purple-100' },
    context: { icon: Database, color: 'text-blue-500', bg: 'bg-blue-100' },
    decision: { icon: Brain, color: 'text-orange-500', bg: 'bg-orange-100' },
    execution: { icon: Zap, color: 'text-green-500', bg: 'bg-green-100' },
  }[type]

  const Icon = config.icon
  return (
    <div className={`p-2 rounded-full ${config.bg}`}>
      <Icon className={`h-5 w-5 ${config.color}`} />
    </div>
  )
}

export default function SessionTimeline() {
  const { id } = useParams<{ id: string }>()

  const { data: timeline, isLoading, error } = useQuery({
    queryKey: ['session-timeline', id],
    queryFn: () => fetchSessionTimeline(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse" />
      </div>
    )
  }

  if (error || !timeline) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load session timeline.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Executions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Session Timeline</h1>
        <p className="text-gray-500 mt-1">Session ID: {timeline.session_id}</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-6">
          {timeline.entries.map((entry, index) => (
            <div key={entry.id} className="relative flex items-start space-x-4">
              {/* Icon */}
              <div className="relative z-10">
                <EntryIcon type={entry.type} />
              </div>

              {/* Content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium uppercase ${
                    {
                      intent: 'bg-purple-100 text-purple-800',
                      context: 'bg-blue-100 text-blue-800',
                      decision: 'bg-orange-100 text-orange-800',
                      execution: 'bg-green-100 text-green-800',
                    }[entry.type]
                  }`}>
                    {entry.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(parseUTCDate(entry.timestamp), 'HH:mm:ss.SSS')}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">{entry.summary}</p>

                {/* Entry-specific details */}
                <div className="mt-3">
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800">
                      View details
                    </summary>
                    <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </details>
                </div>

                {/* Link to execution detail if it's an execution */}
                {entry.type === 'execution' && (
                  <Link
                    to={`/executions/${entry.id}`}
                    className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    View full execution details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
