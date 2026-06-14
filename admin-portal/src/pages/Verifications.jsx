import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import { Search, X, CheckCircle, XCircle, Eye, RefreshCw, ChevronRight, FileText, Image, ExternalLink } from 'lucide-react'

const TABS = ['all', 'pending', 'verified', 'rejected']

export default function Verifications() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [urlsLoading, setUrlsLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (error) throw error

      const list = data || []
      const ids = [...new Set(list.map(v => v.user_id).filter(Boolean))]
      let pMap = {}
      if (ids.length) {
        const { data: p } = await supabase.from('profiles').select('id, firstname, lastname, username, email, expo_push_token').in('id', ids)
        ;(p || []).forEach(x => { pMap[x.id] = x })
      }
      setAll(list.map(v => ({ ...v, _profile: pMap[v.user_id] || null })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const loadUrls = async (v) => {
    setUrlsLoading(true)
    const urls = {}
    const EXPIRY = 3600
    if (v.national_id_url) {
      const { data } = await supabase.storage.from('verification-documents').createSignedUrl(v.national_id_url, EXPIRY)
      if (data?.signedUrl) urls.national_id = data.signedUrl
    }
    if (v.selfie_url) {
      const { data } = await supabase.storage.from('verification-documents').createSignedUrl(v.selfie_url, EXPIRY)
      if (data?.signedUrl) urls.selfie = data.signedUrl
    }
    setSignedUrls(urls)
    setUrlsLoading(false)
  }

  const openDetail = (v) => {
    setSelected(v)
    setSignedUrls({})
    loadUrls(v)
  }

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === 'all' ? all.length : all.filter(v => v.status === t).length
    return acc
  }, {})

  const filtered = all
    .filter(v => tab === 'all' || v.status === tab)
    .filter(v => {
      if (!search) return true
      const q = search.toLowerCase()
      const p = v._profile
      return (
        (p?.firstname || '').toLowerCase().includes(q) ||
        (p?.lastname || '').toLowerCase().includes(q) ||
        (p?.username || '').toLowerCase().includes(q) ||
        (p?.email || '').toLowerCase().includes(q)
      )
    })

  const approve = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      await supabase.from('seller_verifications').update({ status: 'verified' }).eq('id', selected.id)
      await supabase.from('profiles').update({ is_verified: true }).eq('id', selected.user_id)
      await supabase.from('shops').update({ verification_status: 'verified' }).eq('owner_id', selected.user_id)
      setAll(prev => prev.map(v => v.id === selected.id ? { ...v, status: 'verified' } : v))
      setSelected(null)
    } catch (e) {
      console.error(e)
      alert('Failed to approve: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  const reject = async () => {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return }
    setProcessing(true)
    try {
      await supabase.from('seller_verifications').update({ status: 'rejected', rejection_reason: rejectReason.trim() }).eq('id', selected.id)
      setAll(prev => prev.map(v => v.id === selected.id ? { ...v, status: 'rejected', rejection_reason: rejectReason.trim() } : v))
      setRejectModal(false)
      setSelected(null)
      setRejectReason('')
    } catch (e) {
      console.error(e)
      alert('Failed to reject: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  const sellerName = (v) => {
    const p = v?._profile
    if (!p) return '—'
    return `${p.firstname || ''} ${p.lastname || ''}`.trim() || p.username || p.email || '—'
  }

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Verifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve seller identity submissions</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-3 py-2 rounded-lg transition hover:border-blue-300">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-gray-100' : 'bg-gray-200'}`}>
              {counts[t]}
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
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-400" /></button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="font-medium">No {tab === 'all' ? '' : tab} verifications</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Seller</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Business Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Submitted</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetail(v)}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{sellerName(v)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v._profile?.email || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell capitalize">
                    {v.business_type === 'individual' ? 'Individual' : 'Registered Business'}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs hidden sm:table-cell">{fmtDate(v.submitted_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight size={16} className="text-gray-300 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-gray-900">Verification Review</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Seller info */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {sellerName(selected).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base">{sellerName(selected)}</p>
                  <p className="text-sm text-gray-500">{selected._profile?.email || '—'}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              {/* Submission details */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 bg-gray-50 border-b border-gray-100">Submission Details</p>
                <div className="divide-y divide-gray-50">
                  {[
                    ['Business Type', selected.business_type === 'individual' ? 'Individual / Sole Trader' : 'Registered Business'],
                    selected.has_physical_store && ['Physical Address', selected.physical_address || '—'],
                    selected.additional_info && ['Additional Info', selected.additional_info],
                    ['Submitted', fmtDate(selected.submitted_at)],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                      <span className="text-gray-500 flex-shrink-0">{k}</span>
                      <span className="text-gray-900 font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 bg-gray-50 border-b border-gray-100">Documents</p>
                <div className="p-4 space-y-4">
                  {urlsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    [['National ID / Passport', signedUrls.national_id, selected.national_id_url],
                     ['Selfie with ID', signedUrls.selfie, selected.selfie_url]].map(([label, url, path]) => {
                      if (!path) return null
                      const isPdf = path?.toLowerCase().endsWith('.pdf')
                      return (
                        <div key={label}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                          {!url ? (
                            <div className="flex items-center justify-center h-24 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm gap-2">
                              <Image size={16} /> Unable to load
                            </div>
                          ) : isPdf ? (
                            <a href={url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-900">
                              <FileText size={20} className="text-red-500" />
                              Open PDF
                              <ExternalLink size={14} className="text-gray-400 ml-auto" />
                            </a>
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={label} className="w-full h-52 object-cover rounded-xl border border-gray-100 hover:opacity-90 transition" />
                            </a>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Rejection reason */}
              {selected.status === 'rejected' && selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-800">{selected.rejection_reason}</p>
                </div>
              )}

              {/* Actions — only for pending */}
              {selected.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setRejectModal(true)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-60"
                  >
                    <XCircle size={17} /> Reject
                  </button>
                  <button
                    onClick={approve}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-60"
                  >
                    {processing
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <CheckCircle size={17} />
                    }
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Reason for Rejection</h3>
            <p className="text-sm text-gray-500 mb-4">This will be sent to the seller as a notification.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Your ID photo is blurry — please resubmit a clearer image of the front and back."
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={processing}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
