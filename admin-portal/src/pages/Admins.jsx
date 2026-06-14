import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { UserCog, Plus, X, Trash2, RefreshCw, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Admins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null) // { name, email, password }
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(null)
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
      setError('Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.')
      setSubmitting(false)
      return
    }

    try {
      // Create confirmed user via admin API — no email confirmation needed
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: form.email.trim(),
        password: form.password,
        email_confirm: true,
        user_metadata: {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          role: 'admin',
        },
      })

      if (createError) throw createError

      const newUserId = createData.user?.id
      if (!newUserId) throw new Error('User creation failed — no user ID returned.')

      // Upsert profile with admin flag (bypasses RLS via service role)
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

      setSuccess({
        name: `${form.firstname.trim()} ${form.lastname.trim()}`,
        email: form.email.trim(),
        password: form.password,
      })
      setShowModal(false)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const revoke = async (admin) => {
    if (admin.id === currentUserId) {
      alert("You can't revoke your own admin access.")
      return
    }
    if (!confirm(`Remove admin access for ${displayName(admin)}? They will no longer be able to log in to this portal.`)) return
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

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage who has access to this portal</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-3 py-2 rounded-lg transition hover:border-blue-300">
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} />
            Add Admin
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-green-800">Admin account created</p>
              <p className="text-sm text-green-700 mt-0.5">Share these credentials securely with <span className="font-medium">{success.name}</span>.</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              <X size={18} />
            </button>
          </div>
          <div className="bg-white border border-green-200 rounded-xl divide-y divide-green-100 text-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{success.email}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-gray-500">Temp password</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-gray-900 bg-gray-50 px-2 py-0.5 rounded">{success.password}</code>
                <button
                  onClick={() => copyPassword(success.password)}
                  className="text-gray-400 hover:text-blue-600 transition"
                >
                  {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-3">
            The account is active immediately. Share these credentials securely — they should change their password after first login.
          </p>
        </div>
      )}

      {/* Admin list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserCog size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No admins found</p>
            <p className="text-sm mt-1">Add the first admin account to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {displayName(a).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {displayName(a)}
                          {a.id === currentUserId && (
                            <span className="ml-2 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">You</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">{a.email || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs hidden sm:table-cell">{fmtDate(a.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {a.id !== currentUserId && (
                      <button
                        onClick={() => revoke(a)}
                        disabled={revoking === a.id}
                        className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
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

      {/* Add Admin modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">Add Admin Account</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input
                    required
                    value={form.firstname}
                    onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input
                    required
                    value={form.lastname}
                    onChange={e => setForm(f => ({ ...f, lastname: e.target.value }))}
                    placeholder="Smith"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="flex-shrink-0 p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 hover:border-gray-300 transition bg-white"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPassword(form.password)}
                    className="flex-shrink-0 p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-300 transition bg-white"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Copy this and share it with the new admin. They can change it after first login.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
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
