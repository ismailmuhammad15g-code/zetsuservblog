import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type SoundType = 'click' | 'hover' | 'success' | 'error' | 'zetsu_alert';

interface SoundContextType {
    playSound: (type: SoundType) => void;
    isMuted: boolean;
    toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType>({
    playSound: () => { },
    isMuted: false,
    toggleMute: () => { },
});

export const useSound = () => useContext(SoundContext);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMuted, setIsMuted] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext on first interaction
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const playSound = (type: SoundType) => {
        if (isMuted) return;
        initAudio();

        const ctx = audioContextRef.current;
        if (!ctx) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // AAA Sound Design Presets (Cyberpunk/Sci-Fi Tones)
        switch (type) {
            case 'click':
                // Crisp, high-tech click
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.start(t);
                osc.stop(t + 0.1);

                // Add a small "thud" for body
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(100, t);
                gain2.gain.setValueAtTime(0.1, t);
                gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc2.start(t);
                osc2.stop(t + 0.1);
                break;

            case 'hover':
                // Subtle high-pitch blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.linearRampToValueAtTime(600, t + 0.05);
                gain.gain.setValueAtTime(0.02, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.05);
                osc.start(t);
                osc.stop(t + 0.05);
                break;

            case 'success':
                // Positive chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, t);
                osc.frequency.setValueAtTime(800, t + 0.1);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;

            case 'zetsu_alert':
                // Low, mysterious drone/pulse
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(110, t);
                osc.frequency.linearRampToValueAtTime(55, t + 0.5);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

                // Filter for "muffled" dark sound
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, t);
                filter.frequency.linearRampToValueAtTime(100, t + 0.5);
                osc.disconnect();
                osc.connect(filter);
                filter.connect(gain);

                osc.start(t);
                osc.stop(t + 0.6);
                break;
        }
    };

    const toggleMute = () => setIsMuted(prev => !prev);

    // Global Click Listener for automatic sounds
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Check if clicked element is interactive
            if (target.closest('button') || target.closest('a') || target.getAttribute('role') === 'button') {
                playSound('click');
            }
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isMuted]);

    return (
        <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
            {children}
        </SoundContext.Provider>
    );
};
