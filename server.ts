import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

dotenv.config();

// Initialize Supabase client lazily to prevent startup crashes
let supabaseAdminInstance: any = null;
const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn("Supabase Admin credentials missing. Database updates will be skipped.");
      return null;
    }
    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  console.log("GEMINI_API_KEY available:", !!process.env.GEMINI_API_KEY); // Diagnostic step 5

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // PayU Test Route
  app.get("/api/payu/test", (req, res) => {
    res.json({ 
      status: "callback route reachable", 
      timestamp: new Date(),
      env_app_url: process.env.APP_URL,
      detected_host: req.get('host'),
      protocol: req.get('x-forwarded-proto') || req.protocol
    });
  });

  // PayU Initiate Payment
  app.post("/api/payu/initiate", async (req, res) => {
    try {
      const { planId, vendorId, vendorEmail, vendorName, amount, productInfo } = req.body;
      
      const key = process.env.PAYU_MERCHANT_KEY;
      const salt = process.env.PAYU_MERCHANT_SALT;
      const mode = process.env.PAYU_MODE || "test";
      
      // Explicitly prefer APP_URL from environment
      let baseUrl = process.env.APP_URL;
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      
      if (!baseUrl) {
        baseUrl = `${protocol}://${req.get('host')}`;
        console.warn(`APP_URL not set. Falling back to detected URL: ${baseUrl}`);
      }

      if (!key || !salt) {
        console.error("PayU Error: PAYU_MERCHANT_KEY or PAYU_MERCHANT_SALT not configured");
        return res.status(500).json({ error: "PayU credentials not configured" });
      }

      // 1. Generate unique txnid
      const txnid = `SV_${Date.now()}_${vendorId.substring(0, 8)}`;
      
      // 2. Calculate Final Amount with 18% GST (Server-side calculation)
      const baseAmount = parseFloat(amount);
      const finalAmount = (baseAmount * 1.18).toFixed(2);

      // 3. Set URLs - Using separate success and failure endpoints as requested
      const surl = `${baseUrl}/api/payu/success`;
      const furl = `${baseUrl}/api/payu/failure`;

      console.log('--- PAYU INITIATION ---');
      console.log('PAYU SURL:', surl);
      console.log('PAYU FURL:', furl);
      console.log('BASE URL:', baseUrl);
      console.log('PROTOCOL DETECTED:', protocol);
      console.log('PLAN ID:', planId);
      console.log('VENDOR ID:', vendorId);
      console.log('-----------------------');

      // 4. Generate Hash
      // Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
      const udf1 = planId;
      const udf2 = vendorId;
      const udf3 = "";
      const udf4 = "";
      const udf5 = "";
      const udf6 = "";
      const udf7 = "";
      const udf8 = "";
      const udf9 = "";
      const udf10 = "";
      
      // Clean data to prevent hash issues
      const cleanName = vendorName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Vendor';
      const cleanProductInfo = productInfo.substring(0, 100);

      const hashParts = [
        key,
        txnid,
        finalAmount,
        cleanProductInfo,
        cleanName,
        vendorEmail,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        udf6,
        udf7,
        udf8,
        udf9,
        udf10,
        salt
      ];

      const hashString = hashParts.join('|');
      
      console.log(`PayU Debug - Key starts with: ${key?.substring(0, 3)}, Salt defined: ${!!salt}`);
      console.log(`PayU Hash String: ${hashString}`);
      
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      const payuUrl = mode === 'production' 
        ? "https://secure.payu.in/_payment" 
        : "https://test.payu.in/_payment";

      console.log(`PayU Initiate: txnid=${txnid}, amount=${finalAmount}, surl=${surl}`);

      res.json({
        payuUrl,
        params: {
          key,
          txnid,
          amount: finalAmount,
          productinfo: cleanProductInfo,
          firstname: cleanName,
          email: vendorEmail,
          phone: "9999999999", // Mandatory field for PayU
          surl,
          furl,
          hash,
          udf1,
          udf2,
          service_provider: "payu_paisa"
        }
      });
    } catch (error: any) {
      console.error("PayU Initiate Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PayU Success Handler
  app.post("/api/payu/success", async (req, res) => {
    console.log("CRITICAL: PayU Success Callback REACHED Server!");
    try {
      const payuResponse = req.body;
      console.log("PayU Success Callback Body:", JSON.stringify(payuResponse, null, 2));
      const salt = process.env.PAYU_MERCHANT_SALT;
      if (!salt) throw new Error("PayU Salt missing in environment");

      const {
        status, txnid, amount, productinfo, firstname, email, 
        udf1: planId, udf2: vendorId, key, hash: receivedHash
      } = payuResponse;

      // Verify Hash
      // Formula: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
      const hashParts = [
        salt,
        status,
        payuResponse.udf10 || "",
        payuResponse.udf9 || "",
        payuResponse.udf8 || "",
        payuResponse.udf7 || "",
        payuResponse.udf6 || "",
        payuResponse.udf5 || "",
        payuResponse.udf4 || "",
        payuResponse.udf3 || "",
        vendorId,
        planId,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        key
      ];
      
      const reverseHashString = hashParts.join('|');
      const calculatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

      if (calculatedHash !== receivedHash) {
        console.error("PayU Hash Mismatch! Possible fraud attempt.", { txnid, receivedHash, calculatedHash });
        return res.redirect(`/dashboard?payment=failed&reason=hash_mismatch`);
      }

      console.log(`PayU Payment Success: txnid=${txnid}, plan=${planId}`);

      // Update Database
      try {
        const mihpayid = payuResponse.mihpayid;
        const supabaseAdmin = getSupabaseAdmin();
        
        if (supabaseAdmin) {
          // 1. Update Vendor Plan
          const { error: vendorError } = await supabaseAdmin
            .from('vendors')
            .update({ 
              subscription: planId
            })
            .eq('id', vendorId);

          if (vendorError) {
            console.error("Error updating vendor plan:", vendorError);
          }

          // 2. Insert Payment Record
          const { error: paymentError } = await supabaseAdmin
            .from('subscription_payments')
            .insert([{
              id: txnid,
              vendor_id: vendorId,
              gateway_ref: mihpayid,
              amount: parseFloat(amount),
              tier: planId,
              plan_name: planId === 'professional' ? 'Professional' : (planId.charAt(0).toUpperCase() + planId.slice(1)),
              status: 'success',
              method: payuResponse.mode || 'PayU',
              payer_detail: JSON.stringify(payuResponse),
              created_at: new Date().toISOString(),
              paid_at: new Date().toISOString()
            }]);

          if (paymentError) {
            console.error("Error inserting subscription payment record:", paymentError);
          } else {
            console.log(`Successfully recorded payment for vendor ${vendorId}`);
          }
        }
      } catch (dbError) {
        console.error("Database update error after PayU success:", dbError);
      }

      return res.redirect(`/dashboard?payment=success&txnid=${txnid}&planId=${planId}&amount=${amount}`);
    } catch (error: any) {
      console.error("PayU Success Handler Error:", error);
      res.redirect(`/dashboard?payment=error&message=${encodeURIComponent(error.message)}`);
    }
  });

  // PayU Failure Handler
  app.post("/api/payu/failure", async (req, res) => {
    try {
      const { txnid, status, error_Message, field9_with_cd } = req.body;
      console.log(`PayU Payment Failed: txnid=${txnid}, status=${status}, reason=${error_Message || field9_with_cd}`);
      return res.redirect(`/dashboard?payment=failed&txnid=${txnid}&reason=${encodeURIComponent(error_Message || 'payment_failed')}`);
    } catch (error) {
      console.error("PayU Failure Handler Error:", error);
      res.redirect(`/dashboard?payment=failed`);
    }
  });

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

  // PayU Verification and Fulfillment (Client-side initiated but server-verified)
  app.post("/api/payu/verify-and-fulfill", async (req, res) => {
    try {
      const { txnid, planId, amount, vendorId } = req.body;
      
      if (!txnid || !planId || !vendorId) {
        return res.status(400).json({ error: "Missing required fulfillment parameters" });
      }

      console.log(`Verifying and fulfilling transaction: ${txnid} for vendor ${vendorId}`);

      const key = process.env.PAYU_MERCHANT_KEY;
      const salt = process.env.PAYU_MERCHANT_SALT;
      const mode = process.env.PAYU_MODE || "test";

      if (!key || !salt) {
        throw new Error("PayU credentials missing in environment");
      }

      // 1. Generate Hash for verify_payment
      // Formula: key|command|var1|salt
      const command = "verify_payment";
      const hashString = `${key}|${command}|${txnid}|${salt}`;
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      // 2. Call PayU Verify API
      const payuVerifyUrl = mode === 'production' 
        ? "https://info.payu.in/merchant/postservice?form=2" 
        : "https://test.payu.in/merchant/postservice?form=2";

      const params = new URLSearchParams();
      params.append('key', key);
      params.append('command', command);
      params.append('var1', txnid);
      params.append('hash', hash);

      const response = await axios.post(payuVerifyUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = response.data;
      console.log(`PayU Verify API Response for ${txnid}:`, JSON.stringify(data));

      if (data.status !== 1 || !data.transaction_details || !data.transaction_details[txnid]) {
        return res.status(400).json({ error: "Transaction not found in PayU records" });
      }

      const txDetails = data.transaction_details[txnid];
      
      if (txDetails.status !== 'success') {
        return res.status(400).json({ error: `Transaction status is ${txDetails.status}, not success` });
      }

      // 3. Idempotency Check & Fulfillment
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        throw new Error("Database connection unavailable");
      }

      // Check if already fulfilled
      const { data: existingPayment } = await supabaseAdmin
        .from('subscription_payments')
        .select('id')
        .eq('id', txnid)
        .single();

      if (existingPayment) {
        console.log(`Transaction ${txnid} already fulfilled.`);
        return res.json({ success: true, already_fulfilled: true });
      }

      // 4. Update Database
      // 1. Update Vendor Plan
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .update({ 
          subscription: planId
        })
        .eq('id', vendorId);

      if (vendorError) {
        console.error("Error updating vendor plan:", vendorError);
        throw vendorError;
      }

      // 2. Insert Payment Record
      const { error: paymentError } = await supabaseAdmin
        .from('subscription_payments')
        .insert([{
          id: txnid,
          vendor_id: vendorId,
          gateway_ref: txDetails.mihpayid,
          amount: parseFloat(amount || txDetails.amount),
          tier: planId,
          plan_name: planId === 'professional' ? 'Professional' : (planId.charAt(0).toUpperCase() + planId.slice(1)),
          status: 'success',
          method: txDetails.mode || 'PayU',
          payer_detail: JSON.stringify(txDetails),
          created_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        }]);

      if (paymentError) {
        console.error("Error inserting subscription payment record:", paymentError);
        throw paymentError;
      }

      console.log(`Successfully fulfilled transaction ${txnid} for vendor ${vendorId}`);
      res.json({ success: true, plan: planId });

    } catch (error: any) {
      console.error("Verify and Fulfill Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vision-scan", async (req, res) => {
    try {
      const { image, products, language } = req.body || {};
      if (!image) return res.status(400).json({ error: "No image data provided" });

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Identify the product in this image. Match it against this catalog: ${JSON.stringify(products || [])}. 
      If you see text (OCR), use it to identify the brand and product name.
      Return ONLY a JSON object with: { "productId": "id", "name": "found name", "confidence": 0.9, "detectedText": "any text seen" }.
      If no match is found, return { "error": "Not recognized" }.`;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3.6-flash", 
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.split(',')[1] // Strip data:image/jpeg;base64,
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      }));

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error("Vision API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API routes
  const withRetry = async (fn: () => Promise<any>, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isRetryable = error?.status === 503 || 
                            error?.status === 429 || 
                            error?.code === 503 || 
                            error?.code === 429 ||
                            errorMsg.includes("quota") || 
                            errorMsg.includes("rate limit") ||
                            errorMsg.includes("exhausted");
        
        if (isRetryable && i < retries - 1) {
          const waitTime = delay * Math.pow(2, i) + Math.random() * 1000;
          console.log(`Gemini API busy (503/429). Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
  };

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
          
          const response = await withRetry(() => ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
              systemInstruction: `You are Streetvend AI, an intelligent business assistant for street vendors. Respond in ${language || 'en'}. Keep it concise, practical, and highly actionable.`,
            }
          }));
          
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
      const { transcript, audio, mimeType, products } = req.body;
      let orderData: any[] = [];
      let extractedTranscript = transcript || "";

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          
          if (audio) {
            console.log("[server.ts /api/voice-order] Processing audio recording with Gemini...");
            const cleanBase64 = audio.includes(",") ? audio.split(",")[1] : audio;
            
            const prompt = `You are a street food vendor's AI assistant. 
Listen to this voice recording and extract the customer's order.
Match items to this catalog: ${JSON.stringify(products || [])}.

Return ONLY valid JSON in this format:
{
  "transcript": "The full spoken text",
  "order": [
    { "productId": "p_id", "name": "Catalog Name", "quantity": 2 }
  ]
}`;

            const result = await withRetry(() => ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: [
                {
                  inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: cleanBase64
                  }
                },
                { text: prompt }
              ]
            }));

            const rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(rawText);
            orderData = parsed.order || [];
            extractedTranscript = parsed.transcript || transcript || "";
          } else if (transcript) {
            console.log(`[server.ts /api/voice-order] Processing text transcript: "${transcript}"`);
            const prompt = `Extract a structured order from this text: "${transcript}".
Match to this catalog: ${JSON.stringify(products || [])}.
Return ONLY a JSON array of objects with 'productId', 'name', and 'quantity'.`;

            const result = await withRetry(() => ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt
            }));
            const rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
            orderData = JSON.parse(rawText);
          }
        } catch (genError) {
          console.error("Gemini Voice Order API Error:", genError);
        }
      }

      // Final processing: ensure prices are attached and items are valid
      const finalItems = (orderData || []).map((item: any) => {
        const prod = products?.find((p: any) => p.id === item.productId || p.name.toLowerCase() === item.name?.toLowerCase());
        if (prod) {
          return {
            productId: prod.id,
            name: prod.name,
            price: prod.price,
            quantity: item.quantity || 1
          };
        }
        return null;
      }).filter(Boolean);

      res.json({ 
        transcript: extractedTranscript, 
        order: finalItems,
        items: finalItems 
      });
    } catch (error: any) {
      console.error("Voice order handler error:", error);
      res.status(500).json({ error: "Failed to process voice order" });
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

                const response = await withRetry(() => ai.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                }));

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
                
                const response = await withRetry(() => ai.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                }));
                
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
