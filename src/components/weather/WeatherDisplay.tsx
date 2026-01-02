import React, { useEffect, useState, useRef } from 'react';
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

    // Derived actual weather based on setting
    const weather = weatherMode === 'auto' ? autoWeather : weatherMode;

    // Audio Refs (Wind for Fog)
    const windOscRef = useRef<AudioContext | null>(null);
    const windGainRef = useRef<GainNode | null>(null);

    // Fetch Weather Logic (Only relevant if auto, but we keep fetching to keep state sync)
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
                // Fallback
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

    // ... (Audio logic remains same, just depends on 'weather' derived var) ...

    // Rain Audio Management - Using Web Audio API (like thunder) to avoid autoplay blocking
    const rainAudioContextRef = useRef<AudioContext | null>(null);
    const rainNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const rainGainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        // Only play rain sound if weather is rain and not muted
        if (weather !== 'rain' || isMuted) {
            // Stop rain sound
            if (rainGainNodeRef.current && rainAudioContextRef.current) {
                rainGainNodeRef.current.gain.setTargetAtTime(0, rainAudioContextRef.current.currentTime, 0.5);
            }
            return;
        }

        const initRainSound = async () => {
            // Check if user has interacted (sound permission granted)
            const hasPermission = localStorage.getItem('zetsu_sound_permission') === 'accepted';
            if (!hasPermission) return;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!rainAudioContextRef.current) {
                rainAudioContextRef.current = new AudioContextClass();
            }
            const ctx = rainAudioContextRef.current;

            // Resume if suspended
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Create rain noise buffer (brown noise filtered for rain-like sound)
            const bufferSize = 2 * ctx.sampleRate;
            const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

            for (let channel = 0; channel < 2; channel++) {
                const data = noiseBuffer.getChannelData(channel);
                let lastOut = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    // Brown noise filter
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.5; // Amplify
                }
            }

            // Clean up previous source if exists
            if (rainNoiseSourceRef.current) {
                rainNoiseSourceRef.current.stop();
                rainNoiseSourceRef.current.disconnect();
            }

            // Create audio nodes
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;

            // Low-pass filter for rain-like sound
            const lowPassFilter = ctx.createBiquadFilter();
            lowPassFilter.type = 'lowpass';
            lowPassFilter.frequency.value = 800;
            lowPassFilter.Q.value = 0.7;

            // High-pass filter to remove rumble
            const highPassFilter = ctx.createBiquadFilter();
            highPassFilter.type = 'highpass';
            highPassFilter.frequency.value = 200;

            // Gain node for volume control
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.4 * masterVolume;
            rainGainNodeRef.current = gainNode;

            // Connect the chain
            noiseSource.connect(lowPassFilter);
            lowPassFilter.connect(highPassFilter);
            highPassFilter.connect(gainNode);
            gainNode.connect(ctx.destination);

            noiseSource.start();
            rainNoiseSourceRef.current = noiseSource;

            console.log('🌧️ Synthesized rain sound started');
        };

        initRainSound();

        // Volume update
        if (rainGainNodeRef.current && rainAudioContextRef.current) {
            rainGainNodeRef.current.gain.setTargetAtTime(0.4 * masterVolume, rainAudioContextRef.current.currentTime, 0.1);
        }

        return () => {
            if (rainNoiseSourceRef.current) {
                rainNoiseSourceRef.current.stop();
                rainNoiseSourceRef.current.disconnect();
                rainNoiseSourceRef.current = null;
            }
        };
    }, [weather, isMuted, masterVolume]);

    // Fog Audio Management
    useEffect(() => {
        if (weather !== 'fog' || isMuted) {
            if (windOscRef.current) {
                windOscRef.current.close();
                windOscRef.current = null;
            }
            return;
        }

        const initWind = async () => {
            if (windOscRef.current) return;
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
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
            gainNode.gain.value = 0.2 * masterVolume;

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            noise.start();
        };

        initWind();

        if (windGainRef.current) {
            windGainRef.current.gain.setTargetAtTime(0.2 * masterVolume, windOscRef.current!.currentTime, 0.1);
        }

        return () => {
            if (windOscRef.current) {
                windOscRef.current.close();
                windOscRef.current = null;
            }
        };

    }, [weather, isMuted, masterVolume]);

    // Fade-in effect to prevent flash
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`fixed inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* 
              Background Layers:
              1. Base Gradient/Image is defined in the parent page (ZetsuChallengePage) logic or global CSS.
                 The weather component sits ON TOP but uses mix-blend-mode or transparency to blend.
            */}

            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'rain' ? 1 : 0 }}>
                {weather === 'rain' && <RainShader />}
            </div>

            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'fog' ? 1 : 0 }}>
                {/* Fog needs to be semi-transparent to show background */}
                {weather === 'fog' && <FogShader />}
            </div>

            <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: weather === 'sunny' ? 1 : 0 }}>
                {/* Sunny needs to be overlay style (Sun rays etc) */}
                {weather === 'sunny' && <SunnyShader />}
            </div>
        </div>
    );
};

export default WeatherDisplay;
