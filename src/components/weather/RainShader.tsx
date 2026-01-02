import React, { useEffect, useRef } from 'react';
import { useSound } from '@/contexts/SoundContext';

const RainShader: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { playSound } = useSound(); // We'll assume playSound handles 'thunder' later

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
        let nextLightningDelay = 3000;
        let shakeDuration = 0;

        const settings = {
            rainCount: 1600,
            rainSpeed: 22,
            baseWind: -3
        };

        class Drop {
            x = 0; y = 0; z = 0; len = 0; velY = 0; opacity = 0;

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
            x: number; y: number; vx: number; vy: number; life: number;
            constructor(x: number, y: number) {
                this.x = x; this.y = y;
                this.vx = (Math.random() * 4) - 2;
                this.vy = (Math.random() * -4) - 2;
                this.life = 1.0;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                this.vy += 0.2; this.life -= 0.05;
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
            let currentX = x; let currentY = y;
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
            lightningType = 2; // Strong bolt
            nextLightningDelay = Math.random() * 7000 + 5000;
            lastLightningTime = Date.now();
            shakeDuration = 20;

            // Trigger AUDIO via context
            // checking simple rate limit or debounce might be good but Date.now() check above handles it
            playSound('thunder');
        }

        function animate() {
            const now = Date.now();
            if (!ctx) return;

            // 1. Camera Shake
            if (shakeDuration > 0) {
                const shakeX = (Math.random() * 10 - 5);
                const shakeY = (Math.random() * 10 - 5);
                container.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                shakeDuration--;
            } else {
                container.style.transform = `translate(0px, 0px)`;
            }

            // 2. Clear Background for Transparency
            ctx.clearRect(0, 0, w, h);

            windTime += 0.005;

            // 3. Draw Lightning (Overlay only)
            if (flashOpacity > 0) {
                // Flash entire screen white/blue with alpha
                ctx.fillStyle = `rgba(180, 200, 255, ${flashOpacity * 0.3})`;
                ctx.fillRect(0, 0, w, h);

                // Draw bolt
                if (lightningType === 2 && flashOpacity > 0.3) {
                    drawLightningBolt(Math.random() * w, 0, flashOpacity);
                }
                flashOpacity -= Math.random() * 0.04 + 0.01;
            }

            // 4. Trigger Lightning Logic
            if (now - lastLightningTime > nextLightningDelay && flashOpacity <= 0) {
                triggerLightning();
            }

            // 5. Rain & Splashes
            rainDrops.forEach(drop => { drop.fall(); drop.draw(); });
            for (let i = splashes.length - 1; i >= 0; i--) {
                let s = splashes[i]; s.update(); s.draw();
                if (s.life <= 0) splashes.splice(i, 1);
            }

            animationFrameId = requestAnimationFrame(animate);
        }

        const resize = () => {
            if (canvas) {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
                // Re-init rain to cover new area? Or just let it flow.
                // initRain(); // Maybe better to just let it adapt or maintain count
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
    }, []);

    return (
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
            <canvas ref={canvasRef} className="block" />
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[#05080a]/95 to-transparent pointer-events-none z-[2]" />
        </div>
    );
};

export default RainShader;
