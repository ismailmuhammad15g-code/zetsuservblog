import { useState, useEffect, useCallback } from 'react';
import {
    isPushSupported,
    requestNotificationPermission,
    initNotifications,
    scheduleLocalNotification,
    storeScheduledNotification
} from '@/utils/pushNotifications';
import { toast } from 'sonner';

export const useNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const supported = isPushSupported();
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission);

            // Initialize service worker
            initNotifications().then((success) => {
                setIsInitialized(success);
            });
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (!isSupported) {
            toast.error('المتصفح لا يدعم الإشعارات');
            return 'denied' as NotificationPermission;
        }

        const result = await requestNotificationPermission();
        setPermission(result);

        if (result === 'granted') {
            toast.success('تم تفعيل الإشعارات! 🔔');
        } else if (result === 'denied') {
            toast.error('تم رفض الإشعارات. فعّلها من إعدادات المتصفح');
        }

        return result;
    }, [isSupported]);

    const scheduleNotification = useCallback((
        challengeId: string,
        challengeTitle: string,
        scheduledAt: Date
    ) => {
        if (permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        const now = Date.now();
        const targetTime = scheduledAt.getTime();
        const delay = targetTime - now;

        if (delay <= 0) {
            // Already past due
            return;
        }

        const title = '⚔️ حان وقت التحدي!';
        const body = `${challengeTitle} - Zersu ينتظرك! هل ستخذله؟ 😈`;

        // Schedule local notification (works while app is open)
        scheduleLocalNotification(title, body, delay);

        // Store for persistence (works when app reopens)
        storeScheduledNotification(
            challengeId,
            scheduledAt.toISOString(),
            title,
            body
        );

        console.log(`Notification scheduled for ${scheduledAt.toLocaleString()}`);
    }, [permission]);

    return {
        isSupported,
        isInitialized,
        permission,
        requestPermission,
        scheduleNotification,
    };
};

export default useNotifications;
