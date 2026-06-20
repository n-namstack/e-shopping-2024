import { supabaseAdmin } from './supabaseAdmin'
import { supabase } from './supabase'

export async function logAudit({ action, targetType, targetId, targetLabel, details = {} }) {
  try {
    const client = supabaseAdmin || supabase
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    await client.from('admin_audit_logs').insert({
      admin_id:     user?.id   || null,
      admin_email:  user?.email || 'unknown',
      action,
      target_type:  targetType  || null,
      target_id:    targetId    ? String(targetId) : null,
      target_label: targetLabel || null,
      details,
    })
  } catch (e) {
    console.warn('[audit] log failed (non-fatal):', e.message)
  }
}
