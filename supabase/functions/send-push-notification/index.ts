import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pushToken, title, body, data } = await req.json()

    if (!pushToken || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'pushToken, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pushToken.startsWith('ExponentPushToken[')) {
      return new Response(
        JSON.stringify({ error: `"${pushToken}" is not a valid Expo push token` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send push notification via Expo
    const sendResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: 'default',
      }),
    })

    const sendResult = await sendResponse.json()

    if (sendResult.data?.status === 'error') {
      console.error('Expo push send error:', sendResult.data.message)
      return new Response(
        JSON.stringify({ error: sendResult.data.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pushId = sendResult.data?.id

    // Check receipt after a short delay to detect and clean up stale tokens.
    // Expo processes receipts within a few seconds in most cases.
    if (pushId) {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      try {
        const receiptRes = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [pushId] }),
        })
        const receiptJson = await receiptRes.json()
        const receipt = receiptJson.data?.[pushId]

        if (receipt?.details?.error === 'DeviceNotRegistered') {
          console.warn('[push] DeviceNotRegistered — clearing stale token:', pushToken.slice(0, 30))

          // Use the auto-injected service role key to bypass RLS and clear the token
          const supabaseUrl     = Deno.env.get('SUPABASE_URL')
          const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

          if (supabaseUrl && serviceRoleKey) {
            const adminClient = createClient(supabaseUrl, serviceRoleKey)
            await adminClient
              .from('profiles')
              .update({ expo_push_token: null })
              .eq('expo_push_token', pushToken)
          }

          return new Response(
            JSON.stringify({ warning: 'DeviceNotRegistered', tokenCleared: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (receiptErr) {
        // Non-critical — log and move on
        console.warn('[push] Receipt check failed:', receiptErr.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, result: sendResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-push-notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
