import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { supabaseAdmin } from './lib/supabaseAdmin'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Verifications from './pages/Verifications'
import Users from './pages/Users'
import Admins from './pages/Admins'
import Payouts from './pages/Payouts'
import SystemUsage from './pages/SystemUsage'
import SystemAudits from './pages/SystemAudits'
import Profile from './pages/Profile'
import ShopLocations from './pages/ShopLocations'
import { ShieldOff, AlertTriangle } from 'lucide-react'

function AccessDenied({ onSignOut }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <ShieldOff size={28} className="text-red-500 dark:text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs">
        Your account does not have admin privileges. Contact an existing admin to grant you access.
      </p>
      <button onClick={onSignOut} className="px-5 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition">
        Sign out
      </button>
    </div>
  )
}

function MigrationRequired({ onSignOut }) {
  const [copied, setCopied] = useState(false)
  const sql = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;\n\n-- Replace with your email:\nUPDATE profiles SET is_admin = true\nWHERE email = 'your-email@example.com';`
  const copy = () => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-lg">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle size={26} className="text-amber-500 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">Database setup required</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 text-center">
          Run the following SQL in your <strong>Supabase SQL editor</strong> to add the admin column, then refresh this page.
        </p>
        <div className="bg-gray-900 rounded-xl p-4 text-left mb-4 relative">
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{sql}</pre>
          <button onClick={copy} className="absolute top-3 right-3 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2.5 py-1 rounded-lg transition">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
            Refresh after running SQL
          </button>
          <button onClick={onSignOut} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setIsAdmin(undefined); return }
    const client = supabaseAdmin || supabase
    client
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setIsAdmin('migration_required')
        } else {
          setIsAdmin(data?.is_admin === true)
        }
      })
  }, [session?.user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsAdmin(undefined)
  }

  if (session === undefined || (session && isAdmin === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session && isAdmin === 'migration_required') {
    return <MigrationRequired onSignOut={signOut} />
  }

  if (session && isAdmin === false) {
    return <AccessDenied onSignOut={signOut} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          session ? <Layout session={session} /> : <Navigate to="/login" replace />
        }>
          <Route index element={<Dashboard />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="users" element={<Users />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="admins" element={<Admins />} />
          <Route path="system-usage" element={<SystemUsage />} />
          <Route path="system-audits" element={<SystemAudits />} />
          <Route path="profile" element={<Profile />} />
          <Route path="shop-locations" element={<ShopLocations />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
