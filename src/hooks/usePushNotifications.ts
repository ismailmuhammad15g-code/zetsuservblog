import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

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
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, []);

  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration);
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in your browser.",
        variant: "destructive",
      });
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error("VAPID public key not configured");
      toast({
        title: "Configuration Error",
        description: "Push notifications are not configured yet.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // Register service worker
      let registration = await navigator.serviceWorker.ready;
      if (!registration) {
        registration = await registerServiceWorker();
        if (!registration) {
          throw new Error("Failed to register service worker");
        }
        // Wait for it to be ready
        registration = await navigator.serviceWorker.ready;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription exists, create one
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Get user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("User not authenticated");
      }

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
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

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You will now receive push notifications.",
      });

      return true;
    } catch (error: any) {
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
  }, [isSupported, toast, registerServiceWorker]);

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
