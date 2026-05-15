// DPO Group (Direct Pay Online) payment service
// Calls DPO's API directly from React Native — no Edge Function needed in development.
// In production, swap to Edge Functions to keep the company token server-side.

export const DPO_REDIRECT_URL = 'https://app.eshoppit.com/payment-result';
export const DPO_BACK_URL = 'https://app.eshoppit.com/payment-cancelled';

const DPO_API_URL = 'https://secure.3gdirectpay.com/API/v6/';
const DPO_COMPANY_TOKEN = '8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3'; // demo token
const DPO_SERVICE_TYPE = '5525';

function extractXml(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

export async function createDPOToken(orderId, amount, currency = 'NAD') {
  const amountStr = Number(amount).toFixed(2);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const serviceDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${DPO_COMPANY_TOKEN}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amountStr}</PaymentAmount>
    <PaymentCurrency>${currency}</PaymentCurrency>
    <CompanyRef>${orderId}</CompanyRef>
    <RedirectURL>${DPO_REDIRECT_URL}</RedirectURL>
    <BackURL>${DPO_BACK_URL}</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>30</PTL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${DPO_SERVICE_TYPE}</ServiceType>
      <ServiceDescription>ShopIt Purchase - Order ${orderId}</ServiceDescription>
      <ServiceDate>${serviceDate}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

  const response = await fetch(DPO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xmlBody,
  });

  const xmlText = await response.text();
  const result = extractXml(xmlText, 'Result');
  const explanation = extractXml(xmlText, 'ResultExplanation');
  const transToken = extractXml(xmlText, 'TransToken');
  const transRef = extractXml(xmlText, 'TransRef');

  if (result !== '000' || !transToken) {
    throw new Error(explanation || 'Failed to create payment token');
  }

  return {
    paymentUrl: `https://secure.3gdirectpay.com/payv2.php?ID=${transToken}`,
    transToken,
    transRef,
  };
}

export async function verifyDPOPayment(transToken) {
  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${DPO_COMPANY_TOKEN}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${transToken}</TransactionToken>
</API3G>`;

  const response = await fetch(DPO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xmlBody,
  });

  const xmlText = await response.text();
  const result = extractXml(xmlText, 'Result');
  const explanation = extractXml(xmlText, 'ResultExplanation');
  const transRef = extractXml(xmlText, 'TransRef');
  const amount = extractXml(xmlText, 'TransactionAmount');
  const currency = extractXml(xmlText, 'TransactionCurrency');
  const customerName = extractXml(xmlText, 'CustomerName');

  let status;
  if (result === '000') status = 'success';
  else if (result === '001') status = 'pending';
  else status = 'failed';

  return { status, resultCode: result, description: explanation, transRef, amount, currency, customerName };
}
