// @ts-ignore - Deno imports only work in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @ts-ignore
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function base64UrlDecode(base64Url: string): Uint8Array {
  const cleaned = base64Url.trim().replace(/\s+/g, "");
  const base64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.byteLength; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function vapidBase64UrlToExportedJwk(vapidPublicKey: string, vapidPrivateKey: string): webpush.ExportedVapidKeys {
  const pub = base64UrlDecode(vapidPublicKey);
  const priv = base64UrlDecode(vapidPrivateKey);

  // VAPID public key from browser is usually uncompressed EC point: 65 bytes, starts with 0x04
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error(`Invalid VAPID_PUBLIC_KEY format (expected 65 bytes uncompressed, got ${pub.length})`);
  }
  if (priv.length !== 32) {
    throw new Error(`Invalid VAPID_PRIVATE_KEY format (expected 32 bytes, got ${priv.length})`);
  }

  const x = uint8ArrayToBase64Url(pub.slice(1, 33));
  const y = uint8ArrayToBase64Url(pub.slice(33, 65));
  const d = uint8ArrayToBase64Url(priv);

  const publicKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
  };

  const privateKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
  };

  return { publicKey, privateKey };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore - Deno is available in Edge Functions runtime
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    // @ts-ignore
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[push] Missing VAPID keys");
      return new Response(JSON.stringify({ error: "Push notifications not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[push] Missing backend credentials");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PushPayload = await req.json();
    console.log("[push] Request:", payload);

    const exportedKeys = vapidBase64UrlToExportedJwk(vapidPublicKey, vapidPrivateKey);
    const vapidKeys = await webpush.importVapidKeys(exportedKeys, { extractable: false });

    // Keep subject stable (required by push services)
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:zetsuserv@gmail.com",
      vapidKeys,
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine target user IDs
    let targetUserIds: string[] = [];
    if (payload.user_ids?.length) {
      targetUserIds = payload.user_ids;
    } else if (payload.user_id) {
      targetUserIds = [payload.user_id];
    } else {
      const { data: allSubs, error } = await supabase.from("push_subscriptions").select("user_id");
      if (error) throw error;
      targetUserIds = [...new Set((allSubs ?? []).map((s: any) => s.user_id))] as string[];
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) throw subError;

    if (!subscriptions?.length) {
      console.log("[push] No subscriptions found for target users");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[push] Sending to ${subscriptions.length} subscriptions`);

    const msg = {
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      tag: payload.tag || `notification-${Date.now()}`,
    };

    const results = await Promise.all(
      subscriptions.map(async (sub: any) => {
        const subscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        const subscriber = appServer.subscribe(subscription);

        try {
          await subscriber.pushTextMessage(JSON.stringify(msg), { ttl: 24 * 60 * 60 });
          return { ok: true as const, delete: false as const };
        } catch (e: any) {
          // Push services return 410 when subscription is gone
          if (e instanceof webpush.PushMessageError) {
            console.error("[push] PushMessageError:", (e as any).toString());
            if ((e as any).isGone()) {
              return { ok: false as const, delete: true as const };
            }
            return { ok: false as const, delete: false as const };
          }

          console.error("[push] Unknown error:", e);
          return { ok: false as const, delete: false as const };
        }
      })
    );

    const toDelete = results
      .map((r: any, i: number) => ({ r, sub: subscriptions[i] }))
      .filter((x: any) => x.r.delete)
      .map((x: any) => x.sub);

    if (toDelete.length) {
      console.log(`[push] Deleting ${toDelete.length} expired subscriptions`);
      await Promise.all(
        toDelete.map((s: any) =>
          supabase.from("push_subscriptions").delete().eq("id", s.id)
        )
      );
    }

    const successCount = results.filter((r: any) => r.ok).length;

    return new Response(JSON.stringify({ success: true, sent: successCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[push] Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
