import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSound } from '@/contexts/SoundContext';
import RainShader from './RainShader';
import FogShader from './FogShader';
import SunnyShader from './SunnyShader';

type WeatherType = 'rain' | 'fog' | 'sunny';

const WeatherDisplay: React.FC = () => {
    const [autoWeather, setAutoWeather] = useState<WeatherType>('rain');
    const [isDay, setIsDay] = useState(false);
    const { isMuted, masterVolume, weatherMode } = useSound();

    // Track if audio has been initialized after user interaction
    const [audioInitialized, setAudioInitialized] = useState(false);
    const userHasInteracted = useRef(false);

    // Derived actual weather based on setting
    const weather = weatherMode === 'auto' ? autoWeather : weatherMode;

    // Audio Refs
    const rainAudioContextRef = useRef<AudioContext | null>(null);
    const rainNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const rainGainNodeRef = useRef<GainNode | null>(null);
    const windOscRef = useRef<AudioContext | null>(null);
    const windGainRef = useRef<GainNode | null>(null);

    // Fetch Weather Logic
    useEffect(() => {
        const fetchWeather = async () => {
            const { data, error } = await supabase.rpc('get_game_weather' as any);
            if (data && !error) {
                const w = data as { weather: string, is_day: boolean };
                if (w.weather === 'rain' || w.weather === 'fog' || w.weather === 'sunny') {
                    setAutoWeather(w.weather as WeatherType);
                    setIsDay(w.is_day);
                }
            } else {
                const hour = new Date().getHours();
                if (hour >= 6 && hour < 19) {
                    setAutoWeather('sunny');
                } else {
                    setAutoWeather(Math.random() > 0.3 ? 'rain' : 'fog');
                }
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // ============================================
    // SEAMLESS AUDIO INITIALIZATION
    // "Silent Wait" Strategy - Wait for first user interaction
    // ============================================

    const initializeAudioOnInteraction = useCallback(async () => {
        if (userHasInteracted.current) return;
        userHasInteracted.current = true;

        try {
            console.log('🎵 First user interaction detected - initializing audio...');

            // Mark audio as initialized so useEffects can start audio
            setAudioInitialized(true);

            // Store permission for future page loads
            localStorage.setItem('zetsu_audio_ready', 'true');

        } catch (error) {
            console.log('Audio init error (suppressed):', error);
        }
    }, []);

    // Add global event listeners for ANY user interaction
    useEffect(() => {
        const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll', 'mousedown'];

        const handleInteraction = () => {
            initializeAudioOnInteraction();
            // Remove all listeners after first interaction
            interactionEvents.forEach(event => {
                document.removeEventListener(event, handleInteraction, true);
            });
        };

        // Add passive listeners for performance
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction, { once: false, passive: true, capture: true });
        });

        // Check if user has already interacted in a previous session
        if (localStorage.getItem('zetsu_audio_ready') === 'true') {
            // User has interacted before, but we still need a gesture in THIS session
            // The listeners will handle it
        }

        return () => {
            interactionEvents.forEach(event => {
                document.removeEventListener(event, handleInteraction, true);
            });
        };
    }, [initializeAudioOnInteraction]);

    // ============================================
    // RAIN AUDIO - With Fade-In Effect
    // ============================================
    useEffect(() => {
        // Only play if audio initialized, weather is rain, and not muted
        if (!audioInitialized || weather !== 'rain' || isMuted) {
            // Fade out and stop rain sound
            if (rainGainNodeRef.current && rainAudioContextRef.current) {
                try {
                    rainGainNodeRef.current.gain.setTargetAtTime(0, rainAudioContextRef.current.currentTime, 0.5);
                } catch (e) { /* suppress */ }
            }
            return;
        }

        const startRainSound = async () => {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

                if (!rainAudioContextRef.current) {
                    rainAudioContextRef.current = new AudioContextClass();
                }
                const ctx = rainAudioContextRef.current;

                // Resume if suspended
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                // Don't recreate if already playing
                if (rainNoiseSourceRef.current) return;

                // Create rain noise buffer (brown noise)
                const bufferSize = 2 * ctx.sampleRate;
                const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

                for (let channel = 0; channel < 2; channel++) {
                    const data = noiseBuffer.getChannelData(channel);
                    let lastOut = 0;
                    for (let i = 0; i < bufferSize; i++) {
                        const white = Math.random() * 2 - 1;
                        data[i] = (lastOut + (0.02 * white)) / 1.02;
                        lastOut = data[i];
                        data[i] *= 3.5;
                    }
                }

                // Create audio nodes
                const noiseSource = ctx.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                noiseSource.loop = true;

                const lowPassFilter = ctx.createBiquadFilter();
                lowPassFilter.type = 'lowpass';
                lowPassFilter.frequency.value = 800;
                lowPassFilter.Q.value = 0.7;

                const highPassFilter = ctx.createBiquadFilter();
                highPassFilter.type = 'highpass';
                highPassFilter.frequency.value = 200;

                const gainNode = ctx.createGain();
                // Start at 0 for fade-in
                gainNode.gain.value = 0;
                rainGainNodeRef.current = gainNode;

                // Connect the chain
                noiseSource.connect(lowPassFilter);
                lowPassFilter.connect(highPassFilter);
                highPassFilter.connect(gainNode);
                gainNode.connect(ctx.destination);

                noiseSource.start();
                rainNoiseSourceRef.current = noiseSource;

                // FADE IN over 2 seconds
                const targetVolume = 0.4 * masterVolume;
                gainNode.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5); // 0.5s time constant ~= 2s full fade

                console.log('🌧️ Rain sound started with fade-in');

            } catch (error) {
                console.log('Rain audio error (suppressed):', error);
            }
        };

        startRainSound();

        // Volume update with fade
        if (rainGainNodeRef.current && rainAudioContextRef.current) {
            try {
                const targetVolume = 0.4 * masterVolume;
                rainGainNodeRef.current.gain.setTargetAtTime(targetVolume, rainAudioContextRef.current.currentTime, 0.3);
            } catch (e) { /* suppress */ }
        }

        return () => {
            if (rainNoiseSourceRef.current) {
                try {
                    rainNoiseSourceRef.current.stop();
                    rainNoiseSourceRef.current.disconnect();
                } catch (e) { /* suppress */ }
                rainNoiseSourceRef.current = null;
            }
        };
    }, [audioInitialized, weather, isMuted, masterVolume]);

    // ============================================
    // FOG AUDIO - With Fade-In Effect
    // ============================================
    useEffect(() => {
        if (!audioInitialized || weather !== 'fog' || isMuted) {
            if (windOscRef.current) {
                try {
                    windOscRef.current.close();
                } catch (e) { /* suppress */ }
                windOscRef.current = null;
            }
            return;
        }

        const startWindSound = async () => {
            try {
                if (windOscRef.current) return;

                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContextClass();
                windOscRef.current = ctx;

                const bufferSize = 2 * ctx.sampleRate;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);

                // Pink Noise Generation
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    output[i] *= 0.11;
                    b6 = white * 0.115926;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 400;

                const gainNode = ctx.createGain();
                windGainRef.current = gainNode;
                // Start at 0 for fade-in
                gainNode.gain.value = 0;

                noise.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(ctx.destination);
                noise.start();

                // FADE IN over 2 seconds
                const targetVolume = 0.2 * masterVolume;
                gainNode.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5);

                console.log('💨 Wind sound started with fade-in');

            } catch (error) {
                console.log('Wind audio error (suppressed):', error);
            }
        };

        startWindSound();

        if (windGainRef.current && windOscRef.current) {
            try {
                windGainRef.current.gain.setTargetAtTime(0.2 * masterVolume, windOscRef.current.currentTime, 0.3);
            } catch (e) { /* suppress */ }
        }

        return () => {
            if (windOscRef.current) {
                try {
                    windOscRef.current.close();
                } catch (e) { /* suppress */ }
                windOscRef.current = null;
            }
        };
    }, [audioInitialized, weather, isMuted, masterVolume]);

    // Fade-in visual effect
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'rain' ? 1 : 0 }}>
                {weather === 'rain' && <RainShader />}
            </div>

            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'fog' ? 1 : 0 }}>
                {weather === 'fog' && <FogShader />}
            </div>

            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'sunny' ? 1 : 0 }}>
                {weather === 'sunny' && <SunnyShader />}
            </div>
        </div>
    );
};

export default WeatherDisplay;
