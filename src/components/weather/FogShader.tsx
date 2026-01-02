import React, { useEffect, useRef } from 'react';

const FogShader: React.FC = () => {
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

            #define NUM_OCTAVES 4
            float fbm ( in vec2 _st) {
                float v = 0.0;
                float a = 0.5;
                vec2 shift = vec2(100.0);
                mat2 rot = mat2(cos(0.5), sin(0.5),
                                -sin(0.5), cos(0.50));
                for (int i = 0; i < NUM_OCTAVES; ++i) {
                    v += a * noise(_st);
                    _st = rot * _st * 2.0 + shift;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 st = gl_FragCoord.xy/u_resolution.xy;
                st.x *= u_resolution.x/u_resolution.y;
                st *= 2.5;

                float time = u_time * 0.15;

                vec2 q = vec2(0.);
                q.x = fbm( st + 0.00*time);
                q.y = fbm( st + vec2(1.0));

                vec2 r = vec2(0.);
                r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time );
                r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time);

                float f = fbm(st+r);

                vec3 color = vec3(0.02, 0.02, 0.05); // Deep background
                vec3 fogColor = vec3(0.2, 0.25, 0.3); // Far fog
                vec3 cloudColor = vec3(0.8, 0.85, 0.95); // Near highlight

                color = mix(color, fogColor, clamp((f*f)*4.0,0.0,1.0));
                color = mix(color, cloudColor, clamp(length(q),0.0,1.0));
                
                color = mix(color, vec3(1.0), pow(f, 5.0) * 0.4);

                color = pow(color, vec3(0.9)); 

                vec2 uv = gl_FragCoord.xy/u_resolution.xy;
                float vig = 1.0 - smoothstep(0.5, 1.5, length(uv - 0.5) * 1.2);
                color *= vig;

                // Use the density 'f' to determine alpha.
                // We want the fog to be an overlay, so high density = high opacity, low density = low opacity.
                // Background should be mostly transparent to let app background show.
                float alpha = clamp(f * 0.6, 0.0, 0.6); // Max opacity 0.6 to keep purple background visible

                gl_FragColor = vec4(color, alpha);
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

export default FogShader;
