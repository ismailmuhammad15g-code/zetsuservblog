import React, { useEffect, useRef, useState, useCallback } from 'react';

const RainEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const thunderAudioRef = useRef<HTMLAudioElement | null>(null);
    const rainAudioContextRef = useRef<AudioContext | null>(null);
    const rainNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const rainGainNodeRef = useRef<GainNode | null>(null);
    const userHasInteracted = useRef(false);
    const [audioReady, setAudioReady] = useState(false);

    // Seamless audio initialization on first user interaction
    const initAudioOnInteraction = useCallback(() => {
        if (userHasInteracted.current) return;
        userHasInteracted.current = true;
        setAudioReady(true);
        console.log('🎵 RainEffect: User interaction detected, audio ready');
    }, []);

    // Add global listeners for ANY user interaction
    useEffect(() => {
        const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousedown'];

        const handler = () => {
            initAudioOnInteraction();
            events.forEach(e => document.removeEventListener(e, handler, true));
        };

        events.forEach(e => {
            document.addEventListener(e, handler, { passive: true, capture: true });
        });

        return () => {
            events.forEach(e => document.removeEventListener(e, handler, true));
        };
    }, [initAudioOnInteraction]);

    // Rain Audio - starts only after user interaction
    useEffect(() => {
        if (!audioReady) return;

        const initRainSound = async () => {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (!rainAudioContextRef.current) {
                    rainAudioContextRef.current = new AudioContextClass();
                }
                const audioCtx = rainAudioContextRef.current;

                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }

                // Don't recreate if already playing
                if (rainNoiseSourceRef.current) return;

                // Create rain noise buffer (brown noise)
                const bufferSize = 2 * audioCtx.sampleRate;
                const noiseBuffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);

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

                const noiseSource = audioCtx.createBufferSource();
                noiseSource.buffer = noiseBuffer;
                noiseSource.loop = true;

                const lowPass = audioCtx.createBiquadFilter();
                lowPass.type = 'lowpass';
                lowPass.frequency.value = 800;

                const highPass = audioCtx.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = 200;

                const gainNode = audioCtx.createGain();
                // Start at 0 for fade-in
                gainNode.gain.value = 0;
                rainGainNodeRef.current = gainNode;

                noiseSource.connect(lowPass);
                lowPass.connect(highPass);
                highPass.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                noiseSource.start();
                rainNoiseSourceRef.current = noiseSource;

                // FADE IN over 2 seconds
                gainNode.gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.5);

                console.log('🌧️ RainEffect: Rain sound started with fade-in');
            } catch (error) {
                console.log('RainEffect audio error (suppressed):', error);
            }
        };

        initRainSound();
    }, [audioReady]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize Thunder Audio
        const thunderAudio = new Audio('https://actions.google.com/sounds/v1/weather/thunder_crack.ogg');
        thunderAudio.volume = 1.0;
        thunderAudioRef.current = thunderAudio;

        // Animation Variables
        let animationFrameId: number;
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;

        let rainDrops: Drop[] = [];
        let splashes: SplashParticle[] = [];
        let lightningType = 0;
        let flashOpacity = 0;
        let windTime = 0;

        // Lightning Timing
        let lastLightningTime = Date.now();
        let nextLightningDelay = 3000;
        let shakeDuration = 0;

        const settings = {
            rainCount: 1600,
            rainSpeed: 22,
            baseWind: -3
        };

        class Drop {
            x: number = 0;
            y: number = 0;
            z: number = 0;
            len: number = 0;
            velY: number = 0;
            opacity: number = 0;

            constructor() { this.init(true); }

            init(randomY = false) {
                this.z = Math.random() * 0.5 + 0.5;
                this.x = Math.random() * (w + 400) - 200;
                this.y = randomY ? Math.random() * h : -50;
                this.len = (this.z * 25) + 10;
                this.velY = (this.z * settings.rainSpeed) + (Math.random() * 5);
                this.opacity = this.z * 0.5;
            }

            fall() {
                const currentWind = settings.baseWind + (Math.sin(windTime) * 1.5);
                this.x += currentWind * this.z;
                this.y += this.velY;
                if (this.y > h) {
                    if (this.z > 0.7 && Math.random() > 0.5) createSplash(this.x, h);
                    this.init();
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(180, 200, 220, ${this.opacity})`;
                ctx.lineWidth = this.z * 1.5;
                const currentWind = settings.baseWind + (Math.sin(windTime) * 1.5);
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + (currentWind * this.z * 2), this.y + this.len);
                ctx.stroke();
            }
        }

        class SplashParticle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            life: number;

            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() * 4) - 2;
                this.vy = (Math.random() * -4) - 2;
                this.life = 1.0;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.2;
                this.life -= 0.05;
            }
            draw() {
                if (!ctx) return;
                ctx.fillStyle = `rgba(180, 200, 220, ${this.life * 0.5})`;
                ctx.fillRect(this.x, this.y, 2, 2);
            }
        }

        function createSplash(x: number, y: number) {
            for (let i = 0; i < 3; i++) splashes.push(new SplashParticle(x, y));
        }

        function initRain() {
            rainDrops = [];
            for (let i = 0; i < settings.rainCount; i++) rainDrops.push(new Drop());
        }

        function drawLightningBolt(x: number, y: number, opacity: number) {
            if (!ctx) return;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(240, 245, 255, ${opacity})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 40;
            ctx.shadowColor = "rgba(220, 230, 255, 0.9)";
            let currentX = x;
            let currentY = y;
            ctx.moveTo(currentX, currentY);
            while (currentY < h) {
                let newX = currentX + (Math.random() * 40 - 20);
                let newY = currentY + (Math.random() * 30 + 10);
                ctx.lineTo(newX, newY);
                currentX = newX; currentY = newY;
                if (Math.random() > 0.85) {
                    ctx.save(); ctx.beginPath();
                    ctx.moveTo(currentX, currentY);
                    ctx.lineTo(currentX + (Math.random() * 50 - 25), currentY + 40);
                    ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
                }
            }
            ctx.stroke(); ctx.shadowBlur = 0;
        }

        function triggerLightning() {
            flashOpacity = 1;
            lightningType = 2; // Strong lightning

            // Random delay for next strike (5-12s)
            nextLightningDelay = Math.random() * 7000 + 5000;
            lastLightningTime = Date.now();

            // Shake screen
            shakeDuration = 20;

            // Play Thunder
            if (thunderAudio) {
                thunderAudio.currentTime = 0;
                thunderAudio.play().catch(() => { });
            }
        }

        const animate = () => {
            if (!ctx) return;
            const now = Date.now();

            // 1. Camera Shake Logic
            if (shakeDuration > 0 && canvas) {
                const shakeX = (Math.random() * 10 - 5);
                const shakeY = (Math.random() * 10 - 5);
                canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                shakeDuration--;
            } else if (canvas) {
                canvas.style.transform = `translate(0px, 0px)`;
            }

            // 2. Dynamic Background
            const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
            if (flashOpacity > 0) {
                bgGradient.addColorStop(0, `rgba(40, 50, 70, ${1 - flashOpacity})`);
                bgGradient.addColorStop(0, `rgba(120, 130, 160, ${flashOpacity})`);
            } else {
                bgGradient.addColorStop(0, 'rgba(5, 8, 10, 0.95)'); // Slightly transparent base
                bgGradient.addColorStop(1, 'rgba(2, 2, 5, 0.98)');
            }
            ctx.fillStyle = bgGradient;
            ctx.clearRect(0, 0, w, h); // Clear first
            ctx.fillRect(0, 0, w, h);

            windTime += 0.005;

            // 3. Draw Lightning
            if (flashOpacity > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity * 0.2})`;
                ctx.fillRect(0, 0, w, h);
                if (lightningType === 2 && flashOpacity > 0.3) {
                    drawLightningBolt(Math.random() * w, 0, flashOpacity);
                }
                // Fade out
                flashOpacity -= Math.random() * 0.04 + 0.01;
            }

            // 4. Trigger Next Lightning
            if (now - lastLightningTime > nextLightningDelay && flashOpacity <= 0) {
                triggerLightning();
            }

            // 5. Draw Rain & Splashes
            rainDrops.forEach(drop => { drop.fall(); drop.draw(); });
            for (let i = splashes.length - 1; i >= 0; i--) {
                let s = splashes[i]; s.update(); s.draw();
                if (s.life <= 0) splashes.splice(i, 1);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            initRain();
        };

        // Initialize
        initRain();
        animate();
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (rainNoiseSourceRef.current) {
                try {
                    rainNoiseSourceRef.current.stop();
                    rainNoiseSourceRef.current.disconnect();
                } catch (e) { /* suppress */ }
            }
            if (thunderAudio) thunderAudio.pause();
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="fixed inset-0 z-0 pointer-events-none transition-transform duration-100 ease-out"
                style={{ background: 'transparent' }}
            />
            {/* Ground Fog Overlay */}
            <div className="fixed bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[rgba(5,8,10,0.95)] to-transparent z-[1] pointer-events-none" />
        </>
    );
};

export default RainEffect;
