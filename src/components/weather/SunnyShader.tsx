import React, { useEffect, useRef } from 'react';

const SunnyShader: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { alpha: true });
        if (!gl) return;

        // Vertex Shader
        const vsSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment Shader
        const fsSource = `
            #ifdef GL_ES
            precision mediump float;
            #endif

            uniform vec2 u_resolution;
            uniform float u_time;

            float random (in vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float noise (in vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                vec2 u = f*f*(3.0-2.0*f);
                return mix(mix(random(i + vec2(0.0, 0.0)), 
                               random(i + vec2(1.0, 0.0)), u.x),
                           mix(random(i + vec2(0.0, 1.0)), 
                               random(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            float fbm ( in vec2 _st) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5),
                                -sin(0.5), cos(0.50));
                for (int i = 0; i < 5; ++i) {
                    v += a * noise(_st);
                    _st = rot * _st * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 uv = gl_FragCoord.xy/u_resolution.xy;
                uv.x *= u_resolution.x/u_resolution.y;

                // Sun position (top right corner)
                vec2 sunPos = vec2(u_resolution.x/u_resolution.y * 0.85, 0.85);
                float dist = length(uv - sunPos);
                
                // Sun core glow (golden/orange)
                float sunCore = 0.03 / dist;
                sunCore = clamp(sunCore, 0.0, 1.0);
                
                // Sun rays (only visible near sun)
                float angle = atan(uv.y - sunPos.y, uv.x - sunPos.x);
                float rays = sin(angle * 12.0 + u_time * 0.5) * 0.5 + 0.5;
                rays *= smoothstep(0.5, 0.0, dist); // Only near sun
                rays *= 0.3;

                // Light particles / dust floating
                float particles = 0.0;
                for (int i = 0; i < 3; i++) {
                    vec2 particleUV = uv * (2.0 + float(i));
                    particleUV.y += u_time * 0.02 * (1.0 + float(i) * 0.5);
                    particleUV.x += sin(u_time * 0.3 + float(i)) * 0.1;
                    float n = noise(particleUV * 10.0);
                    particles += smoothstep(0.7, 0.9, n) * 0.15;
                }
                
                // Golden light haze at top
                float haze = smoothstep(0.3, 1.0, uv.y) * 0.15;
                haze *= smoothstep(0.5, 1.0, 1.0 - abs(uv.x - sunPos.x));
                
                // Combine effects
                float effect = sunCore + rays + particles + haze;
                
                // Golden/warm color for all effects
                vec3 sunColor = vec3(1.0, 0.85, 0.4); // Golden
                vec3 finalColor = sunColor * effect;
                
                // Alpha is based on effect intensity - fully transparent where no sun effect
                float alpha = clamp(effect, 0.0, 0.8);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        function createShader(gl: WebGLRenderingContext, type: number, source: string) {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const positionLocation = gl.getAttribLocation(program, "a_position");
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        const timeLocation = gl.getUniformLocation(program, "u_time");

        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };
        window.addEventListener('resize', resize);
        resize();

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const render = (time: number) => {
            time *= 0.001;
            // Clear to fully transparent
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            gl.uniform1f(timeLocation, time);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animationFrameId = requestAnimationFrame(render);
        };
        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
            gl.deleteProgram(program);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none block"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};

export default SunnyShader;
