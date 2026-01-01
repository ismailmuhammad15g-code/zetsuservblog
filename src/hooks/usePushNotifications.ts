import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (error) {
      console.error("Error fetching VAPID key:", error);
      return null;
    }
    cachedVapidKey = data?.publicKey || null;
    return cachedVapidKey;
  } catch (e) {
    console.error("Error fetching VAPID key:", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const { toast } = useToast();

  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      console.log("[Push] Registering service worker...");
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("[Push] Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("[Push] Service Worker registration failed:", error);
      return null;
    }
  }, []);

  const checkExistingSubscription = useCallback(async () => {
    try {
      console.log("[Push] Checking existing subscription...");
      // First register service worker if needed
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        console.log("[Push] No registration found, registering...");
        registration = await registerServiceWorker();
      }

      if (registration) {
        await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        console.log("[Push] Existing subscription:", !!subscription);
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error("[Push] Error checking subscription:", error);
    }
  }, [registerServiceWorker]);

  useEffect(() => {
    const init = async () => {
      // Check if push notifications are supported
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      console.log("[Push] Supported:", supported);
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        console.log("[Push] Current permission:", Notification.permission);

        // Fetch VAPID key first
        const key = await getVapidPublicKey();
        console.log("[Push] VAPID key fetched:", !!key);
        setVapidKey(key);

        // Then check existing subscription
        await checkExistingSubscription();
      }
      setInitLoading(false);
    };

    init();
  }, [checkExistingSubscription]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in your browser.",
        variant: "destructive",
      });
      return false;
    }

    // Get VAPID key if not cached
    let key = vapidKey;
    if (!key) {
      key = await getVapidPublicKey();
      setVapidKey(key);
    }

    if (!key) {
      console.error("VAPID public key not available");
      toast({
        title: "Configuration Error",
        description: "Push notifications are not configured yet.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    console.log("[Push] Starting subscription process...");

    try {
      // Request notification permission
      console.log("[Push] Requesting permission...");
      const permissionResult = await Notification.requestPermission();
      console.log("[Push] Permission result:", permissionResult);
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      // Register service worker
      console.log("[Push] Getting service worker registration...");
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        console.log("[Push] No registration, registering new SW...");
        registration = await registerServiceWorker();
        if (!registration) {
          throw new Error("Failed to register service worker");
        }
      }
      await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready");

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log("[Push] Existing subscription:", !!subscription);

      // If no subscription exists, create one
      if (!subscription) {
        console.log("[Push] Creating new subscription with key:", key.substring(0, 20) + "...");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
        console.log("[Push] New subscription created");
      }

      // Get user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
      console.log("[Push] Saving subscription to database...");
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJSON.keys?.p256dh || "",
          auth: subscriptionJSON.keys?.auth || "",
        },
        {
          onConflict: "user_id,endpoint",
        }
      );

      if (error) {
        console.error("[Push] Database error:", error);
        throw error;
      }

      console.log("[Push] Subscription saved successfully!");
      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You will now receive push notifications.",
      });

      return true;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // Completely silent - no console output, no toast
        return false;
      }

      console.error("Error subscribing to push notifications:", error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to enable push notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, vapidKey, toast, registerServiceWorker]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", session.user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });

      return true;
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to disable push notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
