import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import {
  Search, X, RefreshCw, UserCheck, UserX, ChevronUp, ChevronDown,
  ShieldOff, ShieldCheck, ShieldPlus, Crown
} from 'lucide-react'
import { logAudit } from '../lib/audit'

const ROLE_TABS = ['all', 'seller', 'buyer']

export default function Users() {
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [roleTab, setRoleTab]           = useState('all')
  const [sort, setSort]                 = useState({ key: 'created_at', dir: 'desc' })
  const [toggling, setToggling]         = useState(null)
  const [promoting, setPromoting]       = useState(null)
  const [promotingId, setPromotingId]   = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const client = supabaseAdmin || supabase
      const [profilesRes, authRes] = await Promise.all([
        client.from('profiles').select('id, firstname, lastname, username, email, role, is_verified, is_admin, created_at').order('created_at', { ascending: false }),
        supabaseAdmin ? supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }) : Promise.resolve({ data: null }),
      ])
      if (profilesRes.error) throw profilesRes.error
      const bannedIds = new Set()
      const lastLoginMap = {}
      if (authRes.data?.users) {
        authRes.data.users.forEach(u => {
          if (u.banned_until && new Date(u.banned_until) > new Date()) bannedIds.add(u.id)
          if (u.last_sign_in_at) lastLoginMap[u.id] = u.last_sign_in_at
        })
      }
      setUsers((profilesRes.data || []).map(p => ({
        ...p,
        is_disabled: bannedIds.has(p.id),
        last_login: lastLoginMap[p.id] || null,
      })))
    } catch (e) {
      console.error('[Users] load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setCurrentUserId(session?.user?.id))
    load()
  }, [])

  const toggleDisabled = async (user) => {
    if (user.id === currentUserId) { alert("You can't disable your own account."); return }
    if (!supabaseAdmin) { alert('Service role key not configured.'); return }
    const action = user.is_disabled ? 'enable' : 'disable'
    if (!confirm(`${action === 'disable' ? 'Disable' : 'Re-enable'} ${displayName(user)}'s account?`)) return
    setToggling(user.id)
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        ban_duration: action === 'disable' ? '876000h' : 'none',
      })
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_disabled: !u.is_disabled } : u))
      await logAudit({
        action: action === 'disable' ? 'user.disabled' : 'user.enabled',
        targetType: 'user',
        targetId: user.id,
        targetLabel: displayName(user),
        details: { email: user.email, role: user.role },
      })
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setToggling(null)
    }
  }

  const handleGrantAdmin = async () => {
    if (!promoting || !supabaseAdmin) return
    setPromotingId(promoting.id)
    try {
      const { error } = await supabaseAdmin.from('profiles').update({ is_admin: true }).eq('id', promoting.id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === promoting.id ? { ...u, is_admin: true } : u))
      await logAudit({
        action: 'user.made_admin',
        targetType: 'user',
        targetId: promoting.id,
        targetLabel: displayName(promoting),
        details: { email: promoting.email, role: promoting.role },
      })
      setPromoting(null)
    } catch (e) {
      alert('Failed to grant admin: ' + e.message)
    } finally {
      setPromotingId(null)
    }
  }

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const displayName = (u) =>
    `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.username || u.email || '—'

  const filtered = users
    .filter(u => roleTab === 'all' || u.role === roleTab)
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return displayName(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key]
      if (sort.key === 'name') { av = displayName(a); bv = displayName(b) }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

  const counts = {
    all:    users.length,
    seller: users.filter(u => u.role === 'seller').length,
    buyer:  users.filter(u => u.role === 'buyer').length,
  }

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <ChevronUp size={13} className="text-gray-300 dark:text-gray-600" />
    return sort.dir === 'asc'
      ? <ChevronUp size={13} className="text-blue-600" />
      : <ChevronDown size={13} className="text-blue-600" />
  }

  const SortTh = ({ label, k }) => (
    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  )

  const initials    = (u) => displayName(u).charAt(0).toUpperCase()
  const avatarColor = (u) => {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
    return colors[(u.email || u.id || '').charCodeAt(0) % colors.length]
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">All registered accounts on the platform</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(t => (
          <button key={t} onClick={() => setRoleTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${roleTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${roleTab === t ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
              {counts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <UserX size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <SortTh label="Name" k="name" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Email</th>
                <SortTh label="Role" k="role" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Verified</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <SortTh label="Joined" k="created_at" />
                <SortTh label="Last Login" k="last_login" />
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${u.is_disabled ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${avatarColor(u)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {initials(u)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 dark:text-white">{displayName(u)}</span>
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                            <Crown size={10} /> Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell">{u.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'seller'
                        ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Buyer'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {u.role === 'seller' ? (
                      u.is_verified
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><UserCheck size={13} /> Verified</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500"><UserX size={13} /> Unverified</span>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.is_disabled
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_disabled ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      {u.is_disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {u.last_login ? (
                      <div>
                        <p className="text-gray-700 dark:text-gray-200 font-medium">{new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-gray-400 dark:text-gray-500">{new Date(u.last_login).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {u.id !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {!u.is_admin && (
                          <button onClick={() => setPromoting(u)} title="Grant admin access"
                            className="p-1.5 rounded-lg text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition">
                            <ShieldPlus size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleDisabled(u)}
                          disabled={toggling === u.id}
                          title={u.is_disabled ? 'Enable account' : 'Disable account'}
                          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                            u.is_disabled
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              : 'text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                        >
                          {toggling === u.id
                            ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                            : u.is_disabled ? <ShieldCheck size={15} /> : <ShieldOff size={15} />
                          }
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {promoting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setPromoting(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Grant Admin Access</h3>
              <button onClick={() => setPromoting(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-4 mb-5">
              <div className={`w-10 h-10 rounded-full ${avatarColor(promoting)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {initials(promoting)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{displayName(promoting)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{promoting.email}</p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800 dark:text-amber-300">
              <strong>Warning:</strong> This will give <span className="font-semibold">{displayName(promoting)}</span> full access to this admin portal. This action cannot be undone from this screen.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPromoting(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={handleGrantAdmin} disabled={!!promotingId}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                {promotingId ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Crown size={15} />}
                Yes, Grant Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
