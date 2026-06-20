import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { Store, MapPin, RefreshCw, Search, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

// Fix default Leaflet marker icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const shopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Fly map to first visible shop when filter changes
function MapFlyTo({ shops }) {
  const map = useMap()
  useEffect(() => {
    if (shops.length > 0) {
      map.flyTo([shops[0].latitude, shops[0].longitude], 10, { duration: 1 })
    }
  }, [shops])
  return null
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const json = await res.json()
    return (
      json.address?.city ||
      json.address?.town ||
      json.address?.village ||
      json.address?.county ||
      json.address?.state ||
      'Unknown'
    )
  } catch {
    return 'Unknown'
  }
}

const BAR_COLORS = ['#2563EB','#7c3aed','#16a34a','#f59e0b','#dc2626','#0891b2','#db2777','#65a30d','#ea580c','#6366f1']

export default function ShopLocations() {
  const [shops, setShops]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [geocoding, setGeocoding]   = useState(false)
  const [townMap, setTownMap]       = useState({})   // shopId → town
  const [search, setSearch]         = useState('')
  const [selectedTown, setSelectedTown] = useState(null)
  const { dark } = useTheme()

  const tickColor    = dark ? '#6b7280' : '#94a3b8'
  const gridColor    = dark ? '#374151' : '#f1f5f9'
  const labelColor   = dark ? '#d1d5db' : '#374151'
  const tooltipStyle = dark
    ? { fontSize: 12, borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1f2937', color: '#f9fafb' }
    : { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }

  const load = async () => {
    setLoading(true)
    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('shops')
      .select('id, name, category, latitude, longitude, created_at, owner_id')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setShops(data)
      geocodeTowns(data)
    }
    setLoading(false)
  }

  const geocodeTowns = async (shopList) => {
    setGeocoding(true)
    const result = {}
    for (let i = 0; i < shopList.length; i++) {
      const s = shopList[i]
      if (townMap[s.id]) { result[s.id] = townMap[s.id]; continue }
      result[s.id] = await reverseGeocode(s.latitude, s.longitude)
      // Respect Nominatim 1 req/sec rate limit
      if (i < shopList.length - 1) await new Promise(r => setTimeout(r, 1100))
    }
    setTownMap(result)
    setGeocoding(false)
  }

  useEffect(() => { load() }, [])

  const withTowns = useMemo(() =>
    shops.map(s => ({ ...s, town: townMap[s.id] || '…' })),
    [shops, townMap]
  )

  const filtered = useMemo(() => {
    let list = withTowns
    if (selectedTown) list = list.filter(s => s.town === selectedTown)
    if (search) list = list.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [withTowns, selectedTown, search])

  const townChart = useMemo(() => {
    const counts = {}
    withTowns.forEach(s => {
      if (!s.town || s.town === '…') return
      counts[s.town] = (counts[s.town] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [withTowns])

  const mappable = filtered.filter(s => s.latitude && s.longitude)
  const center = mappable.length > 0
    ? [mappable[0].latitude, mappable[0].longitude]
    : [-22.5597, 17.0832] // Windhoek default

  const totalWithCoords = shops.length
  const uniqueTowns = new Set(Object.values(townMap).filter(t => t !== 'Unknown')).size

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {geocoding
              ? `Loading town names… (${Object.keys(townMap).length}/${shops.length})`
              : `${totalWithCoords} shops mapped across ${uniqueTowns} towns`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTown && (
            <button onClick={() => setSelectedTown(null)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
              {selectedTown} <X size={12} />
            </button>
          )}
          <button onClick={load}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Shops on Map',   value: totalWithCoords,  color: 'blue'   },
          { label: 'Towns Covered',  value: uniqueTowns,      color: 'violet' },
          { label: 'Showing',        value: filtered.length,  color: 'emerald'},
        ].map(({ label, value, color }) => {
          const cls = {
            blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800',
            violet:  'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-800',
            emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
          }[color]
          return (
            <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
            </div>
          )
        })}
      </div>

      {/* Map + chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Search bar over map */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search shops…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={13} className="text-gray-400 dark:text-gray-500" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{mappable.length} pins</p>
          </div>

          <div style={{ height: 460 }}>
            {mappable.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <MapPin size={40} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">No shops with coordinates found</p>
                <p className="text-xs mt-1">Shops need to have latitude & longitude set in the app</p>
              </div>
            ) : (
              <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFlyTo shops={mappable} />
                {mappable.map(shop => (
                  <Marker key={shop.id} position={[shop.latitude, shop.longitude]} icon={shopIcon}>
                    <Popup>
                      <div className="text-sm min-w-[140px]">
                        <p className="font-bold text-gray-900 mb-0.5">{shop.name}</p>
                        {shop.category && <p className="text-xs text-gray-500 mb-1">{shop.category}</p>}
                        <p className="text-xs text-blue-600 font-medium">{shop.town}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {parseFloat(shop.latitude).toFixed(5)}, {parseFloat(shop.longitude).toFixed(5)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Shops by town chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Shops by Town</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {geocoding ? 'Resolving town names…' : 'Click a bar to filter the map'}
          </p>

          {geocoding && townChart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Geocoding shop locations…</p>
            </div>
          ) : townChart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              No location data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={townChart}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                barSize={16}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: labelColor }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${v} shop${v !== 1 ? 's' : ''}`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer"
                  onClick={(d) => setSelectedTown(prev => prev === d.name ? null : d.name)}>
                  {townChart.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={selectedTown === entry.name ? '#f59e0b' : BAR_COLORS[i % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Shop list table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Shop Directory</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {filtered.length} shop{filtered.length !== 1 ? 's' : ''} {selectedTown ? `in ${selectedTown}` : 'with location data'}
          </p>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Store size={36} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No shops match your filter</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Shop', 'Category', 'Town', 'Coordinates'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((shop, i) => (
                <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length] ? '' : ''}`}
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}>
                        {shop.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{shop.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {shop.category ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {shop.category}
                      </span>
                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelectedTown(prev => prev === shop.town ? null : shop.town)}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                      disabled={shop.town === '…'}
                    >
                      <MapPin size={12} />
                      <span className="text-xs font-medium">{shop.town}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {parseFloat(shop.latitude).toFixed(5)}, {parseFloat(shop.longitude).toFixed(5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
