import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushNotificationToggleProps {
  variant?: "button" | "switch";
  showLabel?: boolean;
}

export function PushNotificationToggle({ 
  variant = "switch", 
  showLabel = true 
}: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (variant === "button") {
    return (
      <Button
        variant={isSubscribed ? "secondary" : "default"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isSubscribed ? "Disable Notifications" : "Enable Notifications"}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {showLabel && (
        <div className="space-y-0.5">
          <Label htmlFor="push-notifications" className="text-sm font-medium">
            Push Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            {permission === "denied" 
              ? "Blocked in browser settings" 
              : isSubscribed 
                ? "Receive notifications even when browser is closed" 
                : "Get notified about new posts and comments"}
          </p>
        </div>
      )}
      <Switch
        id="push-notifications"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={loading || permission === "denied"}
      />
    </div>
  );
}
