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

function buildCreateTokenXml(
  companyToken: string,
  amount: string,
  currency: string,
  orderId: string,
  serviceType: string,
  redirectUrl: string,
  backUrl: string,
): string {
  const now = new Date()
  const serviceDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${companyToken}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>${currency}</PaymentCurrency>
    <CompanyRef>${orderId}</CompanyRef>
    <RedirectURL>${redirectUrl}</RedirectURL>
    <BackURL>${backUrl}</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>30</PTL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${serviceType}</ServiceType>
      <ServiceDescription>ShopIt Purchase - Order ${orderId}</ServiceDescription>
      <ServiceDate>${serviceDate}</ServiceDate>
    </Service>
  </Services>
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

    const { orderId, amount, currency = 'NAD' } = await req.json()
    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: 'orderId and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyToken = Deno.env.get('DPO_COMPANY_TOKEN') ?? '8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3'
    const serviceType = Deno.env.get('DPO_SERVICE_TYPE') ?? '45'
    const redirectUrl = Deno.env.get('DPO_REDIRECT_URL') ?? 'https://app.eshoppit.com/payment-result'
    const backUrl = Deno.env.get('DPO_BACK_URL') ?? 'https://app.eshoppit.com/payment-cancelled'

    const amountStr = Number(amount).toFixed(2)
    const xmlBody = buildCreateTokenXml(companyToken, amountStr, currency, orderId, serviceType, redirectUrl, backUrl)

    const dpoResponse = await fetch(DPO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xmlBody,
    })

    const xmlText = await dpoResponse.text()
    const result = extractXml(xmlText, 'Result')
    const explanation = extractXml(xmlText, 'ResultExplanation')
    const transToken = extractXml(xmlText, 'TransToken')
    const transRef = extractXml(xmlText, 'TransRef')

    if (result !== '000' || !transToken) {
      console.error('DPO createToken failed:', xmlText)
      return new Response(
        JSON.stringify({ error: explanation || 'Failed to create payment token' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentUrl = `https://secure.3gdirectpay.com/payv2.php?ID=${transToken}`

    return new Response(
      JSON.stringify({ paymentUrl, transToken, transRef }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-dpo-token error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
