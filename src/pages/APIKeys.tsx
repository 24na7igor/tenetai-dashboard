import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { format } from 'date-fns'
import { API_BASE } from '../config'

const parseUTCDate = (timestamp: string): Date => {
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z'
  return new Date(utcTimestamp)
}

interface APIKey {
  id: string
  name: string
  key_prefix: string
  key?: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

export default function APIKeys() {
  const { token } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchKeys = async () => {
    if (!currentWorkspace || !token) return
    try {
      const response = await axios.get(
        `${API_BASE}/api-keys?workspace_id=${currentWorkspace.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setKeys(response.data)
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [currentWorkspace, token])

  const createKey = async () => {
    if (!currentWorkspace || !token || !newKeyName.trim()) return
    try {
      const response = await axios.post(
        `${API_BASE}/api-keys`,
        { name: newKeyName, workspace_id: currentWorkspace.id, scopes: ['read', 'write'] },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewlyCreatedKey(response.data.key)
      setNewKeyName('')
      fetchKeys()
    } catch (error) {
      console.error('Failed to create API key:', error)
    }
  }

  const deleteKey = async (keyId: string) => {
    if (!token || !confirm('Delete this API key? This cannot be undone.')) return
    try {
      await axios.delete(`${API_BASE}/api-keys/${keyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchKeys()
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <img src="/favicon.svg" alt="Loading" className="h-8 w-8 animate-pulse opacity-50" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">API Keys</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage keys for SDK authentication</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Key
        </button>
      </div>

      {/* New key warning */}
      {newlyCreatedKey && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Key className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-300">Copy your key — it won't be shown again</h3>
              <p className="text-xs text-amber-500 mt-0.5">Store it securely. If lost, you'll need to create a new key.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-obsidian-950 border border-white/[0.08] px-3 py-2 rounded-lg text-sm font-mono text-neptune-400 break-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey, 'new-key')}
                  className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-slate-400"
                >
                  {copiedId === 'new-key'
                    ? <Check className="h-4 w-4 text-neptune-500" />
                    : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-3 text-xs text-amber-500 hover:text-amber-400 underline transition-colors"
              >
                I've saved this key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Name</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Key</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Created</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Last Used</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Key className="h-8 w-8 mx-auto text-slate-700 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No API keys yet</p>
                    <p className="text-xs text-slate-600 mt-1">Create a key to start using the SDK</p>
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Key className="h-3.5 w-3.5 text-violet-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-200">{key.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <code className="text-xs font-mono text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded">
                        {key.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-500">
                        {format(parseUTCDate(key.created_at), 'MMM d, yyyy')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-500">
                        {key.last_used_at
                          ? format(parseUTCDate(key.last_used_at), 'MMM d, yyyy')
                          : <span className="text-slate-700">Never</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        key.is_active
                          ? 'bg-neptune-500/10 text-neptune-400 border-neptune-500/20'
                          : 'bg-signal-500/10 text-signal-400 border-signal-500/20'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${key.is_active ? 'bg-neptune-500' : 'bg-signal-500'}`} />
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => deleteKey(key.id)}
                        className="p-1.5 text-slate-700 hover:text-signal-400 hover:bg-signal-500/10 rounded-lg transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SDK integration example */}
      <div className="bg-obsidian-900 rounded-xl border border-white/[0.07] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-slate-400">SDK Integration</h3>
          <p className="text-xs text-slate-600 mt-0.5">Audited AI agent — complete example</p>
        </div>
        <div className="p-5 space-y-5">

          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">1 · Install</p>
            <pre className="bg-obsidian-950 border border-white/[0.06] text-neptune-400 p-3 rounded-lg text-sm font-mono overflow-x-auto">{`pip install tenet-ai`}</pre>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">2 · Quick start</p>
            <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">{`import tenet

tenet.init(api_key="tnt_xxxx...")

with tenet.trace(agent_id="finance-bot-v1") as decision:
    response = agent.run(prompt)`}</pre>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">3 · Full audit trail</p>
            <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">{`from tenet import TenetClient, ActionOption, ResultType
from openai import OpenAI
import json

tenet = TenetClient(api_key="tnt_xxxx...")
openai = OpenAI()

def handle_refund_request(customer_id: str, order_id: str, reason: str):
    with tenet.intent(
        goal="Evaluate and process refund request",
        agent_id="refund-agent-v1",
    ) as intent:

        context = {
            "customer_id": customer_id, "order_id": order_id,
            "reason": reason, "order_amount": 149.99,
            "days_since_purchase": 12, "customer_tier": "gold",
            "refund_policy": "30-day full refund for gold members"
        }
        intent.snapshot_context(context)

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": "Evaluate refund. Return JSON with options."},
                      {"role": "user", "content": json.dumps(context)}],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        intent.decide(
            options=[ActionOption(action=o["action"], score=o["score"],
                                  reason=o["reason"]) for o in result["options"]],
            chosen_action=result["chosen"],
            confidence=result["confidence"],
            model_version="gpt-4o",
            reasoning=result["reasoning"],
            rules_evaluated=["30_day_policy", "customer_tier_check"]
        )

        return intent.execute(
            action=result["chosen"],
            target={"order_id": order_id, "amount": 149.99},
            result=ResultType.SUCCESS,
            side_effects=["email_sent", "crm_updated"],
            revert_action={"action": "cancel_refund", "order_id": order_id}
        )`}</pre>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Node.js</p>
            <pre className="bg-obsidian-950 border border-white/[0.06] text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto">{`npm install @tenet-ai/sdk

import { Tenet } from '@tenet-ai/sdk';
const tenet = new Tenet({ apiKey: 'tnt_xxxx...' });

const result = await tenet.trace({
  agentId: 'finance-bot-v1',
  fn: () => agent.run(prompt),
});`}</pre>
          </div>

          <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-lg p-4">
            <h4 className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-2.5">What gets captured</h4>
            <ul className="text-sm text-slate-400 space-y-1.5">
              <li><span className="text-violet-400 font-semibold">Intent</span> — why the agent was invoked</li>
              <li><span className="text-violet-400 font-semibold">Context</span> — exact inputs with SHA-256 hash</li>
              <li><span className="text-violet-400 font-semibold">Decision</span> — all options, chosen action, confidence, LLM reasoning</li>
              <li><span className="text-violet-400 font-semibold">Execution</span> — what happened, side effects, revert path</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-obsidian-900 border border-white/[0.10] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-slate-100 mb-4">New API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production, CI/CD, Development"
                  className="w-full bg-obsidian-950 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && newKeyName.trim() && (createKey(), setShowCreateModal(false))}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={() => { setShowCreateModal(false); setNewKeyName('') }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { createKey(); setShowCreateModal(false) }}
                  disabled={!newKeyName.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                >
                  Create Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
