import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Gerar PIX
  app.post("/api/pix/create", async (req, res) => {
    try {
      const secretKey = process.env.PARADISE_PAGS_SECRET_KEY || "sk_d070b10a71908c4fff75b324600aed760294d130b50e73fe662de32a1fcaafcc";
      const accountId = process.env.PARADISE_PAGS_ACCOUNT_ID || "982";

      // Payload for Paradise Pags API
      // Note: Most Brazilian gateways require customer data and may use cents
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

      // Broad parsing for different response formats
      const pixCode = data.pix_code || 
                      data.qrcode || 
                      data.point_of_interaction?.pix_code || 
                      data.data?.pix_code ||
                      data.payload ||
                      data.emv ||
                      data.qr_code_base64 || // backup if they send base64 image string
                      data.payment?.pix?.payload; 

      if (!pixCode) {
        console.warn("PIX code not found in response, debug data:", data);
        // If we can't find it, we return the raw data to help identify the field
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
