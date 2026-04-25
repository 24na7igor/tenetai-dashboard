import { format } from 'date-fns'
import { Target, Database, Brain, Zap } from 'lucide-react'

// Parse UTC timestamp from backend and convert to local time
const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

interface TimelineEntry {
  type: 'intent' | 'context' | 'decision' | 'execution'
  id: string
  timestamp: string
  summary: string
  data: Record<string, unknown>
}

interface Props {
  entries: TimelineEntry[]
  onEntryClick?: (entry: TimelineEntry) => void
}

const typeConfig = {
  intent: {
    icon: Target,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    label: 'Intent',
  },
  context: {
    icon: Database,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    label: 'Context',
  },
  decision: {
    icon: Brain,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    label: 'Decision',
  },
  execution: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-100',
    border: 'border-green-300',
    label: 'Execution',
  },
}

export default function ExecutionTimeline({ entries, onEntryClick }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timeline entries to display.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const config = typeConfig[entry.type]
          const Icon = config.icon

          return (
            <div
              key={entry.id}
              className={`relative flex items-start space-x-4 ${
                onEntryClick ? 'cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2' : ''
              }`}
              onClick={() => onEntryClick?.(entry)}
            >
              {/* Icon bubble */}
              <div className={`relative z-10 p-2 rounded-full ${config.bg}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>

              {/* Content card */}
              <div className={`flex-1 bg-white rounded-lg border ${config.border} p-3 shadow-sm`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold uppercase ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(parseUTCDate(entry.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{entry.summary}</p>

                {/* Quick data preview */}
                {entry.type === 'decision' && entry.data.confidence !== undefined && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Confidence:</span>
                    <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${(entry.data.confidence as number) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {((entry.data.confidence as number) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {entry.type === 'execution' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      entry.data.result === 'success'
                        ? 'bg-green-100 text-green-800'
                        : entry.data.result === 'failure'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.data.result as string}
                    </span>
                    {entry.data.actor === 'human' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Human Override
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
