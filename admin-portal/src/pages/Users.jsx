import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import {
  Search, X, RefreshCw, UserCheck, UserX, ChevronUp, ChevronDown,
  ShieldOff, ShieldCheck, ShieldPlus, Crown
} from 'lucide-react'

const ROLE_TABS = ['all', 'seller', 'buyer']

export default function Users() {
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [roleTab, setRoleTab]           = useState('all')
  const [sort, setSort]                 = useState({ key: 'created_at', dir: 'desc' })
  const [toggling, setToggling]         = useState(null)
  const [promoting, setPromoting]       = useState(null)   // user being confirmed for admin grant
  const [promotingId, setPromotingId]   = useState(null)   // user id in-flight
  const [currentUserId, setCurrentUserId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const client = supabaseAdmin || supabase

      const [profilesRes, authRes] = await Promise.all([
        client
          .from('profiles')
          .select('id, firstname, lastname, username, email, role, is_verified, is_admin, created_at')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          ? supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
          : Promise.resolve({ data: null }),
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
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', promoting.id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === promoting.id ? { ...u, is_admin: true } : u))
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
    if (sort.key !== k) return <ChevronUp size={13} className="text-gray-300" />
    return sort.dir === 'asc'
      ? <ChevronUp size={13} className="text-blue-600" />
      : <ChevronDown size={13} className="text-blue-600" />
  }

  const SortTh = ({ label, k }) => (
    <th
      className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  )

  const initials  = (u) => displayName(u).charAt(0).toUpperCase()
  const avatarColor = (u) => {
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
    return colors[(u.email || u.id || '').charCodeAt(0) % colors.length]
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">All registered accounts on the platform</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-3 py-2 rounded-lg transition hover:border-blue-300">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {ROLE_TABS.map(t => (
          <button key={t} onClick={() => setRoleTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${roleTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${roleTab === t ? 'bg-gray-100' : 'bg-gray-200'}`}>
              {counts[t] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserX size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <SortTh label="Name" k="name" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <SortTh label="Role" k="role" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Verified</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <SortTh label="Joined" k="created_at" />
                <SortTh label="Last Login" k="last_login" />
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_disabled ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${avatarColor(u)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {initials(u)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{displayName(u)}</span>
                          {u.is_admin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700">
                              <Crown size={10} /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{u.email || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'seller' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Buyer'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {u.role === 'seller' ? (
                      u.is_verified
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><UserCheck size={13} /> Verified</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs text-gray-400"><UserX size={13} /> Unverified</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.is_disabled ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_disabled ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      {u.is_disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    {u.last_login ? (
                      <div>
                        <p className="text-gray-700 font-medium">
                          {new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-gray-400">
                          {new Date(u.last_login).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-300">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {u.id !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {/* Grant admin — icon only */}
                        {!u.is_admin && (
                          <button
                            onClick={() => setPromoting(u)}
                            title="Grant admin access"
                            className="p-1.5 rounded-lg text-violet-500 hover:text-violet-700 hover:bg-violet-50 transition"
                          >
                            <ShieldPlus size={15} />
                          </button>
                        )}
                        {/* Disable / Enable — icon only */}
                        <button
                          onClick={() => toggleDisabled(u)}
                          disabled={toggling === u.id}
                          title={u.is_disabled ? 'Enable account' : 'Disable account'}
                          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                            u.is_disabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-red-400 hover:text-red-600 hover:bg-red-50'
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
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* Grant Admin confirm modal */}
      {promoting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPromoting(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Grant Admin Access</h3>
              <button onClick={() => setPromoting(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* User card */}
            <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-4 mb-5">
              <div className={`w-10 h-10 rounded-full ${avatarColor(promoting)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {initials(promoting)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{displayName(promoting)}</p>
                <p className="text-sm text-gray-500">{promoting.email}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
              <strong>Warning:</strong> This will give <span className="font-semibold">{displayName(promoting)}</span> full access to this admin portal, including the ability to approve verifications, manage users, and view all platform data. This action cannot be undone from this screen — use the <span className="font-semibold">Admins</span> page to revoke access.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPromoting(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantAdmin}
                disabled={!!promotingId}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {promotingId
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Crown size={15} />
                }
                Yes, Grant Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
