import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DPO_API_URL = 'https://secure.3gdirectpay.com/API/v6/'

function extractXml(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`))
  return m ? m[1].trim() : ''
}

function buildVerifyXml(companyToken: string, transToken: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken}</CompanyToken>
  <Request>verifyToken</Request>
  <Transaction>
    <TransactionToken>${transToken}</TransactionToken>
  </Transaction>
</API3G>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { transToken } = await req.json()
    if (!transToken) {
      return new Response(
        JSON.stringify({ error: 'transToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyToken = Deno.env.get('DPO_COMPANY_TOKEN') ?? '8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3'
    const xmlBody = buildVerifyXml(companyToken, transToken)

    const dpoResponse = await fetch(DPO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xmlBody,
    })

    const xmlText = await dpoResponse.text()
    const result = extractXml(xmlText, 'Result')
    const explanation = extractXml(xmlText, 'ResultExplanation')
    const transRef = extractXml(xmlText, 'TransRef')
    const amount = extractXml(xmlText, 'TransactionAmount')
    const currency = extractXml(xmlText, 'TransactionCurrency')
    const customerName = extractXml(xmlText, 'CustomerName')

    // DPO result codes: 000 = paid, 001 = pending, 002 = failed, 003 = cancelled, 004 = expired
    let status: 'success' | 'pending' | 'failed'
    if (result === '000') {
      status = 'success'
    } else if (result === '001') {
      status = 'pending'
    } else {
      status = 'failed'
    }

    return new Response(
      JSON.stringify({ status, resultCode: result, description: explanation, transRef, amount, currency, customerName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('verify-dpo-payment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
