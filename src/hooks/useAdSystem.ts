import { useState, useEffect, useCallback } from 'react';

export interface Ad {
    id: string;
    title: string;
    image_url: string;
    destination_url: string;
    size: string;
}

const API_BASE = 'https://rjiowrlvauerxsmueoej.supabase.co/functions/v1';
const API_KEY = '6fd2fd44-702a-4e06-8092-7c0658707be2';

export type AdSize = '728x90' | '300x250' | '336x280' | '160x600' | '320x50';

export function useAds(size?: AdSize) {
    const [ads, setAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAds = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const url = new URL(`${API_BASE}/get-ads`);
            url.searchParams.set('api_key', API_KEY);
            if (size) url.searchParams.set('size', size);

            const response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'فشل في جلب الإعلانات');
            }

            setAds(data.ads || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطأ في جلب الإعلانات');
            console.error('Ad fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [size]);

    useEffect(() => {
        fetchAds();
    }, [fetchAds]);

    const trackClick = async (adId: string) => {
        try {
            await fetch(`${API_BASE}/track-ad`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    ad_id: adId,
                    event_type: 'click'
                }),
            });
        } catch (err) {
            console.error('Failed to track click:', err);
        }
    };

    const getRandomAd = useCallback(() => {
        if (ads.length === 0) return null;
        return ads[Math.floor(Math.random() * ads.length)];
    }, [ads]);

    return {
        ads,
        loading,
        error,
        trackClick,
        refetch: fetchAds,
        getRandomAd,
    };
}

export default useAds;
