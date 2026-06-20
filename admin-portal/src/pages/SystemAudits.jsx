import { useEffect, useState, useCallback } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import {
  ShieldOff, ShieldCheck, Crown, CheckCircle, XCircle,
  Banknote, Loader, RefreshCw, ClipboardList, Search, X, Filter
} from 'lucide-react'

const client = supabaseAdmin || supabase

const ACTION_META = {
  'user.disabled':         { label: 'Account Disabled',      icon: ShieldOff,   color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',           dot: 'bg-red-400'     },
  'user.enabled':          { label: 'Account Enabled',       icon: ShieldCheck,  color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' },
  'user.made_admin':       { label: 'Admin Access Granted',  icon: Crown,        color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400', dot: 'bg-violet-400'  },
  'verification.approved': { label: 'Verification Approved', icon: CheckCircle,  color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',   dot: 'bg-green-400'   },
  'verification.rejected': { label: 'Verification Rejected', icon: XCircle,      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',           dot: 'bg-red-400'     },
  'payout.processing':     { label: 'Payout → Processing',   icon: Loader,       color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',       dot: 'bg-blue-400'    },
  'payout.paid':           { label: 'Payout Marked Paid',    icon: Banknote,     color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400' },
}

const FILTER_OPTIONS = [
  { value: 'all',          label: 'All Actions' },
  { value: 'user',         label: 'User Actions' },
  { value: 'verification', label: 'Verifications' },
  { value: 'payout',       label: 'Payouts' },
]

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtFull(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     uuid,
  admin_email  text,
  action       text        NOT NULL,
  target_type  text,
  target_id    text,
  target_label text,
  details      jsonb       DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);`

export default function SystemAudits() {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setNeedsSetup(true)
        } else {
          console.error('[SystemAudits]', error)
        }
        return
      }
      setNeedsSetup(false)
      setLogs(data || [])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const copySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = logs.filter(log => {
    if (filter !== 'all' && !log.action?.startsWith(filter)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (log.target_label || '').toLowerCase().includes(q) ||
        (log.admin_email  || '').toLowerCase().includes(q) ||
        (log.action       || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const grouped = []
  let currentDate = null
  filtered.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
    if (date !== currentDate) {
      currentDate = date
      grouped.push({ type: 'date', label: date })
    }
    grouped.push({ type: 'log', log })
  })

  if (needsSetup) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Audits</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Admin activity log</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ClipboardList size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">One-time database setup required</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Run this SQL in your Supabase SQL editor, then refresh.</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 relative mb-4">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">{SETUP_SQL}</pre>
            <button onClick={copySQL} className="absolute top-3 right-3 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-lg transition">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={load} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
            Refresh after running SQL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Audits</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Admin activity log'}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, admin, or action…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400 dark:text-gray-500" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
          <Filter size={13} className="text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0" />
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === opt.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
          <ClipboardList size={42} className="mb-3 opacity-20" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No audit logs yet</p>
          <p className="text-sm mt-1">Admin actions will appear here as they happen.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {grouped.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${i}`} className="flex items-center gap-3 py-4 sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">{item.label}</span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
              )
            }

            const { log } = item
            const meta = ACTION_META[log.action] || {
              label: log.action, icon: ClipboardList,
              color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
              dot: 'bg-gray-300',
            }
            const Icon = meta.icon
            const isLast = i === grouped.length - 1 || grouped[i + 1]?.type === 'date'

            return (
              <div key={log.id} className="flex gap-4 group">
                <div className="flex flex-col items-center flex-shrink-0 w-10">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <Icon size={16} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1 mb-0 min-h-[20px]" />}
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-3 shadow-sm hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</p>
                      {log.target_label && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          for <span className="font-medium text-gray-700 dark:text-gray-200">{log.target_label}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{timeAgo(log.created_at)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtFull(log.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                        {(log.admin_email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{log.admin_email || 'Unknown admin'}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-600">
                            <span className="text-gray-300 dark:text-gray-600">{k}:</span>
                            <span className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 pb-4">
          Showing {filtered.length} of {logs.length} audit entries (most recent 200)
        </p>
      )}
    </div>
  )
}
