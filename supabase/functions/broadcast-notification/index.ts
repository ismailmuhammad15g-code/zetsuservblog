// @ts-ignore
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

    if (pub.length !== 65 || pub[0] !== 0x04) {
        throw new Error(`Invalid VAPID_PUBLIC_KEY format`);
    }
    if (priv.length !== 32) {
        throw new Error(`Invalid VAPID_PRIVATE_KEY format`);
    }

    const x = uint8ArrayToBase64Url(pub.slice(1, 33));
    const y = uint8ArrayToBase64Url(pub.slice(33, 65));
    const d = uint8ArrayToBase64Url(priv);

    return {
        publicKey: { kty: "EC", crv: "P-256", x, y },
        privateKey: { kty: "EC", crv: "P-256", x, y, d },
    };
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { title, message, url, type } = await req.json();

        // @ts-ignore
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        // @ts-ignore
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        // @ts-ignore
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing server configuration");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("[Broadcast] Starting with:", { title, message });

        // 1. Get ALL Users
        // Uses admin API to get granular list
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) throw usersError;
        if (!users || users.length === 0) {
            return new Response(JSON.stringify({ message: "No users found", count: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200
            });
        }

        // 2. Insert into notifications table (Batch) with Error Tracking
        const notificationsToInsert = users.map(u => ({
            user_id: u.id,
            title: title,
            message: message,
            type: type || 'admin_broadcast',
            link: url,
            is_read: false
        }));

        let insertedCount = 0;
        let insertErrors = [];

        // Insert in chunks of 50
        const chunkSize = 50;
        for (let i = 0; i < notificationsToInsert.length; i += chunkSize) {
            const chunk = notificationsToInsert.slice(i, i + chunkSize);
            const { error: insertError, count } = await supabase
                .from('notifications')
                .insert(chunk)
                .select('id', { count: 'exact' }); // Select to ensure we get confirmation

            if (insertError) {
                console.error("Error inserting notifications chunk:", insertError);
                insertErrors.push(insertError.message);
            } else {
                insertedCount += (chunk.length); // Assume success if no error, rough count or use returned count
            }
        }

        console.log(`[Broadcast] Database: ${insertedCount} inserted, ${notificationsToInsert.length - insertedCount} failed.`);

        // 3. Send Push Notifications (Best Effort)
        let pushSentCount = 0;
        let pushFailCount = 0;

        if (vapidPublicKey && vapidPrivateKey) {
            try {
                const exportedKeys = vapidBase64UrlToExportedJwk(vapidPublicKey, vapidPrivateKey);
                const vapidKeys = await webpush.importVapidKeys(exportedKeys, { extractable: false });

                const appServer = await webpush.ApplicationServer.new({
                    contactInformation: "mailto:zetsuserv@gmail.com",
                    vapidKeys,
                });

                // Get subscribers
                const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");

                if (subscriptions && subscriptions.length > 0) {
                    const pushMsg = {
                        title: title,
                        body: message,
                        url: url || "/",
                        tag: `broadcast-${Date.now()}`
                    };

                    const pushPromises = subscriptions.map(async (sub: any) => {
                        try {
                            const subscriber = appServer.subscribe({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            });
                            await subscriber.pushTextMessage(JSON.stringify(pushMsg));
                            pushSentCount++;
                        } catch (e) {
                            pushFailCount++;
                            // console.error("Push failed for one user", e);
                        }
                    });

                    await Promise.allSettled(pushPromises);
                }
            } catch (pushError) {
                console.error("Push notification logic failed (non-fatal):", pushError);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            count: users.length,
            insertedCount,
            pushSentCount,
            errors: insertErrors
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Broadcast Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
