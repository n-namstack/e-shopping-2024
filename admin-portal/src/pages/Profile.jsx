import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Camera, Save, Lock, User, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [])
  const styles = type === 'success'
    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
    : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in ${styles}`}>
      <Icon size={16} />
      {msg}
    </div>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'

export default function Profile() {
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)

  // info form
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname]   = useState('')
  const [username, setUsername]   = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  // password form
  const [newPass, setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew, setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  // avatar
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef()

  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUser(session.user)

      const { data } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, username, email, role, avatar_url')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setProfile(data)
        setFirstname(data.firstname || '')
        setLastname(data.lastname  || '')
        setUsername(data.username  || '')
        setAvatarUrl(data.avatar_url || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const saveInfo = async () => {
    setSavingInfo(true)
    const { error } = await supabase
      .from('profiles')
      .update({ firstname: firstname.trim(), lastname: lastname.trim(), username: username.trim() })
      .eq('id', user.id)
    setSavingInfo(false)
    if (error) { showToast(error.message, 'error'); return }
    setProfile(p => ({ ...p, firstname: firstname.trim(), lastname: lastname.trim(), username: username.trim() }))
    showToast('Profile updated successfully')
  }

  const savePassword = async () => {
    if (!newPass) { showToast('Enter a new password', 'error'); return }
    if (newPass.length < 6) { showToast('Password must be at least 6 characters', 'error'); return }
    if (newPass !== confirmPass) { showToast('Passwords do not match', 'error'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSavingPass(false)
    if (error) { showToast(error.message, 'error'); return }
    setNewPass('')
    setConfirmPass('')
    showToast('Password changed successfully')
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2 MB', 'error'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return
    setUploadingAvatar(true)
    const ext = avatarFile.name.split('.').pop()
    const path = `admin-avatars/${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

    if (uploadError) {
      setUploadingAvatar(false)
      showToast(uploadError.message, 'error')
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    setUploadingAvatar(false)
    if (updateError) { showToast(updateError.message, 'error'); return }

    setAvatarUrl(publicUrl)
    setAvatarPreview(null)
    setAvatarFile(null)
    showToast('Profile picture updated')
  }

  const cancelAvatarChange = () => {
    setAvatarPreview(null)
    setAvatarFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayName = [profile?.firstname, profile?.lastname].filter(Boolean).join(' ') || profile?.username || user?.email || ''
  const initials = displayName.charAt(0).toUpperCase()
  const currentAvatar = avatarPreview || avatarUrl

  return (
    <div className="max-w-2xl space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account information and security</p>
      </div>

      {/* Avatar + identity card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center">
              {currentAvatar ? (
                <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-md transition"
              title="Change photo"
            >
              <Camera size={14} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>

          {/* Name + meta */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{displayName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                Admin
              </span>
              {profile?.role && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">
                  {profile.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar upload controls */}
        {avatarFile && (
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
              New photo selected: <span className="font-medium">{avatarFile.name}</span>
            </p>
            <button onClick={cancelAvatarChange} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button
              onClick={uploadAvatar}
              disabled={uploadingAvatar}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition"
            >
              {uploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {uploadingAvatar ? 'Uploading…' : 'Save photo'}
            </button>
          </div>
        )}
      </div>

      {/* Personal information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <User size={17} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Personal Information</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Update your name and username</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">First Name</label>
              <input
                value={firstname}
                onChange={e => setFirstname(e.target.value)}
                placeholder="First name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Last Name</label>
              <input
                value={lastname}
                onChange={e => setLastname(e.target.value)}
                placeholder="Last name"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email Address</label>
            <input
              value={user?.email || ''}
              disabled
              className={inputCls}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Email cannot be changed from this page.</p>
          </div>

          <div className="pt-1">
            <button
              onClick={saveInfo}
              disabled={savingInfo}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
            >
              {savingInfo ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {savingInfo ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock size={17} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Change Password</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Choose a strong password of at least 6 characters</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPass && (
              <PasswordStrength password={newPass} />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPass && newPass !== confirmPass && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">Passwords do not match</p>
            )}
            {confirmPass && newPass === confirmPass && newPass.length >= 6 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle size={12} /> Passwords match
              </p>
            )}
          </div>

          <div className="pt-1">
            <button
              onClick={savePassword}
              disabled={savingPass || !newPass || !confirmPass}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition"
            >
              {savingPass ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {savingPass ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const levels = [
    { label: 'Weak',    color: 'bg-red-400',    text: 'text-red-500 dark:text-red-400'    },
    { label: 'Fair',    color: 'bg-orange-400',  text: 'text-orange-500 dark:text-orange-400' },
    { label: 'Good',    color: 'bg-yellow-400',  text: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Strong',  color: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Strong',  color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  ]
  const level = levels[Math.max(0, score)]

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? level.color : 'bg-gray-200 dark:bg-gray-600'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${level.text}`}>{level.label}</p>
    </div>
  )
}
