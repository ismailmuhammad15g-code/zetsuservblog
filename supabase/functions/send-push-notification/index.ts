import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Base64 URL decode
function base64UrlDecode(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create VAPID JWT
async function createVapidJwt(audience: string, subject: string, vapidPrivateKey: string, vapidPublicKey: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key - need to use PKCS8 format for ECDSA
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  
  // For raw 32-byte keys, we need to wrap it in PKCS8 format
  // This is the PKCS8 prefix for P-256 EC private keys
  const pkcs8Prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Prefix.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Prefix);
  pkcs8Key.set(privateKeyBytes, pkcs8Prefix.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Key.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signatureArrayBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature to base64url
  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signatureArrayBuffer));

  return `${unsignedToken}.${signatureB64}`;
}


// Send Web Push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, 'mailto:zetsuserv@gmail.com', vapidPrivateKey, vapidPublicKey);

    const body = JSON.stringify(payload);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: body,
    });

    if (response.status === 201 || response.status === 200) {
      console.log("Push notification sent successfully");
      return true;
    } else if (response.status === 404 || response.status === 410) {
      console.log("Subscription expired or invalid");
      return false;
    } else {
      const text = await response.text();
      console.error(`Push failed with status ${response.status}: ${text}`);
      return true; // Don't delete on other errors
    }
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return true; // Don't delete on network errors
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("Missing VAPID keys");
      return new Response(JSON.stringify({ error: "Push notifications not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    console.log("Sending push notification:", payload);

    // Get target user IDs
    let targetUserIds: string[] = [];
    if (payload.user_ids) {
      targetUserIds = payload.user_ids;
    } else if (payload.user_id) {
      targetUserIds = [payload.user_id];
    } else {
      // Send to all users with subscriptions
      const { data: allSubs } = await supabase
        .from("push_subscriptions")
        .select("user_id");
      
      targetUserIds = [...new Set(allSubs?.map(s => s.user_id) || [])];
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found for target users");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending to ${subscriptions.length} subscriptions`);

    const pushPayload = {
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag || `notification-${Date.now()}`,
    };

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const success = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          pushPayload,
          vapidPublicKey,
          vapidPrivateKey
        );
        
        if (!success) {
          // Delete expired subscription
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          console.log("Deleted expired subscription:", sub.id);
        }
        
        return success;
      })
    );

    const successCount = results.filter(Boolean).length;

    return new Response(JSON.stringify({ success: true, sent: successCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
