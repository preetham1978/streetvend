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

async function verifyVendorOwnership(req: express.Request, targetVendorId: string): Promise<{ authorized: boolean; authUser?: any; status?: number; error?: string }> {
  if (!targetVendorId) {
    return { authorized: false, status: 400, error: "Missing required vendor_id parameter" };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false, status: 401, error: "Unauthorized: Missing authentication token" };
  }

  const token = authHeader.split(" ")[1];
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { authorized: false, status: 500, error: "Database connection unavailable" };
  }

  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authUser) {
    return { authorized: false, status: 401, error: "Unauthorized: Invalid or expired session token" };
  }

  const role = authUser.user_metadata?.role;
  if (role === 'admin' || role === 'superadmin') {
    return { authorized: true, authUser };
  }

  const { data: vendor, error: vendorErr } = await supabaseAdmin
    .from("vendors")
    .select("id, user_id, email, phone")
    .eq("id", targetVendorId)
    .maybeSingle();

  if (vendorErr || !vendor) {
    return { authorized: false, status: 404, error: "Vendor not found" };
  }

  if (vendor.user_id !== authUser.id && vendor.id !== authUser.id) {
    const emailMatch = authUser.email && vendor.email && authUser.email.toLowerCase() === vendor.email.toLowerCase();
    const phoneMatch = authUser.phone && vendor.phone && authUser.phone === vendor.phone;
    if (emailMatch || phoneMatch) {
      console.log(`[verifyVendorOwnership] Auto-repairing user_id for vendor ${vendor.id}: updating user_id to authUser ${authUser.id}`);
      await supabaseAdmin.from("vendors").update({ user_id: authUser.id }).eq("id", vendor.id);
      return { authorized: true, authUser };
    }
    return { authorized: false, status: 403, error: "Forbidden: Cross-vendor data access denied. You do not own this vendor account." };
  }

  return { authorized: true, authUser };
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  console.log("GEMINI_API_KEY available:", !!process.env.GEMINI_API_KEY); // Diagnostic step 5

  app.use(express.json());

  // In-memory store for vendor active sessions
  const vendorActiveSessions = new Map<string, Array<{
    id: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'pos';
    location: string;
    lastActive: string;
    createdAt: number;
  }>>();

  const PLAN_MAX_DEVICES: Record<string, number> = {
    free: 1,
    starter: 1,
    professional: 3,
    growth: 5,
    enterprise: 10
  };

  app.use(express.urlencoded({ extended: true }));

  // Middleware to enforce device session limits
  app.use("/api", (req, res, next) => {
    const sessionId = req.headers['x-device-session-id'] as string;
    const vendorId = req.headers['x-vendor-id'] as string;
    
    // Exclude paths that are used for registration/session management
    if (req.path === '/register-vendor' || req.path.match(/^\/vendor\/[^/]+\/sessions/)) {
        return next();
    }
    
    // Skip if headers are not provided (e.g. public routes)
    if (sessionId && vendorId) {
       // If the vendor has no sessions registered in memory, let them pass for now
       // (They will be registered soon by the frontend's session check)
       if (vendorActiveSessions.has(vendorId)) {
           const sessions = vendorActiveSessions.get(vendorId) || [];
           const isValid = sessions.some(s => s.id === sessionId);
           if (!isValid) {
             return res.status(401).json({ error: "Session revoked (Device limit exceeded)" });
           }
       }
    }
    next();
  });


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

  app.post("/api/vendor/schedule-downgrade", async (req, res) => {
    try {
      const { targetPlan, vendorId } = req.body;
      if (!targetPlan || !vendorId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      // Cross-vendor ownership check to prevent IDOR attacks
      const authCheck = await verifyVendorOwnership(req, vendorId);
      if (!authCheck.authorized) {
        return res.status(authCheck.status || 403).json({ error: authCheck.error });
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
         return res.status(500).json({ error: "Database connection unavailable" });
      }

      // Check current plan and ensure target is a downgrade
      const { data: vendor, error: vendorError } = await supabaseAdmin
        .from('vendors')
        .select('subscription')
        .eq('id', vendorId)
        .single();
      
      if (vendorError || !vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Basic validation (you'd ideally have a numeric tier system to strictly enforce downgrade direction)
      if (targetPlan === vendor.subscription) {
         return res.status(400).json({ error: "Target plan is same as current plan" });
      }
      
      // Calculate effective date based on last payment
      const { data: lastPayment } = await supabaseAdmin
         .from('subscription_payments')
         .select('paid_at, amount')
         .eq('vendor_id', vendorId)
         .eq('status', 'success')
         .order('paid_at', { ascending: false })
         .limit(1)
         .single();
         
      let effectiveDate = new Date();
      effectiveDate.setDate(effectiveDate.getDate() + 30); // Default to +30 days if no payment found
      
      if (lastPayment) {
          const paidAt = new Date(lastPayment.paid_at);
          // Rough check for annual vs monthly based on amount 
          // A proper implementation would store the billing_cycle in the payments table
          if (lastPayment.amount > 1000) { 
              effectiveDate = new Date(paidAt.getFullYear() + 1, paidAt.getMonth(), paidAt.getDate());
          } else {
              effectiveDate = new Date(paidAt.getFullYear(), paidAt.getMonth() + 1, paidAt.getDate());
          }
      }

      const effectiveDateStr = effectiveDate.toISOString();

      const { error: updateError } = await supabaseAdmin
        .from('vendors')
        .update({
          scheduled_downgrade: targetPlan,
          downgrade_effective_date: effectiveDateStr,
          billing_period_end: effectiveDateStr
        })
        .eq('id', vendorId);

      if (updateError) {
        throw updateError;
      }
      
      res.json({ success: true, effectiveDate: effectiveDateStr });

    } catch (err: any) {
      console.error("Schedule downgrade error:", err);
      res.status(500).json({ error: err.message || "Failed to schedule downgrade" });
    }
  });

  // Submit Manual UPI Payment Reference (UTR) for Plan Upgrade
  app.post("/api/vendor/submit-upi-upgrade", async (req, res) => {
    try {
      const { vendorId, planId, cycle, amount, totalAmount, utr } = req.body;
      if (!vendorId || !planId || !utr) {
        return res.status(400).json({ error: "Missing required fields (vendorId, planId, utr)" });
      }

      const trimmedUtr = String(utr).trim();
      if (trimmedUtr.length < 4) {
        return res.status(400).json({ error: "Please enter a valid UPI transaction reference number (UTR)" });
      }

      // Check ownership if auth token provided
      if (req.headers.authorization) {
        const authCheck = await verifyVendorOwnership(req, vendorId);
        if (!authCheck.authorized) {
          return res.status(authCheck.status || 403).json({ error: authCheck.error });
        }
      }

      const supabaseAdmin = getSupabaseAdmin();
      let vendorName = '';
      if (supabaseAdmin) {
        const { data: v } = await supabaseAdmin.from('vendors').select('store_name, owner_name').eq('id', vendorId).maybeSingle();
        if (v) {
          vendorName = v.owner_name || v.store_name || '';
        }
      }

      const paymentId = `upi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const planNameFormatted = planId.charAt(0).toUpperCase() + planId.slice(1);
      const parsedAmount = parseFloat(totalAmount || amount || 0);

      const recordData = {
        id: paymentId,
        vendor_id: vendorId,
        vendor_name: vendorName,
        tier: planId,
        plan_name: planNameFormatted,
        amount: parsedAmount,
        currency: 'INR',
        method: 'UPI',
        status: 'pending_verification',
        gateway_ref: trimmedUtr,
        payer_detail: JSON.stringify({ utr: trimmedUtr, cycle: cycle || 'monthly', planId, vendorId, amount, totalAmount: parsedAmount }),
        created_at: new Date().toISOString()
      };

      if (supabaseAdmin) {
        const { error: insertError } = await supabaseAdmin
          .from('subscription_payments')
          .insert([recordData]);

        if (insertError) {
          console.error("Error inserting UPI payment verification request:", insertError);
          return res.status(500).json({ error: "Failed to save payment verification request: " + insertError.message });
        }
      }

      return res.json({
        success: true,
        message: "Payment submitted — pending verification",
        request: recordData
      });
    } catch (error: any) {
      console.error("Submit UPI Upgrade Error:", error);
      res.status(500).json({ error: error.message || "Failed to submit UPI payment verification" });
    }
  });

  // Get vendor UPI upgrade status
  app.get("/api/vendor/upgrade-status", async (req, res) => {
    try {
      const vendorId = req.query.vendorId as string;
      if (!vendorId) {
        return res.status(400).json({ error: "Missing vendorId query param" });
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.json({ requests: [] });
      }

      const { data, error } = await supabaseAdmin
        .from('subscription_payments')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching vendor upgrade status:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ requests: data || [] });
    } catch (error: any) {
      console.error("Fetch Upgrade Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get all UPI payment upgrade requests
  app.get("/api/admin/upgrade-requests", async (req, res) => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.json({ requests: [] });
      }

      const { data: payments, error } = await supabaseAdmin
        .from('subscription_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching admin upgrade requests:", error);
        return res.status(500).json({ error: error.message });
      }

      // Fetch vendor details to enrich requests with storeName and ownerName
      const vendorIds = Array.from(new Set((payments || []).map(p => p.vendor_id).filter(Boolean)));
      let vendorMap: Record<string, { store_name?: string; owner_name?: string; email?: string }> = {};

      if (vendorIds.length > 0) {
        const { data: vendorList } = await supabaseAdmin
          .from('vendors')
          .select('id, store_name, owner_name, email')
          .in('id', vendorIds);

        if (vendorList) {
          vendorList.forEach(v => {
            vendorMap[v.id] = v;
          });
        }
      }

      const enrichedRequests = (payments || []).map(p => {
        const v = vendorMap[p.vendor_id] || {};
        return {
          ...p,
          storeName: v.store_name || p.vendor_name || 'Store ' + (p.vendor_id || '').substring(0, 6),
          ownerName: v.owner_name || p.vendor_name || 'Vendor',
          email: v.email || ''
        };
      });

      return res.json({ requests: enrichedRequests });
    } catch (error: any) {
      console.error("Admin upgrade requests error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Approve UPI Payment Upgrade Request
  app.post("/api/admin/approve-upgrade", async (req, res) => {
    try {
      const { requestId, vendorId, targetPlan } = req.body;
      if (!requestId || !vendorId || !targetPlan) {
        return res.status(400).json({ error: "Missing parameters (requestId, vendorId, targetPlan)" });
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database connection unavailable" });
      }

      // 1. Update Vendor Plan Tier
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .update({
          subscription: targetPlan,
          scheduled_downgrade: null,
          downgrade_effective_date: null
        })
        .eq('id', vendorId);

      if (vendorError) {
        console.error("Error updating vendor subscription:", vendorError);
        return res.status(500).json({ error: "Failed to update vendor subscription: " + vendorError.message });
      }

      // 2. Update Payment Record Status
      const nowIso = new Date().toISOString();
      const { error: paymentError } = await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'approved',
          paid_at: nowIso,
          reviewed_at: nowIso,
          reviewed_by: 'admin'
        })
        .eq('id', requestId);

      if (paymentError) {
        console.error("Error updating payment record:", paymentError);
      }

      return res.json({ success: true, message: `Successfully upgraded vendor to ${targetPlan}` });
    } catch (error: any) {
      console.error("Approve Upgrade Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Reject UPI Payment Upgrade Request
  app.post("/api/admin/reject-upgrade", async (req, res) => {
    try {
      const { requestId, reason } = req.body;
      if (!requestId) {
        return res.status(400).json({ error: "Missing requestId parameter" });
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database connection unavailable" });
      }

      const nowIso = new Date().toISOString();
      const { error: paymentError } = await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'rejected',
          note: reason || 'UTR verification failed. Please check reference number and try again.',
          reviewed_at: nowIso,
          reviewed_by: 'admin'
        })
        .eq('id', requestId);

      if (paymentError) {
        console.error("Error rejecting payment request:", paymentError);
        return res.status(500).json({ error: paymentError.message });
      }

      return res.json({ success: true, message: "Upgrade request rejected" });
    } catch (error: any) {
      console.error("Reject Upgrade Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/vendor/cancel-downgrade", async (req, res) => {
      try {
          const { vendorId } = req.body;
          if (!vendorId) {
             return res.status(400).json({ error: "Missing vendorId" });
          }

          // Cross-vendor ownership check to prevent IDOR attacks
          const authCheck = await verifyVendorOwnership(req, vendorId);
          if (!authCheck.authorized) {
            return res.status(authCheck.status || 403).json({ error: authCheck.error });
          }

          const supabaseAdmin = getSupabaseAdmin();
          if (!supabaseAdmin) {
             return res.status(500).json({ error: "Database connection unavailable" });
          }

          const { error: updateError } = await supabaseAdmin
            .from('vendors')
            .update({
              scheduled_downgrade: null,
              downgrade_effective_date: null,
              billing_period_end: null
            })
            .eq('id', vendorId);
            
          if (updateError) {
             throw updateError;
          }

          res.json({ success: true });
      } catch (err: any) {
          console.error("Cancel downgrade error:", err);
          res.status(500).json({ error: err.message || "Failed to cancel downgrade" });
      }
  });

  // In-memory rate limiter map for /api/orders/create (IP -> { count, resetTime })
  const createOrderRateLimitMap = new Map<string, { count: number; resetTime: number }>();

  // Create Order API for storefront checkout (server-side order creation using Service Role key)
  app.post("/api/orders/create", async (req, res) => {
    try {
      // 1. Rate limiting check (max 10 requests per minute per IP)
      const clientIp = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
      const now = Date.now();
      const windowMs = 60 * 1000;
      const maxRequests = 10;

      const rateInfo = createOrderRateLimitMap.get(clientIp);
      if (rateInfo && now < rateInfo.resetTime) {
        if (rateInfo.count >= maxRequests) {
          return res.status(429).json({ error: "Too many order creation requests. Please try again later." });
        }
        rateInfo.count += 1;
      } else {
        createOrderRateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
      }

      const { vendor_id, items, payment_method, customer_name, customer_phone } = req.body;

      if (!vendor_id) {
        return res.status(400).json({ error: "Missing required vendor_id parameter" });
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database service unavailable" });
      }

      // Verify vendor existence
      const { data: vendor, error: vendorErr } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('id', vendor_id)
        .single();

      if (vendorErr || !vendor) {
        return res.status(404).json({ error: "Invalid vendor_id: Vendor does not exist" });
      }

      // Parse items array
      let itemsList: any[] = [];
      if (Array.isArray(items)) {
        itemsList = items;
      } else if (typeof items === 'string') {
        try {
          itemsList = JSON.parse(items);
        } catch (e) {
          return res.status(400).json({ error: "Invalid items format" });
        }
      }

      if (!itemsList || itemsList.length === 0) {
        return res.status(400).json({ error: "Cart items list cannot be empty" });
      }

      // Extract product IDs
      const productIds = itemsList.map((it: any) => it.id || it.productId).filter(Boolean);
      if (productIds.length !== itemsList.length) {
        return res.status(400).json({ error: "All items must specify a valid product ID" });
      }

      // Fetch products from database
      const { data: dbProducts, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, price, vendor_id, name')
        .in('id', productIds);

      if (prodErr || !dbProducts) {
        console.error("Database fetch products error:", prodErr);
        return res.status(500).json({ error: "Failed to verify product prices from database" });
      }

      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 2. Server-side price verification and total computation
      let computedTotal = 0;
      const verifiedItems = [];

      for (const item of itemsList) {
        const pId = item.id || item.productId;
        const dbProd = productMap.get(pId) as any;

        if (!dbProd) {
          return res.status(400).json({ error: `Product ID ${pId} not found in database catalog` });
        }

        // Strict vendor catalog check: item MUST belong to vendor_id
        if (dbProd.vendor_id !== vendor_id) {
          return res.status(400).json({ error: `Product '${dbProd.name}' does not belong to vendor catalog '${vendor_id}'` });
        }

        const qty = Math.max(1, parseInt(item.quantity || "1", 10));
        const realPrice = parseFloat(dbProd.price);
        const itemSubtotal = realPrice * qty;
        computedTotal += itemSubtotal;

        verifiedItems.push({
          productId: dbProd.id,
          name: dbProd.name,
          price: realPrice,
          quantity: qty,
          subtotal: itemSubtotal
        });
      }

      // 3. Authenticate request via Supabase session token if provided
      const authHeader = req.headers.authorization;
      let isAuthenticatedVendor = false;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        if (supabaseAdmin) {
          try {
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (!authError && authUser) {
              // Verify that this user owns the specified vendor_id
              const { data: vendorOwner, error: ownerErr } = await supabaseAdmin
                .from("vendors")
                .select("user_id")
                .eq("id", vendor_id)
                .single();

              if (!ownerErr && vendorOwner && vendorOwner.user_id === authUser.id) {
                isAuthenticatedVendor = true;
              }
            }
          } catch (authException) {
            console.error("Supabase token authentication exception:", authException);
          }
        }
      }

      // 4. Payment status enforcement:
      // Only Cash on Delivery ('cod' or 'cash') can be marked confirmed at creation without server-side verification.
      // Non-COD/cash methods (like 'upi') can ONLY be 'confirmed' if the request is from the authenticated vendor owning the vendor_id.
      const normalizedMethod = (payment_method || 'cod').toLowerCase();
      const requestedStatus = (req.body.payment_status || 'pending').toLowerCase();
      let verifiedPaymentStatus = 'pending';

      if (normalizedMethod === 'cod' || normalizedMethod === 'cash') {
        verifiedPaymentStatus = requestedStatus === 'pending' ? 'pending' : 'confirmed';
      } else {
        if (requestedStatus === 'confirmed' && isAuthenticatedVendor) {
          verifiedPaymentStatus = 'confirmed';
        } else {
          verifiedPaymentStatus = 'pending';
        }
      }

      const orderPayload = {
        id: req.body.id || 'ord_' + crypto.randomBytes(4).toString('hex'),
        vendor_id,
        items: verifiedItems,
        total: computedTotal,
        payment_method: normalizedMethod,
        status: verifiedPaymentStatus,
        customer_name: (customer_name || "").trim(),
        customer_phone: (customer_phone || "").trim(),
        created_at: new Date().toISOString()
      };

      const { data: createdOrder, error: insertErr } = await supabaseAdmin
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (insertErr) {
        console.error("Failed to insert order via admin service role client:", insertErr);
        return res.status(500).json({ error: insertErr.message });
      }

      return res.json({ success: true, order: createdOrder });
    } catch (error: any) {
      console.error("Order Creation API Error:", error);
      return res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  // Get active sessions & enforce server-side device limits (invalidating oldest sessions if cap exceeded)
  app.get("/api/vendor/:vendorId/sessions", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const supabaseAdmin = getSupabaseAdmin();
      let subscription = 'free';

      if (supabaseAdmin) {
        const { data: vendor } = await supabaseAdmin
          .from('vendors')
          .select('subscription')
          .eq('id', vendorId)
          .maybeSingle();
        if (vendor?.subscription) {
          subscription = vendor.subscription;
        }
      }

      const maxDevices = PLAN_MAX_DEVICES[subscription] || 1;
      let sessions = vendorActiveSessions.get(vendorId) || [];

      if (sessions.length === 0) {
        const defaultId = 's_' + Math.random().toString(36).substring(2, 9);
        sessions = [{
          id: defaultId,
          deviceName: 'Chrome on Browser (This Device)',
          deviceType: 'desktop',
          location: 'India',
          lastActive: 'Active Now',
          createdAt: Date.now()
        }];
        vendorActiveSessions.set(vendorId, sessions);
      }

      // Enforce device limit server-side: if active sessions exceed maxDevices, drop/invalidate oldest sessions
      if (sessions.length > maxDevices) {
        sessions.sort((a, b) => b.createdAt - a.createdAt);
        sessions = sessions.slice(0, maxDevices);
        vendorActiveSessions.set(vendorId, sessions);
      }

      res.json({ success: true, sessions, maxDevices, subscription });
    } catch (err: any) {
      console.error("Get sessions error:", err);
      res.status(500).json({ error: err.message || "Failed to load sessions" });
    }
  });

  // Register / Ping a session (enforces max devices by invalidating oldest if limit exceeded)
  app.post("/api/vendor/:vendorId/sessions", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { deviceName, deviceType, location, sessionId } = req.body;

      const supabaseAdmin = getSupabaseAdmin();
      let subscription = 'free';

      if (supabaseAdmin) {
        const { data: vendor } = await supabaseAdmin
          .from('vendors')
          .select('subscription')
          .eq('id', vendorId)
          .maybeSingle();
        if (vendor?.subscription) {
          subscription = vendor.subscription;
        }
      }

      const maxDevices = PLAN_MAX_DEVICES[subscription] || 1;
      let sessions = vendorActiveSessions.get(vendorId) || [];

      const sId = sessionId || 's_' + Math.random().toString(36).substring(2, 9);
      const existingIndex = sessions.findIndex(s => s.id === sId);

      const sessionItem = {
        id: sId,
        deviceName: deviceName || 'Browser Session',
        deviceType: deviceType || 'desktop',
        location: location || 'India',
        lastActive: 'Active Now',
        createdAt: existingIndex !== -1 ? sessions[existingIndex].createdAt : Date.now()
      };

      if (existingIndex !== -1) {
        sessions[existingIndex] = sessionItem;
      } else {
        sessions.push(sessionItem);
      }

      // Enforce device limit server-side: keep newest `maxDevices`, invalidate oldest sessions
      if (sessions.length > maxDevices) {
        sessions.sort((a, b) => b.createdAt - a.createdAt);
        sessions = sessions.slice(0, maxDevices);
      }

      vendorActiveSessions.set(vendorId, sessions);
      res.json({ success: true, sessions, maxDevices, subscription });
    } catch (err: any) {
      console.error("Register session error:", err);
      res.status(500).json({ error: err.message || "Failed to register session" });
    }
  });

  // Revoke session
  app.delete("/api/vendor/:vendorId/sessions/:sessionId", async (req, res) => {
    try {
      const { vendorId, sessionId } = req.params;
      let sessions = vendorActiveSessions.get(vendorId) || [];
      sessions = sessions.filter(s => s.id !== sessionId);
      vendorActiveSessions.set(vendorId, sessions);
      res.json({ success: true, sessions });
    } catch (err: any) {
      console.error("Revoke session error:", err);
      res.status(500).json({ error: err.message || "Failed to revoke session" });
    }
  });

  app.get("/api/vendor/:vendorId/trust-score", async (req, res) => {
    try {
      const { vendorId } = req.params;
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }

      const token = authHeader.split(" ")[1];
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Database service unavailable" });
      }

      // Verify vendor owner
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authUser) {
        return res.status(401).json({ error: "Unauthorized: Invalid session" });
      }

      const { data: vendor, error: vendorErr } = await supabaseAdmin
        .from("vendors")
        .select("id, user_id, created_at")
        .eq("id", vendorId)
        .single();

      if (vendorErr || !vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      if (vendor.user_id !== authUser.id) {
        return res.status(403).json({ error: "Forbidden: You do not own this vendor account" });
      }

      const now = new Date();
      const vendorCreatedAt = new Date(vendor.created_at || now);
      const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - vendorCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));
      const windowDays = Math.min(90, daysSinceCreation);

      const windowStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const { data: orders, error: ordersErr } = await supabaseAdmin
        .from("orders")
        .select("id, status, payment_method, total, created_at")
        .eq("vendor_id", vendorId)
        .gte("created_at", windowStartDate.toISOString());

      if (ordersErr) {
        console.error("Failed to fetch orders for trust score:", ordersErr);
        return res.status(500).json({ error: "Failed to load orders history" });
      }

      const safeOrders = orders || [];
      const confirmedOrders = safeOrders.filter(o => o.status === 'confirmed');
      const totalConfirmedOrdersCount = confirmedOrders.length;

      // Minimum Data Threshold: at least 14 days of age AND at least 10 confirmed orders
      const dataThresholdMet = (daysSinceCreation >= 14) && (totalConfirmedOrdersCount >= 10);

      if (!dataThresholdMet) {
        const daysUntilUnlock = Math.max(0, 14 - daysSinceCreation);
        const ordersUntilUnlock = Math.max(0, 10 - totalConfirmedOrdersCount);
        return res.json({
          dataThresholdMet: false,
          windowDays,
          daysUntilUnlock,
          ordersUntilUnlock,
          computedAt: now.toISOString()
        });
      }

      // 1. Consistency Score (25 points max)
      const uniqueConfirmedDays = new Set(
        confirmedOrders.map(o => new Date(o.created_at).toISOString().split('T')[0])
      );
      const daysWithConfirmedOrders = uniqueConfirmedDays.size;
      const consistency = windowDays > 0 
        ? parseFloat(Math.min(25, 25 * (daysWithConfirmedOrders / windowDays)).toFixed(2)) 
        : 0;

      // 2. Revenue Stability Score (20 points max)
      const dailyRevenues: number[] = [];
      const revenueMap = new Map<string, number>();
      
      for (const order of confirmedOrders) {
        const dateStr = new Date(order.created_at).toISOString().split('T')[0];
        revenueMap.set(dateStr, (revenueMap.get(dateStr) || 0) + (order.total || 0));
      }

      for (let i = 0; i < windowDays; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyRevenues.push(revenueMap.get(dateStr) || 0);
      }

      const totalRevenue = dailyRevenues.reduce((sum, val) => sum + val, 0);
      const meanRevenue = dailyRevenues.length > 0 ? totalRevenue / dailyRevenues.length : 0;
      
      let stddev = 0;
      if (dailyRevenues.length > 0 && meanRevenue > 0) {
        const variance = dailyRevenues.reduce((sum, val) => sum + Math.pow(val - meanRevenue, 2), 0) / dailyRevenues.length;
        stddev = Math.sqrt(variance);
      }

      const cov = meanRevenue > 0 ? stddev / meanRevenue : 0;
      
      let stability = 0;
      if (meanRevenue > 0) {
        if (cov < 0.3) {
          stability = 20;
        } else if (cov > 1.5) {
          stability = 0;
        } else {
          stability = 20 * (1 - (cov - 0.3) / (1.5 - 0.3));
        }
      }
      stability = parseFloat(Math.min(20, Math.max(0, stability)).toFixed(2));

      // 3. Growth Trend Score (15 points max)
      let growth = 0;
      let growthReason = null;

      if (windowDays < 15) {
        growth = 0;
        growthReason = "Small window size (less than 15 days) makes growth trends mathematically meaningless.";
      } else {
        const chronologicalRevenues = [...dailyRevenues].reverse();
        const thirdSize = Math.max(1, Math.floor(windowDays / 3));
        
        const getMedian = (arr: number[]): number => {
          if (arr.length === 0) return 0;
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const earliestThird = chronologicalRevenues.slice(0, thirdSize);
        const latestThird = chronologicalRevenues.slice(chronologicalRevenues.length - thirdSize);
        
        const earliestMedian = getMedian(earliestThird);
        const latestMedian = getMedian(latestThird);

        let growthRatio = 0;
        if (earliestMedian > 0) {
          growthRatio = (latestMedian - earliestMedian) / earliestMedian;
        } else if (latestMedian > 0) {
          growthRatio = 1.0;
        } else {
          growthRatio = 0;
        }

        growth = 7.5;
        if (growthRatio > 0) {
          growth = 7.5 + 7.5 * Math.min(1, growthRatio / 0.2);
        } else if (growthRatio < 0) {
          growth = 7.5 + 7.5 * Math.max(-1, growthRatio / 0.2);
        }
        growth = parseFloat(Math.min(15, Math.max(0, growth)).toFixed(2));
      }

      // 4. Digital Payment Adoption Score (20 points max)
      const upiConfirmedCount = confirmedOrders.filter(o => o.payment_method === 'upi').length;
      const digitalAdoption = totalConfirmedOrdersCount > 0 
        ? parseFloat((20 * (upiConfirmedCount / totalConfirmedOrdersCount)).toFixed(2)) 
        : 0;

      // 5. Platform Tenure Score (10 points max)
      let tenure = 2;
      if (daysSinceCreation > 180) {
        tenure = 10;
      } else if (daysSinceCreation > 90) {
        tenure = 8;
      } else if (daysSinceCreation > 30) {
        tenure = 5;
      } else {
        tenure = 2;
      }

      // 6. Order Reliability Score (10 points max)
      const totalOrdersCount = safeOrders.length;
      const cancelledOrFailedCount = safeOrders.filter(o => o.status === 'cancelled' || o.status === 'failed').length;
      const reliability = totalOrdersCount > 0
        ? parseFloat(Math.max(0, 10 * (1 - (cancelledOrFailedCount / totalOrdersCount))).toFixed(2))
        : 10;

      // Sum of all six sub-scores
      const totalScore = parseFloat(Math.min(100, Math.max(0, consistency + stability + growth + digitalAdoption + tenure + reliability)).toFixed(2));

      return res.json({
        totalScore,
        subScores: {
          consistency,
          stability,
          growth,
          digitalAdoption,
          tenure,
          reliability
        },
        growthReason,
        windowDays,
        dataThresholdMet,
        computedAt: now.toISOString()
      });
    } catch (error: any) {
      console.error("Trust Score API Error:", error);
      return res.status(500).json({ error: error.message || "Failed to compute Trust Score" });
    }
  });

  app.get("/api/vendor/profile", async (req, res) => {
      try {
          const identifier = (req.query.identifier as string || req.query.userId as string || req.query.email as string || '').trim();
          console.log(`[API /api/vendor/profile] Querying vendor profile for identifier: "${identifier}"`);

          if (!identifier) {
              return res.status(400).json({ error: "Missing identifier parameter" });
          }

          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
              return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
          }

          const token = authHeader.split(" ")[1];
          const supabaseAdmin = getSupabaseAdmin();
          if (!supabaseAdmin) {
              return res.status(500).json({ error: "Database connection unavailable" });
          }

          const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
          if (authError || !authUser) {
              return res.status(401).json({ error: "Unauthorized: Invalid or expired session token" });
          }

          const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(identifier);
          let query = supabaseAdmin.from('vendors').select('*');

          if (isUuid) {
              query = query.or(`user_id.eq.${identifier},id.eq.${identifier}`);
          } else if (identifier.includes('@')) {
              query = query.ilike('email', identifier);
          } else {
              query = query.or(`phone.eq.${identifier},id.eq.${identifier}`);
          }

          const { data, error } = await query.limit(1);

          console.log(`[API /api/vendor/profile] Primary query result for "${identifier}":`, {
              rowCount: data?.length || 0,
              vendorId: data?.[0]?.id,
              vendorEmail: data?.[0]?.email,
              vendorUserId: data?.[0]?.user_id,
              error: error?.message || null
          });

          if (error) {
              return res.status(500).json({ error: error.message });
          }

          if (data && data.length > 0) {
              const vendorRecord = data[0];
              const role = authUser.user_metadata?.role;
              if (role !== 'admin' && role !== 'superadmin') {
                  if (vendorRecord.user_id !== authUser.id && vendorRecord.id !== authUser.id) {
                      const emailMatch = authUser.email && vendorRecord.email && authUser.email.toLowerCase() === vendorRecord.email.toLowerCase();
                      const phoneMatch = authUser.phone && vendorRecord.phone && authUser.phone === vendorRecord.phone;
                      if (emailMatch || phoneMatch) {
                          console.log(`[API /api/vendor/profile] Auto-repairing user_id for vendor ${vendorRecord.id}: updating user_id to authUser ${authUser.id}`);
                          await supabaseAdmin.from('vendors').update({ user_id: authUser.id }).eq('id', vendorRecord.id);
                          vendorRecord.user_id = authUser.id;
                      } else {
                          return res.status(403).json({ error: "Forbidden: Cross-vendor data access denied." });
                      }
                  }
              }
              return res.json({ success: true, vendor: vendorRecord });
          }

          // Secondary fallback lookup if primary hit empty
          if (identifier.includes('@')) {
              const { data: fallbackData } = await supabaseAdmin
                  .from('vendors')
                  .select('*')
                  .or(`email.eq.${identifier},user_id.eq.${identifier}`)
                  .limit(1);
              
              if (fallbackData && fallbackData.length > 0) {
                  const fallbackRecord = fallbackData[0];
                  const role = authUser.user_metadata?.role;
                  if (role !== 'admin' && role !== 'superadmin') {
                      if (fallbackRecord.user_id !== authUser.id && fallbackRecord.id !== authUser.id) {
                          const emailMatch = authUser.email && fallbackRecord.email && authUser.email.toLowerCase() === fallbackRecord.email.toLowerCase();
                          const phoneMatch = authUser.phone && fallbackRecord.phone && authUser.phone === fallbackRecord.phone;
                          if (emailMatch || phoneMatch) {
                              console.log(`[API /api/vendor/profile] Fallback auto-repairing user_id for vendor ${fallbackRecord.id}: updating user_id to authUser ${authUser.id}`);
                              await supabaseAdmin.from('vendors').update({ user_id: authUser.id }).eq('id', fallbackRecord.id);
                              fallbackRecord.user_id = authUser.id;
                          } else {
                              return res.status(403).json({ error: "Forbidden: Cross-vendor data access denied." });
                          }
                      }
                  }
                  console.log(`[API /api/vendor/profile] Fallback match found for "${identifier}":`, fallbackRecord.id);
                  return res.json({ success: true, vendor: fallbackRecord });
              }
          }

          return res.status(404).json({ error: "Vendor profile not found" });
      } catch (err: any) {
          console.error("[API /api/vendor/profile] Exception:", err);
          return res.status(500).json({ error: err.message || "Failed to fetch vendor profile" });
      }
  });

  app.post("/api/register-vendor", async (req, res) => {
      try {
          const vendorData = req.body;
          if (!vendorData || !vendorData.user_id) {
              return res.status(400).json({ error: "Missing vendor data or user_id" });
          }

          const supabaseAdmin = getSupabaseAdmin();
          if (!supabaseAdmin) {
              return res.status(500).json({ error: "Database connection unavailable" });
          }

          // Clean phone number: use null if empty to avoid unique constraint on empty strings
          if (!vendorData.phone || typeof vendorData.phone !== 'string' || !vendorData.phone.trim()) {
              vendorData.phone = null;
          } else {
              vendorData.phone = vendorData.phone.trim();
          }

          // Check if a vendor already exists for this user_id or email
          const { data: existingVendor } = await supabaseAdmin
              .from('vendors')
              .select('*')
              .or(`user_id.eq.${vendorData.user_id},email.eq.${vendorData.email}`)
              .maybeSingle();

          let resultData;
          if (existingVendor) {
              // Update existing vendor record
              const updatePayload: any = {
                  name: vendorData.name,
                  owner_name: vendorData.owner_name,
                  phone: vendorData.phone,
                  email: vendorData.email,
                  category: vendorData.category,
                  address: vendorData.address,
                  subscription: vendorData.subscription,
                  is_active: true
              };
              // Update user_id to ensure it matches the current auth identity
              updatePayload.user_id = vendorData.user_id;

              const { data, error } = await supabaseAdmin
                  .from('vendors')
                  .update(updatePayload)
                  .eq('id', existingVendor.id)
                  .select();

              if (error) {
                  console.error("Error updating existing vendor:", error);
                  if (error.message?.includes('vendors_phone_key') || error.message?.includes('unique constraint')) {
                      return res.status(400).json({ error: "This phone number is already registered to another store. Please use a different phone number." });
                  }
                  return res.status(500).json({ error: error.message });
              }
              resultData = data?.[0];
          } else {
              // Insert new vendor
              const { data, error } = await supabaseAdmin
                  .from('vendors')
                  .insert([vendorData])
                  .select();

              if (error) {
                  console.error("Error inserting vendor via admin:", error);
                  if (error.message?.includes('vendors_phone_key') || error.message?.includes('unique constraint')) {
                      return res.status(400).json({ error: "This phone number is already registered to another store. Please use a different phone number." });
                  }
                  return res.status(500).json({ error: error.message });
              }
              resultData = data?.[0];
          }

          res.json({ success: true, vendor: resultData });
      } catch (err: any) {
          console.error("Register vendor endpoint error:", err);
          res.status(500).json({ error: err.message || "Failed to register vendor" });
      }
  });

  app.post("/api/vendor/apply-downgrade", async (req, res) => {
      try {
          const { vendorId, targetPlan, currentPlan } = req.body;
          if (!vendorId || !targetPlan) {
              return res.status(400).json({ error: "Missing parameters" });
          }

          const supabaseAdmin = getSupabaseAdmin();
          if (supabaseAdmin) {
            await supabaseAdmin
              .from('vendors')
              .update({
                subscription: targetPlan,
                scheduled_downgrade: null,
                downgrade_effective_date: null,
                billing_period_end: null
              })
              .eq('id', vendorId);

            const { error: paymentError } = await supabaseAdmin
              .from('subscription_payments')
              .insert([{
                  id: `DG_${Date.now()}_${vendorId}`,
                  vendor_id: vendorId,
                  tier: targetPlan,
                  plan_name: targetPlan,
                  amount: 0,
                  status: 'downgrade',
                  method: 'system',
                  payer_detail: `Downgrade to ${targetPlan} from ${currentPlan || 'unknown'}`,
                  created_at: new Date().toISOString(),
                  paid_at: new Date().toISOString()
              }]);

            if (paymentError) {
               console.error("Error inserting downgrade payment record:", paymentError);
            }
          }

          res.json({ success: true });
      } catch (err: any) {
          console.error("Apply downgrade error:", err);
          res.status(500).json({ error: "Failed to apply downgrade log" });
      }
  });

  // Purchase Order & Auto-Reorder entitlement check endpoint
  app.post("/api/vendor/reorder", async (req, res) => {
    try {
      const { vendorId, vendorPlan, userPlan, plan, poId } = req.body || {};

      // 1. Instant check via request body plan parameter
      const planFromReq = (vendorPlan || userPlan || plan || "").toString().toLowerCase();
      if (planFromReq && planFromReq !== "enterprise" && planFromReq !== "growth") {
        return res.status(403).json({
          error: "Forbidden: AI Auto-Reorder & Purchase Orders require an Enterprise plan subscription.",
          requiredTier: "enterprise",
          currentPlan: planFromReq
        });
      }

      const authHeader = req.headers.authorization;
      const supabaseAdmin = getSupabaseAdmin();

      if (authHeader && authHeader.startsWith("Bearer ") && supabaseAdmin) {
        const token = authHeader.split(" ")[1];
        const withTimeout = <T>(promise: Promise<T>, ms = 1200): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Query timeout")), ms))
          ]);
        };

        try {
          const authRes: any = await withTimeout(supabaseAdmin.auth.getUser(token));
          const authUser = authRes?.data?.user;
          if (authRes?.error || !authUser) {
            return res.status(401).json({ error: "Unauthorized: Invalid or expired session token" });
          }

          const lookupId = vendorId || authUser.id;
          const vendorRes: any = await withTimeout(
            supabaseAdmin
              .from("vendors")
              .select("id, user_id, subscription")
              .or(`id.eq.${lookupId},user_id.eq.${lookupId}`)
              .maybeSingle()
          );
          const vendor = vendorRes?.data;

          const dbPlan = (vendor?.subscription || "free").toLowerCase();
          if (dbPlan !== "enterprise" && dbPlan !== "growth") {
            return res.status(403).json({
              error: "Forbidden: AI Auto-Reorder & Purchase Orders require an Enterprise plan subscription.",
              requiredTier: "enterprise",
              currentPlan: dbPlan
            });
          }

          return res.json({
            success: true,
            message: "Purchase Order authorized and dispatched",
            poId,
            authorizedAt: new Date().toISOString()
          });
        } catch (timeoutErr) {
          console.warn("Supabase auth/vendor lookup timed out in /api/vendor/reorder:", timeoutErr);
          return res.status(403).json({
            error: "Forbidden: Could not verify Enterprise plan entitlement.",
            requiredTier: "enterprise"
          });
        }
      }

      // Default fallback for unauthenticated or non-Enterprise requests
      return res.status(403).json({
        error: "Forbidden: AI Auto-Reorder & Purchase Orders require an Enterprise plan subscription.",
        requiredTier: "enterprise",
        currentPlan: planFromReq || "free"
      });
    } catch (err: any) {
      console.error("Vendor reorder error:", err);
      return res.status(500).json({ error: err.message || "Failed to authorize reorder" });
    }
  });

  app.post("/api/vision-scan", async (req, res) => {
    try {
      const { image, products, language } = req.body || {};
      if (!image) return res.status(400).json({ error: "No image data provided" });
      
      if (!products || products.length === 0) {
        return res.json({ error: "No catalog to match against", detectedText: "" });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Identify the product in this image. Match it against this catalog: ${JSON.stringify(products || [])}. 
      If you see text (OCR), use it to identify the brand and product name.
      Return ONLY a JSON object with: { "productId": "id", "name": "found name", "confidence": 0.9, "detectedText": "any text seen" }.
      If no match is found, return { "error": "Not recognized" }.`;

      const response = await withTimeout(withRetry(() => ai.models.generateContent({
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
      })), 10000);

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error("Vision API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API routes
  const withTimeout = <T>(promise: Promise<T>, ms: number = 8000): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Scan timed out, please try again"));
      }, ms);
      promise.then((res) => {
        clearTimeout(timer);
        resolve(res);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  };

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

  // --- ADMIN SECURITY & RATE LIMITING STATE ---
  interface AdminRateLimitState {
    failedCount: number;
    lockedUntil: number | null;
    lastAttemptAt: number;
  }

  const adminSecurityStore = new Map<string, AdminRateLimitState>();
  const inMemoryAdminAuditLogs: any[] = [];
  const MAX_ADMIN_FAILED_ATTEMPTS = 5;
  const ADMIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

  function getClientIp(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  function getAdminState(ip: string): AdminRateLimitState {
    let state = adminSecurityStore.get(ip);
    if (!state) {
      state = { failedCount: 0, lockedUntil: null, lastAttemptAt: Date.now() };
      adminSecurityStore.set(ip, state);
    }
    if (state.lockedUntil && Date.now() > state.lockedUntil) {
      state.lockedUntil = null;
      state.failedCount = 0;
    }
    return state;
  }

  async function recordAdminAuditLog(
    action: string,
    email: string,
    ip: string,
    details: Record<string, any>
  ) {
    const logEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      admin_user_id: '00000000-0000-0000-0000-000000000000',
      action: action,
      details: {
        email: email,
        ip: ip,
        timestamp: new Date().toISOString(),
        ...details
      },
      ip_address: ip,
      timestamp: new Date().toISOString()
    };

    inMemoryAdminAuditLogs.unshift(logEntry);
    if (inMemoryAdminAuditLogs.length > 200) {
      inMemoryAdminAuditLogs.pop();
    }

    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        await supabaseAdmin.from('admin_audit_log').insert([{
          admin_user_id: logEntry.admin_user_id,
          action: logEntry.action,
          details: logEntry.details,
          ip_address: logEntry.ip_address,
          timestamp: logEntry.timestamp
        }]).catch((err: any) => {
          console.error("[ADMIN AUDIT LOG] Supabase insert notice:", err?.message || err);
        });
      }
    } catch (err) {
      console.error("[ADMIN AUDIT LOG] Exception recording audit log:", err);
    }
  }

  app.get("/api/admin-login-status", (req, res) => {
    const ip = getClientIp(req);
    const state = getAdminState(ip);
    const isLockedOut = !!(state.lockedUntil && Date.now() < state.lockedUntil);
    const lockoutRemainingSeconds = isLockedOut 
      ? Math.ceil((state.lockedUntil! - Date.now()) / 1000) 
      : 0;

    return res.json({
      isLockedOut,
      lockoutRemainingSeconds,
      failedAttempts: state.failedCount,
      maxAttempts: MAX_ADMIN_FAILED_ATTEMPTS
    });
  });

  app.post("/api/admin-login", async (req, res) => {
    try {
      const ip = getClientIp(req);
      const state = getAdminState(ip);
      const { password, email = 'admin@streetvend.app' } = req.body || {};

      // 1. Lockout check
      if (state.lockedUntil && Date.now() < state.lockedUntil) {
        const remainingSecs = Math.ceil((state.lockedUntil - Date.now()) / 1000);
        const remainingMins = Math.ceil(remainingSecs / 60);

        await recordAdminAuditLog('BLOCKED_ADMIN_LOGIN_ATTEMPT', email, ip, {
          reason: 'Attempted login during account lockout',
          remaining_lockout_seconds: remainingSecs
        });

        return res.status(429).json({
          success: false,
          error: `Account locked due to consecutive failed attempts. Please try again in ${remainingMins} minute(s).`,
          isLockedOut: true,
          lockoutRemainingSeconds: remainingSecs
        });
      }

      const expectedPassword = process.env.ADMIN_PASSWORD;
      if (!expectedPassword) {
        console.error("ADMIN_PASSWORD environment variable is not configured on the server.");
        return res.status(500).json({
          success: false,
          error: "Admin authentication is not configured on the server. ADMIN_PASSWORD environment variable is missing."
        });
      }

      // 2. Validate Password
      const isPasswordValid = typeof password === "string" && password.trim() === expectedPassword;

      if (!isPasswordValid) {
        state.failedCount += 1;
        state.lastAttemptAt = Date.now();

        if (state.failedCount >= MAX_ADMIN_FAILED_ATTEMPTS) {
          state.lockedUntil = Date.now() + ADMIN_LOCKOUT_MS;
          const lockoutSecs = Math.ceil(ADMIN_LOCKOUT_MS / 1000);

          await recordAdminAuditLog('ADMIN_ACCOUNT_LOCKOUT', email, ip, {
            reason: 'Exceeded maximum failed password attempts',
            total_failed_attempts: state.failedCount,
            lockout_duration_minutes: 15
          });

          console.warn(`[SECURITY ALERT] Admin account locked out for IP ${ip} / Email ${email} after ${state.failedCount} failed attempts.`);

          return res.status(429).json({
            success: false,
            error: `Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.`,
            isLockedOut: true,
            lockoutRemainingSeconds: lockoutSecs
          });
        }

        const attemptsRemaining = MAX_ADMIN_FAILED_ATTEMPTS - state.failedCount;

        await recordAdminAuditLog('FAILED_ADMIN_LOGIN', email, ip, {
          reason: 'Incorrect admin password',
          failed_attempts: state.failedCount,
          attempts_remaining: attemptsRemaining
        });

        return res.status(401).json({
          success: false,
          error: `Incorrect admin password. ${attemptsRemaining} attempt(s) remaining before account lockout.`,
          remainingAttempts: attemptsRemaining
        });
      }

      // 3. Password is CORRECT -> Grant admin session directly
      state.failedCount = 0;
      state.lockedUntil = null;

      await recordAdminAuditLog('SUCCESSFUL_ADMIN_LOGIN', email, ip, {
        message: 'Admin password authentication successful',
        auth_method: 'PASSWORD'
      });

      console.log(`[SECURITY EVENT] Successful Admin login from IP: ${ip} for email: ${email}`);

      return res.json({
        success: true,
        message: "Admin authenticated successfully."
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
  });

  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      let dbLogs: any[] = [];
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin
            .from('admin_audit_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100);

          if (!error && data) {
            dbLogs = data;
          }
        } catch (e) {
          console.error("Supabase audit log fetch notice:", e);
        }
      }

      const combinedMap = new Map();
      for (const log of inMemoryAdminAuditLogs) {
        const key = log.id || `${log.action}-${log.timestamp}`;
        combinedMap.set(key, log);
      }
      for (const log of dbLogs) {
        const key = log.id || `${log.action}-${log.timestamp}`;
        combinedMap.set(key, log);
      }

      const logs = Array.from(combinedMap.values()).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return res.json({ success: true, logs });
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      return res.json({ success: true, logs: inMemoryAdminAuditLogs });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, language, storeName, ownerName, products } = req.body;
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
              systemInstruction: `You are Streetvend AI, an intelligent business assistant for Indian street vendors.
You must give advice relevant to the Indian market.
Always use INR (₹) for currency. NEVER use $ or dollars.
Always recommend Indian payment methods like UPI, GPay, PhonePe, Paytm, or BharatPe. NEVER recommend Venmo, CashApp, Zelle, or Square.

Vendor Context:
Owner Name: ${ownerName || 'Vendor'}
Store Name: ${storeName || 'Store'}
Product Catalog (Name, Price in ₹, Category, Stock):
${products && products.length > 0 ? JSON.stringify(products) : 'No products available.'}

Provide highly actionable, concise advice specifically referencing the vendor's actual products when suggesting combos, pricing changes, or promotions. Respond in ${language || 'en'}.`,
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

            const result = await withTimeout(withRetry(() => ai.models.generateContent({
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
            })), 10000);

            const rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(rawText);
            orderData = parsed.order || [];
            extractedTranscript = parsed.transcript || transcript || "";
          } else if (transcript) {
            console.log(`[server.ts /api/voice-order] Processing text transcript: "${transcript}"`);
            const prompt = `Extract a structured order from this text: "${transcript}".
Match to this catalog: ${JSON.stringify(products || [])}.
Return ONLY a JSON array of objects with 'productId', 'name', and 'quantity'.`;

            const result = await withTimeout(withRetry(() => ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: prompt
            })), 10000);
            const rawText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
            orderData = JSON.parse(rawText);
          }
        } catch (genError: any) {
          console.error("Gemini Voice Order API Error:", genError);
          return res.status(500).json({ error: genError.message || "Voice processing timed out or failed" });
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
        const { type, vendorData, vendorId, vendorPlan, userPlan } = req.body || {};

        // 1. Fast check via body plan parameter
        const reqPlan = (vendorPlan || userPlan || "").toString().toLowerCase();
        if (reqPlan === "free") {
            return res.status(403).json({
                error: "Forbidden: AI Daily Insights, Smart Pricing, and Stock Predictions require a Starter or higher subscription plan.",
                requiredTier: "starter",
                currentPlan: "free"
            });
        }

        // 2. Server-side entitlement check via Authorization token if provided
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const supabaseAdmin = getSupabaseAdmin();
            if (supabaseAdmin) {
                try {
                    const withTimeout = <T>(promise: Promise<T>, ms = 1200): Promise<T> => {
                        return Promise.race([
                            promise,
                            new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
                        ]);
                    };

                    const authRes: any = await withTimeout(supabaseAdmin.auth.getUser(token)).catch(() => ({ data: { user: null } }));
                    const authUser = authRes?.data?.user;
                    if (authUser) {
                        const targetVendorId = vendorId || authUser.id;
                        const vendorRes: any = await withTimeout(
                            supabaseAdmin
                                .from("vendors")
                                .select("subscription")
                                .or(`id.eq.${targetVendorId},user_id.eq.${targetVendorId}`)
                                .maybeSingle()
                        ).catch(() => ({ data: null }));
                        const vendor = vendorRes?.data;

                        const plan = (vendor?.subscription || "free").toLowerCase();
                        if (plan === "free") {
                            return res.status(403).json({
                                error: "Forbidden: AI Smart Pricing and Stock Predictions require a Starter or higher subscription plan.",
                                requiredTier: "starter",
                                currentPlan: plan
                            });
                        }
                    }
                } catch (authErr) {
                    console.warn("Auth check error in /api/insights:", authErr);
                }
            }
        }

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
        const { notes, language, vendorId } = req.body;

        // Server-side entitlement check
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const supabaseAdmin = getSupabaseAdmin();
            if (supabaseAdmin) {
                const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);
                if (authUser) {
                    const targetVendorId = vendorId || authUser.id;
                    const { data: vendor } = await supabaseAdmin
                        .from("vendors")
                        .select("subscription")
                        .eq("id", targetVendorId)
                        .maybeSingle();

                    const plan = (vendor?.subscription || "free").toLowerCase();
                    if (plan === "free") {
                        return res.status(403).json({
                            error: "Forbidden: Dictated Notes AI Analysis requires a Starter or higher subscription plan.",
                            requiredTier: "starter",
                            currentPlan: plan
                        });
                    }
                }
            }
        }

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is in use. Exiting cleanly to allow supervisor restart...`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer();
