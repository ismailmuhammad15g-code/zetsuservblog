import React, { useEffect, useRef } from 'react';
import { useSound } from '@/contexts/SoundContext';

// Rain shader configuration constants
const RAIN_CONFIG = {
    /** Number of rain drops to render - reduced for performance */
    DROP_COUNT: 800,
    /** Base falling speed of rain drops */
    FALL_SPEED: 20,
    /** Base wind direction and strength (negative = left) */
    WIND_STRENGTH: -2.5,
    /** Minimum delay between lightning strikes (ms) */
    LIGHTNING_MIN_DELAY: 6000,
    /** Random additional delay for lightning (ms) */
    LIGHTNING_RANDOM_DELAY: 8000,
} as const;

const RainShader: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { playSound } = useSound();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = canvas.width;
        let h = canvas.height;
        let animationFrameId: number;

        let rainDrops: Drop[] = [];
        let splashes: SplashParticle[] = [];
        let lightningType = 0;
        let flashOpacity = 0;
        let windTime = 0;

        let lastLightningTime = Date.now();
        let nextLightningDelay = RAIN_CONFIG.LIGHTNING_MIN_DELAY;
        let shakeDuration = 0;

        class Drop {
            x = 0; y = 0; z = 0; len = 0; velY = 0; opacity = 0;

            constructor() { this.init(true); }

            init(randomY = false) {
                this.z = Math.random() * 0.5 + 0.5;
                this.x = Math.random() * (w + 300) - 150;
                this.y = randomY ? Math.random() * h : -30;
                this.len = (this.z * 20) + 8;
                this.velY = (this.z * RAIN_CONFIG.FALL_SPEED) + (Math.random() * 4);
                this.opacity = this.z * 0.45;
            }

            fall() {
                const currentWind = RAIN_CONFIG.WIND_STRENGTH + (Math.sin(windTime) * 1.2);
                this.x += currentWind * this.z;
                this.y += this.velY;
                if (this.y > h) {
                    if (this.z > 0.75 && Math.random() > 0.7) createSplash(this.x, h);
                    this.init();
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(180, 200, 220, ${this.opacity})`;
                ctx.lineWidth = this.z * 1.3;
                const currentWind = RAIN_CONFIG.WIND_STRENGTH + (Math.sin(windTime) * 1.2);
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + (currentWind * this.z * 1.8), this.y + this.len);
                ctx.stroke();
            }
        }

        class SplashParticle {
            x: number; y: number; vx: number; vy: number; life: number;
            constructor(x: number, y: number) {
                this.x = x; this.y = y;
                this.vx = (Math.random() * 3) - 1.5;
                this.vy = (Math.random() * -3) - 1.5;
                this.life = 1.0;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                this.vy += 0.15; this.life -= 0.06;
            }
            draw() {
                if (!ctx) return;
                ctx.fillStyle = `rgba(180, 200, 220, ${this.life * 0.4})`;
                ctx.fillRect(this.x, this.y, 2, 2);
            }
        }

        function createSplash(x: number, y: number) {
            // Reduced splash particles
            for (let i = 0; i < 2; i++) splashes.push(new SplashParticle(x, y));
        }

        function initRain() {
            rainDrops = [];
            for (let i = 0; i < RAIN_CONFIG.DROP_COUNT; i++) rainDrops.push(new Drop());
        }

        function drawLightningBolt(x: number, y: number, opacity: number) {
            if (!ctx) return;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(240, 245, 255, ${opacity})`;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 30;
            ctx.shadowColor = "rgba(220, 230, 255, 0.8)";
            let currentX = x; let currentY = y;
            ctx.moveTo(currentX, currentY);
            while (currentY < h) {
                let newX = currentX + (Math.random() * 35 - 17);
                let newY = currentY + (Math.random() * 25 + 10);
                ctx.lineTo(newX, newY);
                currentX = newX; currentY = newY;
                if (Math.random() > 0.88) {
                    ctx.save(); ctx.beginPath();
                    ctx.moveTo(currentX, currentY);
                    ctx.lineTo(currentX + (Math.random() * 40 - 20), currentY + 35);
                    ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
                }
            }
            ctx.stroke(); ctx.shadowBlur = 0;
        }

        function triggerLightning() {
            flashOpacity = 1;
            lightningType = 2;
            nextLightningDelay = Math.random() * RAIN_CONFIG.LIGHTNING_RANDOM_DELAY + RAIN_CONFIG.LIGHTNING_MIN_DELAY;
            lastLightningTime = Date.now();
            shakeDuration = 15;
            playSound('thunder');
        }

        function animate() {
            const now = Date.now();
            if (!ctx) return;

            // Camera Shake - simplified
            if (shakeDuration > 0) {
                const shake = shakeDuration / 15;
                const shakeX = (Math.random() * 8 - 4) * shake;
                const shakeY = (Math.random() * 8 - 4) * shake;
                container.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                shakeDuration--;
            } else {
                container.style.transform = '';
            }

            ctx.clearRect(0, 0, w, h);
            windTime += 0.004;

            // Lightning
            if (flashOpacity > 0) {
                ctx.fillStyle = `rgba(180, 200, 255, ${flashOpacity * 0.25})`;
                ctx.fillRect(0, 0, w, h);

                if (lightningType === 2 && flashOpacity > 0.35) {
                    drawLightningBolt(Math.random() * w, 0, flashOpacity);
                }
                flashOpacity -= Math.random() * 0.035 + 0.012;
            }

            // Trigger Lightning
            if (now - lastLightningTime > nextLightningDelay && flashOpacity <= 0) {
                triggerLightning();
            }

            // Rain & Splashes - optimized batch drawing
            for (const drop of rainDrops) { drop.fall(); drop.draw(); }
            for (let i = splashes.length - 1; i >= 0; i--) {
                const s = splashes[i]; s.update(); s.draw();
                if (s.life <= 0) splashes.splice(i, 1);
            }

            animationFrameId = requestAnimationFrame(animate);
        }

        const resize = () => {
            if (canvas) {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resize);
        resize();
        initRain();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [playSound]);

    return (
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
            <canvas ref={canvasRef} className="block" />
            <div className="absolute bottom-0 left-0 w-full h-[35%] bg-gradient-to-t from-[#05080a]/90 to-transparent pointer-events-none z-[2]" />
        </div>
    );
};

export default RainShader;
