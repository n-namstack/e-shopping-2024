import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, ShieldCheck, Users, LogOut, Menu, X,
  UserCog, Banknote, BarChart2, ClipboardList, Moon, Sun, CircleUser, MapPin
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'

const nav = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true },
  { to: '/verifications', icon: ShieldCheck,     label: 'Verifications' },
  { to: '/users',         icon: Users,           label: 'Users' },
  { to: '/payouts',       icon: Banknote,        label: 'Payouts' },
  { to: '/admins',        icon: UserCog,         label: 'Admins' },
  { to: '/system-usage',  icon: BarChart2,       label: 'System Usage' },
  { to: '/system-audits',    icon: ClipboardList,   label: 'System Audits'  },
  { to: '/shop-locations',   icon: MapPin,          label: 'Shop Locations' },
]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const { dark, toggle } = useTheme()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const email = session?.user?.email || ''

  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [session?.user?.id])

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <img src="/logo.png" alt="ShopIt" className="h-8 w-auto object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">Admin Portal</p>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="ml-1 lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : email.charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{email}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">View profile</p>
            </div>
            <CircleUser size={14} className="flex-shrink-0 opacity-50" />
          </NavLink>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setOpen(true)}>
            <Menu size={22} className="text-gray-600 dark:text-gray-400" />
          </button>
          <p className="font-semibold text-gray-900 dark:text-white flex-1">ShopIt Admin</p>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
