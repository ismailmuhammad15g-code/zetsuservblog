import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type SoundType = 'click' | 'hover' | 'success' | 'error' | 'zetsu_alert';

interface SoundContextType {
    playSound: (type: SoundType) => void;
    isMuted: boolean;
    toggleMute: () => void;
    masterVolume: number;
    setMasterVolume: (val: number) => void;
    zersuPersonality: 'sarcastic' | 'polite';
    setZersuPersonality: (type: 'sarcastic' | 'polite') => void;
    weatherMode: 'auto' | 'sunny' | 'rain' | 'fog';
    setWeatherMode: (mode: 'auto' | 'sunny' | 'rain' | 'fog') => void;
}

const SoundContext = createContext<SoundContextType>({
    playSound: () => { },
    isMuted: false,
    toggleMute: () => { },
    masterVolume: 0.5,
    setMasterVolume: () => { },
    zersuPersonality: 'sarcastic',
    setZersuPersonality: () => { },
    weatherMode: 'auto',
    setWeatherMode: () => { },
});

export const useSound = () => useContext(SoundContext);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMuted, setIsMuted] = useState(false);

    // Load persisted settings
    const [masterVolume, setMasterVolume] = useState(() => {
        const saved = localStorage.getItem('zetsu_master_volume');
        return saved ? parseFloat(saved) : 0.5;
    });

    const [zersuPersonality, setZersuPersonality] = useState<'sarcastic' | 'polite'>(() => {
        const saved = localStorage.getItem('zetsu_personality');
        return (saved === 'polite' || saved === 'sarcastic') ? saved : 'sarcastic';
    });

    const [weatherMode, setWeatherMode] = useState<'auto' | 'sunny' | 'rain' | 'fog'>(() => {
        const saved = localStorage.getItem('zetsu_weather_mode');
        return (saved === 'sunny' || saved === 'rain' || saved === 'fog') ? saved : 'auto';
    });

    // Persist changes
    useEffect(() => {
        localStorage.setItem('zetsu_master_volume', masterVolume.toString());
    }, [masterVolume]);

    useEffect(() => {
        localStorage.setItem('zetsu_personality', zersuPersonality);
    }, [zersuPersonality]);

    useEffect(() => {
        localStorage.setItem('zetsu_weather_mode', weatherMode);
    }, [weatherMode]);

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

    const playSound = (type: SoundType | 'thunder') => {
        if (isMuted) return;
        initAudio();

        const ctx = audioContextRef.current;
        if (!ctx) return;

        const t = ctx.currentTime;
        // Master Volume applied to all standard SFX
        // For thunder, we might want it louder, but still scaled by master
        const vol = masterVolume;

        // ============================================
        // MODERN AAA GAME SOUND DESIGN (2024 Style)
        // ============================================
        switch (type) {
            case 'click': {
                // Futuristic UI Click - Layered with Sub-bass punch + High sparkle
                const masterGain = ctx.createGain();
                masterGain.gain.value = 0.15 * vol;
                masterGain.connect(ctx.destination);

                // Layer 1: Sub-bass punch
                const bass = ctx.createOscillator();
                const bassGain = ctx.createGain();
                bass.type = 'sine';
                bass.frequency.setValueAtTime(80, t);
                bass.frequency.exponentialRampToValueAtTime(40, t + 0.08);
                bassGain.gain.setValueAtTime(0.4, t);
                bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                bass.connect(bassGain);
                bassGain.connect(masterGain);
                bass.start(t);
                bass.stop(t + 0.1);

                // Layer 2: Mid-frequency "tick"
                const mid = ctx.createOscillator();
                const midGain = ctx.createGain();
                mid.type = 'triangle';
                mid.frequency.setValueAtTime(2000, t);
                mid.frequency.exponentialRampToValueAtTime(800, t + 0.03);
                midGain.gain.setValueAtTime(0.3, t);
                midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                mid.connect(midGain);
                midGain.connect(masterGain);
                mid.start(t);
                mid.stop(t + 0.05);

                // Layer 3: High sparkle
                const high = ctx.createOscillator();
                const highGain = ctx.createGain();
                high.type = 'sine';
                high.frequency.setValueAtTime(4000, t);
                high.frequency.exponentialRampToValueAtTime(6000, t + 0.02);
                highGain.gain.setValueAtTime(0.1, t);
                highGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                high.connect(highGain);
                highGain.connect(masterGain);
                high.start(t);
                high.stop(t + 0.04);
                break;
            }

            case 'hover': {
                // Subtle futuristic sweep - almost subliminal
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(2000, t);
                filter.Q.value = 5;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1500, t);
                osc.frequency.linearRampToValueAtTime(2500, t + 0.04);
                gain.gain.setValueAtTime(0.03 * vol, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.06);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.06);
                break;
            }

            case 'success': {
                // Rewarding Chime - Musical, Positive, Celebratory
                const masterGain = ctx.createGain();
                masterGain.gain.value = 0.12 * vol;
                masterGain.connect(ctx.destination);

                // Note sequence: C5 -> E5 -> G5 (Major triad)
                const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, t + i * 0.08);
                    gain.gain.linearRampToValueAtTime(0.5, t + i * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start(t + i * 0.08);
                    osc.stop(t + i * 0.08 + 0.35);
                });

                // Add shimmer
                const shimmer = ctx.createOscillator();
                const shimmerGain = ctx.createGain();
                shimmer.type = 'triangle';
                shimmer.frequency.setValueAtTime(1046.5, t + 0.24); // C6
                shimmerGain.gain.setValueAtTime(0.15, t + 0.24);
                shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                shimmer.connect(shimmerGain);
                shimmerGain.connect(masterGain);
                shimmer.start(t + 0.24);
                shimmer.stop(t + 0.6);
                break;
            }

            case 'error': {
                // Dark, Jarring Error - Dissonant, Attention-Grabbing
                const masterGain = ctx.createGain();
                masterGain.gain.value = 0.1 * vol;
                masterGain.connect(ctx.destination);

                // Two dissonant tones
                [200, 207].forEach(freq => { // Minor 2nd interval = dissonance
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.3, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 800;

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(masterGain);
                    osc.start(t);
                    osc.stop(t + 0.3);
                });
                break;
            }

            case 'zetsu_alert': {
                // Evil Zersu Alert - Deep, Ominous, Pulse Effect
                const masterGain = ctx.createGain();
                masterGain.gain.value = 0.15 * vol;
                masterGain.connect(ctx.destination);

                // Deep bass drone
                const bass = ctx.createOscillator();
                const bassGain = ctx.createGain();
                const bassFilter = ctx.createBiquadFilter();
                bass.type = 'sawtooth';
                bass.frequency.setValueAtTime(55, t);
                bass.frequency.linearRampToValueAtTime(35, t + 0.8);
                bassFilter.type = 'lowpass';
                bassFilter.frequency.value = 200;
                bassGain.gain.setValueAtTime(0.5, t);
                bassGain.gain.exponentialRampToValueAtTime(0.001, t + 1);
                bass.connect(bassFilter);
                bassFilter.connect(bassGain);
                bassGain.connect(masterGain);
                bass.start(t);
                bass.stop(t + 1);

                // Eerie mid-tone
                const mid = ctx.createOscillator();
                const midGain = ctx.createGain();
                mid.type = 'triangle';
                mid.frequency.setValueAtTime(220, t);
                mid.frequency.linearRampToValueAtTime(110, t + 0.6);
                midGain.gain.setValueAtTime(0.2, t + 0.1);
                midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
                mid.connect(midGain);
                midGain.connect(masterGain);
                mid.start(t + 0.1);
                mid.stop(t + 0.8);

                // LFO modulation for "pulse" effect
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.type = 'sine';
                lfo.frequency.value = 8; // 8Hz pulse
                lfoGain.gain.value = 0.3;
                lfo.connect(lfoGain);
                lfoGain.connect(masterGain.gain);
                lfo.start(t);
                lfo.stop(t + 1);
                break;
            }

            case 'thunder': {
                // Synthesized Thunder Crack
                // White noise burst + Low pass filter sweep + Reverb tail simulation
                const masterGain = ctx.createGain();
                masterGain.gain.value = 0.8 * vol; // Loud!
                masterGain.connect(ctx.destination);

                const bufferSize = ctx.sampleRate * 2; // 2 seconds
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.exponentialRampToValueAtTime(100, t + 1.5);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(1, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(masterGain);
                noise.start(t);
                break;
            }
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
    }, [isMuted, masterVolume]);

    return (
        <SoundContext.Provider value={{
            playSound,
            isMuted,
            toggleMute,
            masterVolume,
            setMasterVolume,
            zersuPersonality,
            setZersuPersonality,
            weatherMode,
            setWeatherMode
        }}>
            {children}
        </SoundContext.Provider>
    );
};
