import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { useTheme } from '../lib/ThemeContext'
import StatCard from '../components/StatCard'
import {
  Users, ShieldCheck, Clock, XCircle, Store, ShoppingBag,
  TrendingUp, UserCheck, RefreshCw, DollarSign, Package
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#2563EB', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const { dark } = useTheme()

  const gridColor    = dark ? '#374151' : '#f1f5f9'
  const tickColor    = dark ? '#6b7280' : '#94a3b8'
  const labelColor   = dark ? '#d1d5db' : '#374151'
  const tooltipStyle = dark
    ? { fontSize: 12, borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1f2937', color: '#f9fafb' }
    : { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }

  const load = async () => {
    setLoading(true)
    try {
      const client = supabaseAdmin || supabase

      const [profilesRes, verRes, shopsRes, ordersRes, orderItemsRes] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at, is_verified'),
        supabase.from('seller_verifications').select('id, status, submitted_at, user_id'),
        client.from('shops').select('id, name, owner_id, created_at'),
        client.from('orders').select('id, shop_id, total_amount, status, created_at'),
        client.from('order_items').select('product_id, quantity, price, order_id'),
      ])

      const profiles = profilesRes.data || []
      const verifications = verRes.data || []
      const shops = shopsRes.data || []
      const orders = ordersRes.data || []

      const totalUsers = profiles.length
      const sellers = profiles.filter(p => p.role === 'seller')
      const buyers = profiles.filter(p => p.role === 'buyer' || p.role === 'user')
      const verifiedSellers = profiles.filter(p => p.is_verified)
      const pendingVer = verifications.filter(v => v.status === 'pending')
      const approvedVer = verifications.filter(v => v.status === 'verified')
      const rejectedVer = verifications.filter(v => v.status === 'rejected')

      const totalShops = shops.length
      const shopOwnerMap = {}
      shops.forEach(s => { shopOwnerMap[s.id] = s.owner_id })

      const nonCancelledOrders = orders.filter(o => o.status !== 'cancelled')
      const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const totalOrders = nonCancelledOrders.length

      const nonCancelledIds = new Set(nonCancelledOrders.map(o => o.id))
      const productStats = {}
      ;(orderItemsRes.data || []).forEach(item => {
        if (!item.product_id) return
        if (item.order_id && !nonCancelledIds.has(item.order_id)) return
        const unitPrice = parseFloat(item.price || 0)
        const qty = parseFloat(item.quantity || 1)
        if (!productStats[item.product_id]) productStats[item.product_id] = { units: 0, revenue: 0 }
        productStats[item.product_id].units   += qty
        productStats[item.product_id].revenue += qty * unitPrice
      })

      const allProductIds = Object.keys(productStats)
      let topProducts = []
      let topCategories = []

      if (allProductIds.length > 0) {
        const { data: prodData } = await client
          .from('products')
          .select('id, name, category, images, shop_id, price')
          .in('id', allProductIds)

        const shopIds = [...new Set((prodData || []).map(p => p.shop_id).filter(Boolean))]
        const shopNameMap = {}
        if (shopIds.length > 0) {
          const { data: shopData } = await client.from('shops').select('id, name').in('id', shopIds)
          ;(shopData || []).forEach(s => { shopNameMap[s.id] = s.name })
        }

        const catStats = {}
        ;(prodData || []).forEach(p => {
          const stats = productStats[p.id] || { units: 0, revenue: 0 }
          const cat = p.category || 'Uncategorized'
          if (!catStats[cat]) catStats[cat] = { units: 0, revenue: 0 }
          catStats[cat].units   += stats.units
          catStats[cat].revenue += stats.revenue
        })
        topCategories = Object.entries(catStats)
          .map(([name, s]) => ({ name, units: Math.round(s.units), revenue: s.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8)

        ;(prodData || []).forEach(p => {
          const stats = productStats[p.id] || { units: 0, revenue: 0 }
          topProducts.push({ ...p, shopName: shopNameMap[p.shop_id] || '—', units: stats.units, revenue: stats.revenue })
        })
        topProducts.sort((a, b) => b.revenue - a.revenue)
        topProducts = topProducts.slice(0, 10)
      }

      const now = new Date()
      const revenueMonths = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), revenue: 0, orders: 0 }
      })
      nonCancelledOrders.forEach(o => {
        const d = new Date(o.created_at)
        const slot = revenueMonths.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
        if (!slot) return
        slot.revenue += parseFloat(o.total_amount || 0)
        slot.orders++
      })

      const shopRevenueMap = {}
      nonCancelledOrders.forEach(o => {
        shopRevenueMap[o.shop_id] = (shopRevenueMap[o.shop_id] || 0) + parseFloat(o.total_amount || 0)
      })
      const topShops = shops
        .map(s => ({ ...s, revenue: shopRevenueMap[s.id] || 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const thisMonthRev = nonCancelledOrders.filter(o => {
        const d = new Date(o.created_at)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)
      const lastMonthRev = nonCancelledOrders.filter(o => {
        const d = new Date(o.created_at)
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
      }).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)
      const revenueGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0

      const months = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), buyers: 0, sellers: 0 }
      })
      profiles.forEach(p => {
        const d = new Date(p.created_at)
        const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
        if (!slot) return
        if (p.role === 'seller') slot.sellers++
        else slot.buyers++
      })

      const verMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), submitted: 0, approved: 0 }
      })
      verifications.forEach(v => {
        const d = new Date(v.submitted_at)
        const slot = verMonths.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
        if (!slot) return
        slot.submitted++
        if (v.status === 'verified') slot.approved++
      })

      const roleDist = [
        { name: 'Buyers', value: buyers.length },
        { name: 'Sellers', value: sellers.length },
      ]
      const verDist = [
        { name: 'Pending', value: pendingVer.length },
        { name: 'Verified', value: approvedVer.length },
        { name: 'Rejected', value: rejectedVer.length },
      ].filter(d => d.value > 0)

      const recent = [...verifications]
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
        .slice(0, 5)
      if (recent.length > 0) {
        const ids = recent.map(v => v.user_id).filter(Boolean)
        const { data: pData } = await supabase.from('profiles').select('id, firstname, lastname, username, email').in('id', ids)
        const pMap = {}
        ;(pData || []).forEach(p => { pMap[p.id] = p })
        recent.forEach(v => { v._profile = pMap[v.user_id] })
      }

      const thisMonth = profiles.filter(p => {
        const d = new Date(p.created_at)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }).length
      const lastMonth = profiles.filter(p => {
        const d = new Date(p.created_at)
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
      }).length
      const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0

      setStats({
        totalUsers, sellers: sellers.length, buyers: buyers.length,
        verifiedSellers: verifiedSellers.length,
        pendingVer: pendingVer.length, approvedVer: approvedVer.length, rejectedVer: rejectedVer.length,
        totalVerifications: verifications.length,
        totalShops, totalRevenue, totalOrders, revenueGrowth,
        thisMonthRev, topShops, topProducts, topCategories,
        registrationsByMonth: months, verByMonth: verMonths, revenueByMonth: revenueMonths,
        roleDist, verDist, recentVerifications: recent,
        thisMonth, lastMonth, growth,
      })
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
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

  const s = stats
  const fmtNAD = (v) => `N$${v.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'ShopIt platform overview'}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition hover:border-blue-300">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"      value={s.totalUsers}      icon={Users}     color="blue"   sub={`+${s.thisMonth} this month`} />
        <StatCard label="Sellers"          value={s.sellers}         icon={Store}     color="purple" sub={`${s.buyers} buyers`} />
        <StatCard label="Verified Sellers" value={s.verifiedSellers} icon={UserCheck} color="green"  sub={`${s.sellers > 0 ? Math.round((s.verifiedSellers / s.sellers) * 100) : 0}% of sellers`} />
        <StatCard label="Pending Reviews"  value={s.pendingVer}      icon={Clock}     color="amber"  sub="Awaiting action" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Shops"   value={s.totalShops}   icon={Store}      color="orange" sub="Active storefronts" />
        <StatCard label="Total Revenue" value={fmtNAD(s.totalRevenue)} icon={DollarSign} color="green" sub={`${s.revenueGrowth > 0 ? '+' : ''}${s.revenueGrowth}% vs last month`} />
        <StatCard label="Total Orders"  value={s.totalOrders}  icon={Package}    color="indigo" sub="Excl. cancelled" />
        <StatCard label="User Growth"   value={`${s.growth > 0 ? '+' : ''}${s.growth}%`} icon={TrendingUp} color={s.growth >= 0 ? 'green' : 'red'} sub="vs last month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Revenue (last 7 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `N$${(v / 1000).toFixed(0)}k` : `N$${v}`} width={60} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} width={35} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [name === 'Revenue' ? fmtNAD(value) : value, name]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} fill="url(#gRevenue)" dot={false} />
              <Area yAxisId="ord" type="monotone" dataKey="orders"  name="Orders"  stroke="#2563EB" strokeWidth={2} fill="url(#gOrders)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Top Shops by Revenue</h2>
          {s.topShops.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">No orders yet</div>
          ) : (
            <div className="space-y-3">
              {s.topShops.map((shop, i) => {
                const pct = s.totalRevenue > 0 ? (shop.revenue / s.totalRevenue) * 100 : 0
                const barColors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-orange-400', 'bg-pink-400']
                return (
                  <div key={shop.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 flex-shrink-0">#{i + 1}</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{shop.name || 'Unnamed shop'}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex-shrink-0 ml-2">{fmtNAD(shop.revenue)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${barColors[i]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Top Selling Categories</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Revenue by product category from completed orders</p>
        {s.topCategories.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">No category data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={s.topCategories} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `N$${(v / 1000).toFixed(0)}k` : `N$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: labelColor, fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [
                name === 'Revenue' ? fmtNAD(value) : `${value.toLocaleString()} units`, name,
              ]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} fill="url(#gCatRevenue)">
                {s.topCategories.map((_, i) => {
                  const colors = ['#2563EB','#7c3aed','#16a34a','#f59e0b','#dc2626','#0891b2','#db2777','#65a30d']
                  return <Cell key={i} fill={colors[i % colors.length]} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">New Registrations (last 7 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.registrationsByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gBuyers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSellers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="buyers"  name="Buyers"  stroke="#2563EB" strokeWidth={2} fill="url(#gBuyers)"  dot={false} />
              <Area type="monotone" dataKey="sellers" name="Sellers" stroke="#7c3aed" strokeWidth={2} fill="url(#gSellers)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">User Role Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={s.roleDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {s.roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Verification Activity (last 6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.verByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="submitted" name="Submitted" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="approved"  name="Approved"  fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Verification Status</h2>
          {s.verDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={s.verDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {s.verDist.map(entry => {
                    const c = { Pending: '#f59e0b', Verified: '#16a34a', Rejected: '#dc2626' }
                    return <Cell key={entry.name} fill={c[entry.name] || '#ccc'} />
                  })}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">No data</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Selling Products</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Ranked by revenue from completed orders</p>
        </div>
        {s.topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <p className="font-medium text-sm">No product sales data yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Shop</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Units Sold</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revenue</th>
                <th className="px-5 py-3 hidden lg:table-cell w-36" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {s.topProducts.map((p, i) => {
                const maxRevenue = s.topProducts[0]?.revenue || 1
                const pct = (p.revenue / maxRevenue) * 100
                const thumbnail = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
                const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400']
                const barColors  = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-orange-400', 'bg-pink-400']
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${rankColors[i] || 'text-gray-300 dark:text-gray-600'}`}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {thumbnail ? (
                          <img src={thumbnail} alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs font-bold">
                            {p.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{fmtNAD(p.price)} each</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">{p.shopName || '—'}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {p.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {p.category}
                        </span>
                      ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(p.units).toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{fmtNAD(p.revenue)}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColors[i % barColors.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Verification Submissions</h2>
          <a href="/verifications" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View all →</a>
        </div>
        {s.recentVerifications.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">No submissions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Seller</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {s.recentVerifications.map(v => {
                const p = v._profile
                const name = p ? (`${p.firstname || ''} ${p.lastname || ''}`.trim() || p.username || p.email) : '—'
                const statusColors = {
                  pending:  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                  verified: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  rejected: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                }
                return (
                  <tr key={v.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[v.status] || ''}`}>
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 dark:text-gray-500 hidden sm:table-cell">
                      {new Date(v.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
