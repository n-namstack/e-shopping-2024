import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { UserCog, Plus, X, Trash2, RefreshCw, Copy, Check, Eye, EyeOff } from 'lucide-react'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Admins() {
  const [admins, setAdmins]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState({ firstname: '', lastname: '', email: '', password: '' })
  const [showPw, setShowPw]             = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(null)
  const [copied, setCopied]             = useState(false)
  const [revoking, setRevoking]         = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUserId(session?.user?.id)
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('profiles')
        .select('id, firstname, lastname, username, email, created_at')
        .is('is_admin', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAdmins(data || [])
    } catch (e) {
      console.error('[Admins] load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openModal = () => {
    setForm({ firstname: '', lastname: '', email: '', password: generatePassword() })
    setError('')
    setSuccess(null)
    setShowModal(true)
    setShowPw(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    if (!supabaseAdmin) {
      setError('Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local and restart.')
      setSubmitting(false)
      return
    }
    try {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: form.email.trim(),
        password: form.password,
        email_confirm: true,
        user_metadata: { firstname: form.firstname.trim(), lastname: form.lastname.trim(), role: 'admin' },
      })
      if (createError) throw createError
      const newUserId = createData.user?.id
      if (!newUserId) throw new Error('User creation failed — no user ID returned.')
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: newUserId,
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
        role: 'buyer',
        is_admin: true,
        is_verified: true,
      }, { onConflict: 'id' })
      if (profileError) throw profileError
      setSuccess({ name: `${form.firstname.trim()} ${form.lastname.trim()}`, email: form.email.trim(), password: form.password })
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const revoke = async (admin) => {
    if (admin.id === currentUserId) { alert("You can't revoke your own admin access."); return }
    if (!confirm(`Remove admin access for ${displayName(admin)}?`)) return
    setRevoking(admin.id)
    try {
      const client = supabaseAdmin || supabase
      await client.from('profiles').update({ is_admin: false }).eq('id', admin.id)
      setAdmins(prev => prev.filter(a => a.id !== admin.id))
    } catch (e) {
      alert('Failed to revoke: ' + e.message)
    } finally {
      setRevoking(null)
    }
  }

  const copyPassword = (pw) => {
    navigator.clipboard.writeText(pw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayName = (a) =>
    `${a.firstname || ''} ${a.lastname || ''}`.trim() || a.username || a.email || '—'

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admins</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage who has access to this portal</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg transition">
            <RefreshCw size={15} />
            Refresh
          </button>
          <button onClick={openModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">Admin account created</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">Share credentials securely with <span className="font-medium">{success.name}</span>.</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 dark:hover:text-green-300"><X size={18} /></button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl divide-y divide-green-100 dark:divide-green-900 text-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="font-medium text-gray-900 dark:text-white">{success.email}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-gray-500 dark:text-gray-400">Temp password</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">{success.password}</code>
                <button onClick={() => copyPassword(success.password)} className="text-gray-400 hover:text-blue-600 transition">
                  {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-3">Account is active immediately. They should change their password after first login.</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <UserCog size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No admins found</p>
            <p className="text-sm mt-1">Add the first admin account to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Admin</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {displayName(a).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {displayName(a)}
                          {a.id === currentUserId && (
                            <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell">{a.email || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs hidden sm:table-cell">{fmtDate(a.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {a.id !== currentUserId && (
                      <button
                        onClick={() => revoke(a)}
                        disabled={revoking === a.id}
                        className="inline-flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {revoking === a.id
                          ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 size={13} />
                        }
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Add Admin Account</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">First Name</label>
                  <input required value={form.firstname} onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))} placeholder="Jane" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Last Name</label>
                  <input required value={form.lastname} onChange={e => setForm(f => ({ ...f, lastname: e.target.value }))} placeholder="Smith" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email Address</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Temporary Password</label>
                  <button type="button" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Regenerate</button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`flex-1 min-w-0 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="flex-shrink-0 p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 bg-white dark:bg-gray-700 transition">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button type="button" onClick={() => copyPassword(form.password)} className="flex-shrink-0 p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-700 transition">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Copy and share securely — they can change it after first login.</p>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {submitting ? 'Creating…' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
