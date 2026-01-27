import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify CloudPayments signature
async function verifySignature(body: string, signature: string, apiSecret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(apiSecret);
    const data = encoder.encode(body);
    
    // CloudPayments uses HMAC-SHA256
    const crypto = globalThis.crypto;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const signatureArray = new Uint8Array(signatureBuffer);
    
    // Convert to base64 manually
    let binary = '';
    for (let i = 0; i < signatureArray.length; i++) {
      binary += String.fromCharCode(signatureArray[i]);
    }
    const computedSignature = btoa(binary);
    
    return computedSignature === signature;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiSecret = Deno.env.get("CLOUDPAYMENTS_API_SECRET");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bodyText = await req.text();
    const signature = req.headers.get("Content-HMAC");

    // Verify signature if API secret is configured
    if (apiSecret && signature) {
      const isValid = await verifySignature(bodyText, signature, apiSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ code: 13 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = JSON.parse(bodyText);
    const { 
      TransactionId: externalId,
      Status: status,
      Data: data,
    } = body;

    if (!data?.transactionId) {
      console.error("Missing transaction ID in webhook data");
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transactionId, userId, tokens } = data;

    // Get the transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", transactionId);
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Avoid double processing
    if (transaction.status === "completed") {
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status === "Completed") {
      // Update transaction
      await supabase
        .from("transactions")
        .update({ 
          status: "completed",
          external_id: externalId?.toString(),
        })
        .eq("id", transactionId);

      // Get current user balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("tokens_balance")
        .eq("id", userId)
        .single();

      const currentBalance = profile?.tokens_balance || 0;
      const totalTokens = transaction.amount;

      // Update user balance
      await supabase
        .from("profiles")
        .update({ tokens_balance: currentBalance + totalTokens })
        .eq("id", userId);

      console.log(`Payment completed: ${totalTokens} tokens added to user ${userId}`);
    } else if (status === "Declined" || status === "Cancelled") {
      // Update transaction as failed
      await supabase
        .from("transactions")
        .update({ 
          status: "failed",
          external_id: externalId?.toString(),
          metadata: { ...transaction.metadata, error: status },
        })
        .eq("id", transactionId);

      console.log(`Payment failed: ${status} for transaction ${transactionId}`);
    }

    // CloudPayments expects { code: 0 } for success
    return new Response(JSON.stringify({ code: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ code: 13 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
