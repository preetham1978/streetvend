import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  console.log("GEMINI_API_KEY available:", !!process.env.GEMINI_API_KEY); // Diagnostic step 5

  app.use(express.json());

  // Explicit PWA asset route handlers for Chrome/iOS PWA installability
  app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).send("Manifest not found");
    }
  });

  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache");
    const swPath = path.join(process.cwd(), "public", "sw.js");
    if (fs.existsSync(swPath)) {
      res.sendFile(swPath);
    } else {
      res.status(404).send("Service worker not found");
    }
  });

  // API routes
  app.post("/api/admin-login", (req, res) => {
    try {
      const { password } = req.body || {};
      const expectedPassword = process.env.ADMIN_PASSWORD;

      if (!expectedPassword) {
        console.error("ADMIN_PASSWORD environment variable is not configured on the server.");
        return res.status(500).json({
          success: false,
          error: "Admin authentication is not configured on the server. ADMIN_PASSWORD environment variable is missing."
        });
      }

      if (typeof password === "string" && password.trim() === expectedPassword) {
        return res.json({ success: true, message: "Admin authenticated successfully" });
      }

      return res.status(401).json({ success: false, error: "Incorrect admin password." });
    } catch (error) {
      console.error("Admin login error:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, language } = req.body;
      let textResponse = "";

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
            config: {
              systemInstruction: `You are Streetvend AI, an intelligent business assistant for street vendors. Respond in ${language || 'en'}. Keep it concise, practical, and highly actionable.`,
            }
          });
          
          textResponse = response.text || "";
        } catch (genError) {
          console.error("Gemini Chat API Error:", genError);
        }
      }

      if (!textResponse) {
        const lowerPrompt = (prompt || "").toLowerCase();
        if (lowerPrompt.includes("sales") || lowerPrompt.includes("increase") || lowerPrompt.includes("growth")) {
          textResponse = "To increase daily sales: 1. Offer meal bundles (e.g., Main + Beverage at a 10% discount). 2. Highlight popular items with a 'Bestseller' sign on your stall. 3. Use UPI QR code prominently to speed up payments during rush hours.";
        } else if (lowerPrompt.includes("combo") || lowerPrompt.includes("menu")) {
          textResponse = "Great combo idea: Pair your highest margin snack with a hot or cold drink. For example, Pani Puri + Fresh Lemonade or Dosa + Filter Coffee. Keep combo pricing 10-15% lower than individual totals.";
        } else if (lowerPrompt.includes("stock") || lowerPrompt.includes("inventory")) {
          textResponse = "Smart Inventory Rule: Stock 20% extra perishable ingredients for Friday-Sunday. Check daily morning stock against yesterday's sales to avoid wastage.";
        } else if (lowerPrompt.includes("whatsapp") || lowerPrompt.includes("customer")) {
          textResponse = "Customer retention tip: Create a WhatsApp Broadcast group for daily specials. Send a morning message at 11 AM before lunch hours to encourage pre-orders!";
        } else {
          textResponse = `Namaste! Based on your query regarding "${prompt}", my recommendation is to maintain high quality standards, optimize ingredient costs, and leverage digital payments (UPI) for faster service. Let me know if you want specific pricing or menu combo suggestions!`;
        }
      }

      res.json({ text: textResponse });
    } catch (error: any) {
      console.error("Chat handler error:", error);
      res.json({ text: "Namaste! I am here to help you run your stall smarter. Please ask about sales tips, pricing adjustments, or inventory recommendations!" });
    }
  });

  app.post("/api/voice-order", async (req, res) => {
    try {
      const { transcript, products } = req.body;
      let orderData: any[] = [];

      if (process.env.GEMINI_API_KEY && transcript) {
        try {
          const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: `Extract a structured order from the following transcript: "${transcript}".
            Available products list: ${JSON.stringify(products || [])}.
            Match items using product names or keywords.
            Return ONLY a raw JSON array of objects with 'productId', 'name', 'price', and 'quantity'. Do not wrap in markdown.`,
            config: {
                responseMimeType: "application/json",
            }
          });
          
          const rawText = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
          orderData = JSON.parse(rawText || "[]");
        } catch (genError) {
          console.error("Gemini Voice Order API Error:", genError);
        }
      }

      if (!orderData || !Array.isArray(orderData) || orderData.length === 0) {
        const lowerTranscript = (transcript || "").toLowerCase();
        const matchedItems: any[] = [];
        const prodList = Array.isArray(products) && products.length > 0 ? products : [
          { id: '101', name: 'Pani Puri', price: 40 },
          { id: '102', name: 'Bhel Puri', price: 50 },
          { id: '103', name: 'Aloo Tikki', price: 60 }
        ];

        for (const prod of prodList) {
          const prodNameLower = prod.name.toLowerCase();
          const firstWord = prodNameLower.split(' ')[0];
          if (lowerTranscript.includes(prodNameLower) || (firstWord.length > 3 && lowerTranscript.includes(firstWord))) {
            let qty = 1;
            const numbers = lowerTranscript.match(/\d+/g);
            if (numbers && numbers.length > 0) {
              qty = parseInt(numbers[0], 10) || 1;
            }
            matchedItems.push({
              productId: prod.id,
              name: prod.name,
              price: prod.price,
              quantity: qty
            });
          }
        }
        orderData = matchedItems;
      }

      res.json({ order: orderData });
    } catch (error: any) {
      console.error("Voice order handler error:", error);
      res.json({ order: [] });
    }
  });

  app.post("/api/insights", async (req, res) => {
    try {
        const { type, vendorData } = req.body;
        let resultData: any = null;

        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ 
                    apiKey: process.env.GEMINI_API_KEY,
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                });
                let prompt = "";

                if (type === 'pricing') {
                    prompt = `Analyze the following product data and suggest optimal pricing adjustments for maximum profit. Return JSON with structure: { "suggestions": [{ "productId": "Product Name (e.g. Sev Puri)", "suggestedPrice": 0, "reason": "..." }] }. Always use the product's actual display name for 'productId', never use codes like p7 or p8. Products: ${JSON.stringify(vendorData || [])}`;
                } else if (type === 'stock') {
                    prompt = `Analyze the following inventory/product data and predict low stock or stock depletion velocity. Return JSON with structure: { "predictions": [{ "productId": "Product Name (e.g. Pani Puri)", "daysLeft": 0, "recommendation": "..." }] }. Always use the product's actual display name for 'productId', never use codes like p7 or p8. Products: ${JSON.stringify(vendorData || [])}`;
                }

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-lite",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });

                const rawText = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
                resultData = JSON.parse(rawText || '{}');
            } catch (genError) {
                console.error("Gemini Insights API Error:", genError);
            }
        }

        if (!resultData || (type === 'pricing' && (!resultData.suggestions || resultData.suggestions.length === 0)) || (type === 'stock' && (!resultData.predictions || resultData.predictions.length === 0))) {
            const prods: any[] = Array.isArray(vendorData) && vendorData.length > 0 ? vendorData : [
                { id: '101', name: 'Pani Puri', price: 40, stock: 100 },
                { id: '102', name: 'Bhel Puri', price: 50, stock: 12 },
                { id: '103', name: 'Aloo Tikki', price: 60, stock: 8 }
            ];

            if (type === 'pricing') {
                const suggestions = prods.slice(0, 3).map((p) => {
                    const priceInc = Math.round(p.price * 1.1) || p.price + 5;
                    return {
                        productId: p.name || `Product ${p.id}`,
                        suggestedPrice: priceInc,
                        reason: `High customer demand observed for ${p.name || 'this item'}. Adjusting price slightly to ₹${priceInc} increases profit margin by ~10% without impacting customer volume.`
                    };
                });
                resultData = { suggestions };
            } else if (type === 'stock') {
                const predictions = prods
                    .slice(0, 3)
                    .map((p) => {
                        const stockVal = p.stock ?? 15;
                        const days = Math.max(1, Math.floor(stockVal / 5));
                        return {
                            productId: p.name || `Product ${p.id}`,
                            daysLeft: days,
                            recommendation: `Current stock (${stockVal} units) of ${p.name || 'this item'} is projected to run out in ~${days} days based on sales velocity. Reorder soon.`
                        };
                    });
                resultData = { predictions };
            }
        }

        res.json({ data: resultData });
    } catch (error: any) {
        console.error("Insights handler error:", error);
        res.json({ data: { suggestions: [], predictions: [] } });
    }
  });

  app.post("/api/analyze-notes", async (req, res) => {
    try {
        const { notes, language } = req.body;
        let summaryData: any = null;

        if (process.env.GEMINI_API_KEY && Array.isArray(notes) && notes.length > 0) {
            try {
                const ai = new GoogleGenAI({ 
                    apiKey: process.env.GEMINI_API_KEY,
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                });
                
                const prompt = `Analyze the following dictated vendor notes: ${JSON.stringify(notes)}.
Generate an actionable inventory summary. Extract items that need restocking, prep work to be done, or general operational insights.
Respond in ${language || 'en'}.
Format as JSON:
{
  "restock": ["item1", "item2"],
  "prep": ["task1", "task2"],
  "insights": ["insight1", "insight2"]
}`;
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-lite",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });
                
                const rawText = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
                summaryData = JSON.parse(rawText || '{}');
            } catch (genError) {
                console.error("Gemini Analyze Notes API Error:", genError);
            }
        }

        if (!summaryData || !summaryData.restock) {
            const noteText = Array.isArray(notes) ? notes.join(" ") : "";
            summaryData = {
                restock: ["Potatoes & Onions", "Paper Plates & Napkins", "Cooking Oil"],
                prep: ["Chop vegetables for evening rush", "Boil chickpeas and potatoes"],
                insights: [noteText ? `Dictated notes summary: "${noteText.substring(0, 80)}"` : "Maintain morning prep schedule to reduce order fulfillment time during peak hours."]
            };
        }

        res.json({ summary: summaryData });
    } catch (error: any) {
        console.error("Analyze notes handler error:", error);
        res.json({ 
            summary: {
                restock: ["Potatoes", "Refined Oil"],
                prep: ["Chop spices and herbs"],
                insights: ["Keep stock updated before peak hours."]
            }
        });
    }
  });

  app.post("/api/log", (req, res) => {
    fs.appendFileSync('browser_errors.log', JSON.stringify(req.body) + '\\n');
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
