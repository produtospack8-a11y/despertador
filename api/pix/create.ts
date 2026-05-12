import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const secretKey = process.env.PARADISE_PAGS_SECRET_KEY || "sk_d070b10a71908c4fff75b324600aed760294d130b50e73fe662de32a1fcaafcc";
    const accountId = process.env.PARADISE_PAGS_ACCOUNT_ID || "982";

    const payload = {
      amount: 100, // R$ 1,00 in cents
      description: "Desligar alarme",
      payment_method: "pix",
      external_id: `alarm_${Date.now()}`,
      account_id: accountId,
      customer: {
        name: "Cliente Alarme",
        email: "cliente@alarm.com",
        identification: "00000000191" // Dummy CPF
      }
    };

    const response = await fetch("https://multi.paradisepags.com/api/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Paradise Pags Error:", data);
      return res.status(response.status).json({ 
        error: "Erro ao gerar PIX", 
        details: data 
      });
    }

    const pixCode = data.pix_code || 
                    data.qrcode || 
                    data.point_of_interaction?.pix_code || 
                    data.data?.pix_code ||
                    data.payload ||
                    data.emv ||
                    data.qr_code_base64 || 
                    data.payment?.pix?.payload; 

    if (!pixCode) {
      console.warn("PIX code not found in response, debug data:", data);
      return res.json({ 
        success: false, 
        error: "Código PIX não encontrado na resposta",
        raw: data 
      });
    }

    res.json({ success: true, pix: pixCode, id: data.id });
  } catch (error) {
    console.error("PIX Generation Exception:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
