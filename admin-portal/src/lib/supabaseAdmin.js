import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wwfhaxdvizqzaqrnusiz.supabase.co'
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Service role client — bypasses RLS. Only used for admin operations.
// storageKey is unique to avoid conflicting with the regular client's session.
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'shopit-admin-service',
      },
    })
  : null
