// Push notification configuration
export const VAPID_PUBLIC_KEY = 'BNj4DOjZhlZG7fTj00s84jot-i0hJ873ORA0NcAII-y9sgmNu0ByI6w7no6USuyofIzRdA8NO6apKbfiiHyyHxs';

// Check if push notifications are supported
export const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
};

// Subscribe to push notifications
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
    try {
        const registration = await navigator.serviceWorker.ready;

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Create new subscription
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        return subscription;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return null;
    }
};

// Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Schedule a local notification (for when app is open)
export const scheduleLocalNotification = (title: string, body: string, delayMs: number) => {
    if (!isPushSupported() || Notification.permission !== 'granted') {
        console.warn('Notifications not available');
        return null;
    }

    const timeoutId = setTimeout(() => {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'zersu-challenge',
            requireInteraction: true,
        });
    }, delayMs);

    return timeoutId;
};

// Store scheduled notification in localStorage (backup for when browser is closed)
export const storeScheduledNotification = (challengeId: string, scheduledAt: string, title: string, body: string) => {
    const notifications = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    notifications.push({
        id: `${challengeId}-${Date.now()}`,
        challengeId,
        scheduledAt,
        title,
        body,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('scheduled_notifications', JSON.stringify(notifications));
};

// Check and trigger due notifications
export const checkScheduledNotifications = () => {
    if (!isPushSupported() || Notification.permission !== 'granted') return;

    const notifications = JSON.parse(localStorage.getItem('scheduled_notifications') || '[]');
    const now = new Date().getTime();
    const remaining: any[] = [];

    notifications.forEach((notif: any) => {
        const scheduledTime = new Date(notif.scheduledAt).getTime();
        if (scheduledTime <= now) {
            // Show notification
            new Notification(notif.title, {
                body: notif.body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `zersu-${notif.id}`,
                requireInteraction: true,
            });
        } else {
            remaining.push(notif);
        }
    });

    localStorage.setItem('scheduled_notifications', JSON.stringify(remaining));
};

// Initialize notification system
export const initNotifications = async () => {
    if (!isPushSupported()) {
        console.log('Push notifications not supported in this browser');
        return false;
    }

    // Register service worker
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
    }

    // Check for due notifications periodically
    checkScheduledNotifications();
    setInterval(checkScheduledNotifications, 60000); // Every minute

    return true;
};

export default {
    isPushSupported,
    requestNotificationPermission,
    subscribeToPush,
    scheduleLocalNotification,
    storeScheduledNotification,
    checkScheduledNotifications,
    initNotifications,
};
