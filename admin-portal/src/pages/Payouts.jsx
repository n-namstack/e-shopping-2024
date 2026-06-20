import { useEffect, useState, useCallback } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import {
  RefreshCw, CheckCircle, Clock, Loader, Banknote,
  ChevronDown, ChevronUp, AlertCircle, X, Check
} from 'lucide-react'
import { logAudit } from '../lib/audit'

const STATUS_TABS = ['pending', 'processing', 'paid', 'all']

const STATUS_STYLE = {
  pending:    { bg: 'bg-amber-50 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-400',   label: 'Pending' },
  processing: { bg: 'bg-blue-50 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-400',     dot: 'bg-blue-400',    label: 'Processing' },
  paid:       { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Paid' },
}

const fmtNAD = (v) =>
  `N$${parseFloat(v || 0).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-NA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function Payouts() {
  const [payouts, setPayouts]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('pending')
  const [expanded, setExpanded]       = useState(null)
  const [confirmPayout, setConfirmPayout] = useState(null)
  const [marking, setMarking]         = useState(null)
  const [nextStatus, setNextStatus]   = useState(null)
  const [txId, setTxId]               = useState('')

  const client = supabaseAdmin || supabase

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client
        .from('payouts')
        .select('id, seller_id, amount, status, transaction_id, created_at, paid_at, order:orders(id, total_amount, created_at), bank_account:seller_bank_accounts(bank_name, account_number, account_holder, branch_code, account_type)')
        .order('created_at', { ascending: false })
      if (error) throw error

      const sellerIds = [...new Set((data || []).map(p => p.seller_id).filter(Boolean))]
      let sellerMap = {}
      if (sellerIds.length) {
        const { data: sellers } = await client.from('profiles').select('id, firstname, lastname, username, email').in('id', sellerIds)
        ;(sellers || []).forEach(s => { sellerMap[s.id] = s })
      }
      setPayouts((data || []).map(p => ({ ...p, seller: sellerMap[p.seller_id] || null })))
    } catch (e) {
      console.error('[Payouts]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openConfirm = (payout, status) => {
    setConfirmPayout(payout)
    setNextStatus(status)
    setTxId('')
  }

  const handleMark = async () => {
    if (!confirmPayout) return
    setMarking(confirmPayout.id)
    try {
      const update = {
        status: nextStatus,
        ...(nextStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
        ...(txId.trim() ? { transaction_id: txId.trim() } : {}),
      }
      const { error } = await client.from('payouts').update(update).eq('id', confirmPayout.id)
      if (error) throw error
      await logAudit({
        action: `payout.${nextStatus}`,
        targetType: 'payout',
        targetId: confirmPayout.id,
        targetLabel: sellerName(confirmPayout),
        details: {
          amount: `N$${parseFloat(confirmPayout.amount || 0).toFixed(2)}`,
          ...(txId.trim() ? { transaction_id: txId.trim() } : {}),
        },
      })
      setPayouts(prev => prev.map(p => p.id === confirmPayout.id ? { ...p, ...update } : p))
      setConfirmPayout(null)
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setMarking(null)
    }
  }

  const sellerName = (p) => {
    if (!p?.seller) return 'Unknown seller'
    const s = p.seller
    return `${s.firstname || ''} ${s.lastname || ''}`.trim() || s.username || s.email || '—'
  }

  const filtered = payouts.filter(p => tab === 'all' || p.status === tab)

  const counts = {
    pending:    payouts.filter(p => p.status === 'pending').length,
    processing: payouts.filter(p => p.status === 'processing').length,
    paid:       payouts.filter(p => p.status === 'paid').length,
    all:        payouts.length,
  }

  const pendingTotal    = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const processingTotal = payouts.filter(p => p.status === 'processing').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const paidTotal       = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const thCls = 'text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide'

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payouts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage seller payout requests</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Clock}       gradient="from-amber-400 to-orange-500"   label="Pending"    count={counts.pending}    amount={pendingTotal} />
        <SummaryCard icon={Loader}      gradient="from-blue-500 to-indigo-600"    label="Processing" count={counts.processing} amount={processingTotal} />
        <SummaryCard icon={CheckCircle} gradient="from-emerald-400 to-teal-600"   label="Paid"       count={counts.paid}       amount={paidTotal} />
        <SummaryCard icon={Banknote}    gradient="from-violet-500 to-purple-700"  label="Total"      count={counts.all}        amount={pendingTotal + processingTotal + paidTotal} />
      </div>

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {t}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-600'}`}>{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <CheckCircle size={40} className="mb-3 opacity-20" />
            <p className="font-medium">
              {tab === 'pending' ? 'No pending payouts' : tab === 'all' ? 'No payouts yet' : `No ${tab} payouts`}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className={thCls}>Seller</th>
                <th className={thCls}>Amount</th>
                <th className={`${thCls} hidden md:table-cell`}>Order</th>
                <th className={thCls}>Status</th>
                <th className={`${thCls} hidden sm:table-cell`}>Requested</th>
                <th className={`${thCls} hidden sm:table-cell`}>Paid</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending
                const isExpanded = expanded === p.id
                const orderId = p.order?.id ? `#${p.order.id.slice(0, 8).toUpperCase()}` : '—'
                const hasBankDetails = !!p.bank_account
                return [
                  <tr key={p.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 text-xs font-bold flex-shrink-0">
                          {sellerName(p).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{sellerName(p)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{p.seller?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="font-bold text-gray-900 dark:text-white">{fmtNAD(p.amount)}</span></td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell font-mono text-xs">{orderId}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs hidden sm:table-cell">{fmtDate(p.created_at)}</td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs hidden sm:table-cell">{fmtDate(p.paid_at)}</td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'pending' && (
                          <button onClick={() => openConfirm(p, 'processing')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold transition">
                            Processing
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'processing') && (
                          <button onClick={() => openConfirm(p, 'paid')}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition">
                            Mark Paid
                          </button>
                        )}
                        <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition"
                          title="Bank details">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${p.id}-bank`} className="border-b border-gray-100 dark:border-gray-700">
                      <td colSpan={7} className="px-5 py-4 bg-gray-50 dark:bg-gray-700/40">
                        {hasBankDetails ? (
                          <div className="flex flex-wrap gap-6">
                            <BankField label="Bank"       value={p.bank_account.bank_name} />
                            <BankField label="Account No" value={p.bank_account.account_number} mono />
                            <BankField label="Holder"     value={p.bank_account.account_holder} />
                            {p.bank_account.branch_code && <BankField label="Branch" value={p.bank_account.branch_code} mono />}
                            <BankField label="Type" value={p.bank_account.account_type} />
                            {p.transaction_id && <BankField label="Transaction ID" value={p.transaction_id} mono />}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                            <AlertCircle size={15} />
                            No bank account registered — contact the seller to add one.
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                ]
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            Showing {filtered.length} of {payouts.length} payouts
          </div>
        )}
      </div>

      {confirmPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setConfirmPayout(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {nextStatus === 'paid' ? 'Confirm Payout' : 'Mark as Processing'}
              </h3>
              <button onClick={() => setConfirmPayout(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Seller</span>
                <span className="font-semibold text-gray-900 dark:text-white">{sellerName(confirmPayout)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">{fmtNAD(confirmPayout.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Action</span>
                <span className={`font-semibold ${nextStatus === 'paid' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                  {nextStatus === 'paid' ? 'Mark as Paid' : 'Mark as Processing'}
                </span>
              </div>
            </div>
            {confirmPayout.bank_account ? (
              <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">Bank Details</p>
                <BankField label="Bank"       value={confirmPayout.bank_account.bank_name} />
                <BankField label="Account No" value={confirmPayout.bank_account.account_number} mono />
                <BankField label="Holder"     value={confirmPayout.bank_account.account_holder} />
                {confirmPayout.bank_account.branch_code && <BankField label="Branch" value={confirmPayout.bank_account.branch_code} mono />}
                <BankField label="Type" value={confirmPayout.bank_account.account_type} />
              </div>
            ) : (
              <div className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                <AlertCircle size={15} />
                No bank account on record. Contact the seller before proceeding.
              </div>
            )}
            {nextStatus === 'paid' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Transaction ID <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  value={txId}
                  onChange={e => setTxId(e.target.value)}
                  placeholder="e.g. FNB-20240613-8821"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmPayout(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              <button onClick={handleMark} disabled={!!marking}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2 ${nextStatus === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {marking ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                {nextStatus === 'paid' ? 'Yes, Mark as Paid' : 'Mark as Processing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, gradient, label, count, amount }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 flex items-start gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white/75 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-tight">{count}</p>
        <p className="text-xs text-white/65 mt-1">{fmtNAD(amount)}</p>
      </div>
    </div>
  )
}

function BankField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold text-gray-800 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}
