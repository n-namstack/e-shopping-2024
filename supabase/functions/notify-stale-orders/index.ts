import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STALE_HOURS = 24

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

    // Find orders that are still pending/processing and haven't been updated in STALE_HOURS
    const { data: staleOrders, error } = await supabase
      .from('orders')
      .select(`
        id,
        shop_id,
        status,
        updated_at,
        shops!inner(owner_id, name)
      `)
      .in('status', ['pending', 'processing'])
      .lt('updated_at', staleThreshold)

    if (error) throw error

    if (!staleOrders || staleOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group by shop owner to avoid spamming one seller with many notifications
    const byOwner: Record<string, { ownerId: string; shopName: string; count: number; orderIds: string[] }> = {}

    for (const order of staleOrders) {
      const ownerId = order.shops.owner_id
      if (!byOwner[ownerId]) {
        byOwner[ownerId] = {
          ownerId,
          shopName: order.shops.name,
          count: 0,
          orderIds: [],
        }
      }
      byOwner[ownerId].count++
      byOwner[ownerId].orderIds.push(order.id)
    }

    let notifiedCount = 0

    for (const { ownerId, shopName, count, orderIds } of Object.values(byOwner)) {
      // Get push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', ownerId)
        .single()

      const pushBody = count === 1
        ? `You have 1 order that hasn't been updated in over ${STALE_HOURS} hours. Please check your orders.`
        : `You have ${count} orders that haven't been updated in over ${STALE_HOURS} hours. Please check your orders.`

      // In-app notification (one per stale order)
      for (const orderId of orderIds) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'stale_order',
          message: `Order #${orderId.slice(0, 8)} hasn't been updated in over ${STALE_HOURS} hours.`,
          order_id: orderId,
        })
      }

      // Push notification (one per seller, summarised)
      if (profile?.expo_push_token?.startsWith('ExponentPushToken[')) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile.expo_push_token,
            sound: 'default',
            title: 'Orders Need Attention',
            body: pushBody,
            data: { screen: 'SellerOrders' },
            priority: 'high',
            channelId: 'default',
          }),
        })
        notifiedCount++
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount, staleOrders: staleOrders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('notify-stale-orders error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
