import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import {
  Activity, Users, Wifi, Clock, MessageSquare, ShoppingCart,
  UserX, TrendingUp, RefreshCw, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const client = supabaseAdmin || supabase

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtFull = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function SystemUsage() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const { dark } = useTheme()

  const gridColor   = dark ? '#374151' : '#f1f5f9'
  const tickColor   = dark ? '#6b7280' : '#94a3b8'
  const tooltipStyle = dark
    ? { fontSize: 12, borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1f2937', color: '#f9fafb' }
    : { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }

  const load = async () => {
    setLoading(true)
    try {
      const now      = new Date()
      const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const ago7     = new Date(now - 7  * 864e5)
      const ago30    = new Date(now - 30 * 864e5)
      const ago30Iso = ago30.toISOString()

      const authRes = supabaseAdmin
        ? await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        : { data: null }
      const authUsers = authRes.data?.users || []

      const onlineNow   = authUsers.filter(u => u.last_sign_in_at && (now - new Date(u.last_sign_in_at)) < 30 * 60000)
      const activeToday = authUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= today)
      const activeWeek  = authUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= ago7)
      const activeMonth = authUsers.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= ago30)
      const neverLogged = authUsers.filter(u => !u.last_sign_in_at)

      const { data: profiles } = await client.from('profiles').select('id, role, firstname, lastname, username, email')
      const profileMap = {}
      ;(profiles || []).forEach(p => { profileMap[p.id] = p })

      const { data: recentOrders } = await client.from('orders').select('created_at, status').gte('created_at', ago30Iso)
      const ordersToday = (recentOrders || []).filter(o => new Date(o.created_at) >= today && o.status !== 'cancelled').length

      const { data: recentMsgs } = await client.from('private_messages').select('sender_id, created_at').gte('created_at', ago30Iso)
      const msgsToday = (recentMsgs || []).filter(m => new Date(m.created_at) >= today).length

      const days30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i))
        return { label: fmtDate(d), date: d, logins: 0, orders: 0, messages: 0 }
      })

      authUsers.forEach(u => {
        if (!u.last_sign_in_at) return
        const d = new Date(u.last_sign_in_at)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const slot = days30.find(s => `${s.date.getFullYear()}-${s.date.getMonth()}-${s.date.getDate()}` === key)
        if (slot) slot.logins++
      })
      ;(recentOrders || []).forEach(o => {
        const d = new Date(o.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const slot = days30.find(s => `${s.date.getFullYear()}-${s.date.getMonth()}-${s.date.getDate()}` === key)
        if (slot) slot.orders++
      })
      ;(recentMsgs || []).forEach(m => {
        const d = new Date(m.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const slot = days30.find(s => `${s.date.getFullYear()}-${s.date.getMonth()}-${s.date.getDate()}` === key)
        if (slot) slot.messages++
      })

      const hourBuckets = Array.from({ length: 24 }, (_, h) => ({
        hour: `${h.toString().padStart(2, '0')}:00`,
        logins: 0,
      }))
      authUsers.forEach(u => {
        if (!u.last_sign_in_at) return
        hourBuckets[new Date(u.last_sign_in_at).getHours()].logins++
      })

      const buyerActive  = activeMonth.filter(u => profileMap[u.id]?.role === 'buyer').length
      const sellerActive = activeMonth.filter(u => profileMap[u.id]?.role === 'seller').length

      const ago24 = new Date(now - 864e5)
      const recentlyActive = authUsers
        .filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= ago24)
        .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
        .slice(0, 10)
        .map(u => ({ ...u, profile: profileMap[u.id] || null }))

      const engagementRate = authUsers.length > 0
        ? Math.round((activeMonth.length / authUsers.length) * 100)
        : 0

      setData({
        onlineNow: onlineNow.length, activeToday: activeToday.length,
        activeWeek: activeWeek.length, activeMonth: activeMonth.length,
        neverLogged: neverLogged.length, totalUsers: authUsers.length,
        ordersToday, msgsToday, engagementRate, buyerActive, sellerActive,
        dauChart: days30, hourChart: hourBuckets, recentlyActive,
      })
      setLastUpdated(new Date())
    } catch (e) {
      console.error('[SystemUsage] error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const s = data

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Usage</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Platform activity & engagement'}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition hover:border-blue-300">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Live Activity</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageCard icon={Wifi}          color="emerald" label="Online Now"     value={s.onlineNow}    sub="Last 30 minutes" pulse />
          <UsageCard icon={Activity}      color="blue"    label="Active Today"   value={s.activeToday}  sub="Unique logins" />
          <UsageCard icon={ShoppingCart}  color="orange"  label="Orders Today"   value={s.ordersToday}  sub="Excl. cancelled" />
          <UsageCard icon={MessageSquare} color="violet"  label="Messages Today" value={s.msgsToday}    sub="Sent today" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Engagement</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageCard icon={Calendar}   color="blue"   label="Active This Week"  value={s.activeWeek}       sub="Unique logins" />
          <UsageCard icon={Users}      color="indigo" label="Active This Month" value={s.activeMonth}      sub={`${s.engagementRate}% of all users`} />
          <UsageCard icon={TrendingUp} color="green"  label="Engagement Rate"   value={`${s.engagementRate}%`} sub="Monthly active / total" />
          <UsageCard icon={UserX}      color="red"    label="Never Logged In"   value={s.neverLogged}      sub="Dormant accounts" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Daily Activity (last 30 days)</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Logins, orders, and messages per day</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={s.dauChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMsgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="logins"   name="Logins"   stroke="#2563EB" strokeWidth={2} fill="url(#gLogins)"  dot={false} />
              <Area type="monotone" dataKey="orders"   name="Orders"   stroke="#f59e0b" strokeWidth={2} fill="url(#gOrders)"  dot={false} />
              <Area type="monotone" dataKey="messages" name="Messages" stroke="#7c3aed" strokeWidth={2} fill="url(#gMsgs)"   dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Active Users by Role</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Active in the last 30 days</p>
          <div className="space-y-5">
            {[
              { label: 'Buyers',  value: s.buyerActive,  color: 'bg-blue-500',   total: s.activeMonth },
              { label: 'Sellers', value: s.sellerActive, color: 'bg-orange-400', total: s.activeMonth },
            ].map(r => {
              const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0
              return (
                <div key={r.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{r.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{r.value} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Total active this month</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{s.activeMonth}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Engagement rate</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.engagementRate}%</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Dormant accounts</span>
                <span className="font-semibold text-red-500 dark:text-red-400">{s.neverLogged}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Peak Login Hours</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Distribution of last login times by hour of day (local time)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={s.hourChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="logins" name="Logins" fill="#2563EB" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recently Active Users</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Users who logged in within the last 24 hours</p>
        </div>
        {s.recentlyActive.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Activity size={36} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No logins in the last 24 hours</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['User', 'Email', 'Role', 'Last Seen', 'Login Time'].map((h, i) => (
                  <th key={h} className={`text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${i === 1 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'hidden sm:table-cell' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {s.recentlyActive.map(u => {
                const p = u.profile
                const name = p ? `${p.firstname || ''} ${p.lastname || ''}`.trim() || p.username || p.email : u.email
                const role = p?.role || '—'
                const isOnline = (Date.now() - new Date(u.last_sign_in_at).getTime()) < 30 * 60000
                const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500']
                const avatarBg = colors[(u.email || '').charCodeAt(0) % colors.length]
                return (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-gray-800 rounded-full" />}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        role === 'seller' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {isOnline ? '🟢 Online' : timeAgo(u.last_sign_in_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs hidden sm:table-cell">
                      <div>
                        <p>{fmtDate(u.last_sign_in_at)}</p>
                        <p>{fmtTime(u.last_sign_in_at)}</p>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function UsageCard({ icon: Icon, color, label, value, sub, pulse }) {
  const gradients = {
    emerald: 'from-emerald-400 to-teal-600',
    blue:    'from-blue-500 to-indigo-600',
    orange:  'from-orange-400 to-amber-600',
    violet:  'from-violet-500 to-purple-700',
    indigo:  'from-indigo-500 to-blue-700',
    green:   'from-emerald-400 to-teal-600',
    red:     'from-rose-500 to-red-600',
  }
  const gradient = gradients[color] || gradients.blue
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 flex items-start gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="relative w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        {pulse && <span className="absolute inset-0 rounded-xl ring-2 ring-white/40 animate-ping opacity-50" />}
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white/75 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-white/65 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
