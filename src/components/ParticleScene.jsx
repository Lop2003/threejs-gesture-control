import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getShapePoints, Shapes } from '../data/shapes';
import { handInput } from '../systems/HandInput';

export function ParticleScene({ currentShape, particleColor, videoRef }) {
    const count = 10000; // Increased to 20k for solid shape
    const meshRef = useRef();


    // Store current positions and target positions
    const [positions, targets] = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const targets = new Float32Array(count * 3);

        // Init positions randomly
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10;
            targets[i] = 0;
        }

        return [positions, targets];
    }, []);

    // Load target shape when currentShape changes
    useEffect(() => {
        const newTargets = getShapePoints(currentShape, count);
        // Copy to targets array
        for (let i = 0; i < newTargets.length && i < targets.length; i++) {
            targets[i] = newTargets[i];
        }
    }, [currentShape]);

    // Reusable dummy object for instance matrix update (if using InstancedMesh? No, Points is better for 4000)
    // Actually, simple Points with BufferGeometry is easiest for moving individual vertices.
    const geometryRef = useRef();

    useFrame((state, delta) => {
        if (!geometryRef.current) return;

        // 1. Detect Hand Input
        let handScale = 1.0;
        let rotation = { x: 0, y: 0, z: 0 };

        if (videoRef.current && videoRef.current.readyState >= 2) {
            const results = handInput.detect(videoRef.current);
            const metrics = handInput.getHandMetrics(results);

            // Scale Logic
            handScale = 0.5 + (1.0 - metrics.tension) * 1.5;

            // Rotation Logic (if available)
            if (metrics.rotation) {
                rotation = metrics.rotation;
            }

            // metrics.tension: 0 (open) to 1 (closed)
            // Mapping: 
            // Open hand (tension 0) -> Scale 1 (Normal) or Expanded?
            // App requirement: "Control scaling and expansion ... detecting tension and closing"
            // Let's say Closed -> Small/Compressed, Open -> Expanded.
            // or Tension -> Explosion.

            // Interpretation: 
            // High Tension (Fist) -> Contraction (Scale 0.5)
            // Low Tension (Open) -> Expansion (Scale 1.5)

            // Smooth transition?
            // We can lerp this handScale if we want, but let's just use raw for responsiveness first.
            // handScale = 0.5 + (1.0 - metrics.tension) * 1.5; // Range: 0.5 to 2.0

            // Or "Fireworks" logic: if Fireworks + fist -> explode?
            // Stick to scale for generic shapes.
        }

        // 2. Update Particles
        const positionsAttr = geometryRef.current.attributes.position;
        const currentPositions = positionsAttr.array;

        // Lerp speed
        const speed = 3.0 * delta;

        for (let i = 0; i < count; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            // Target coordinates
            const tx = targets[ix] * handScale;
            const ty = targets[iy] * handScale;
            const tz = targets[iz] * handScale;

            // Current coordinates
            const cx = currentPositions[ix];
            const cy = currentPositions[iy];
            const cz = currentPositions[iz];

            // Simple Lerp
            currentPositions[ix] += (tx - cx) * speed;
            currentPositions[iy] += (ty - cy) * speed;
            currentPositions[iz] += (tz - cz) * speed;

            // Add some noise/drift if fireworks or just generally for "life"
            if (currentShape === Shapes.FIREWORKS) {
                // Determine direction from center
                // This logic overrides the shape target usage above for fireworks
                // But simplified: Just use the Random Sphere shape we generated + Expansion
            }
        }

        positionsAttr.needsUpdate = true;

        // Auto-rotation + Hand Rotation
        if (meshRef.current) {
            // Smoothly interpolate rotation
            // Base rotation speed - SLOWED DOWN
            const autoRotate = delta * 0.05;

            // Apply hand rotation with some damping

            // Let's use Lerp for smooth rotation
            // Target Rotation:
            const targetRotX = rotation.x; // Pitch (Up/Down)
            // Yaw (Left/Right) - additive so it keeps spinning
            const targetRotY = rotation.y * 0.5 + meshRef.current.rotation.y + autoRotate;

            const targetRotZ = rotation.z; // Roll (Twist)

            // We want to Blend Auto-Rotation with Hand Control
            // Reduced Lerp factor from 5 to 2 for "slower", smoother weight
            const smoothFactor = 2.0;

            meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * smoothFactor * delta;
            meshRef.current.rotation.z += (targetRotZ - meshRef.current.rotation.z) * smoothFactor * delta;

            meshRef.current.rotation.y += autoRotate;
        }
    });

    // Shader Material for Particles
    const shaderMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(particleColor) },
                uTime: { value: 0 },
                uSize: { value: 1.0 } // Increased base size significantly
            },
            vertexShader: `
                uniform float uTime;
                uniform float uSize;
                uniform vec3 uColor; // Base color
                attribute float sizeBias; 
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    vec3 pos = position;
                    
                    // Organic "breathing" movement - REDUCED AMPLITUDE
                    // Was 0.02, reducing to 0.005 to keep shape clear
                    pos.x += sin(uTime * 1.5 + pos.y * 2.0) * 0.005;
                    pos.y += cos(uTime * 1.2 + pos.x * 2.0) * 0.005;
                    pos.z += sin(uTime * 1.8 + pos.z * 2.0) * 0.005;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Size attenuation - Boosted size significantly for visibility
                    gl_PointSize = uSize * (40.0 / -mvPosition.z);
                    
                    // Color Gradient Logic
                    // Mix base color with a shifted version based on position/depth
                    
                    float gradient = smoothstep(-2.0, 2.0, pos.y);
                    vec3 topColor = uColor + vec3(0.2, 0.2, 0.0);
                    vec3 bottomColor = uColor * 0.6; 
                    
                    vColor = mix(bottomColor, topColor, gradient);
                    
                    // Distance fade
                    float dist = length(pos);
                    vAlpha = 1.0 - smoothstep(5.0, 15.0, dist);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                
                void main() {
                    // Circular soft glow
                    vec2 uv = gl_PointCoord.xy - 0.5;
                    float r = length(uv);
                    
                    if (r > 0.5) discard;
                    
                    // Extremely sharp bright core for "sparkle"
                    float glow = 1.0 - smoothstep(0.0, 0.4, r);
                    glow = pow(glow, 2.0); 
                    
                    // Boost brightness: No transparency attenuation at core
                    // Additive blending handles the rest
                    // Manual Bloom: Multiply color by high value (e.g. 3.0) to make it "hot"
                    gl_FragColor = vec4(vColor * 2.0, glow * vAlpha * 2.5);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
    }, []);

    // Update uniforms
    useFrame((state) => {
        if (shaderMaterial) {
            shaderMaterial.uniforms.uColor.value.set(particleColor);
            shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            {/* <pointsMaterial
                size={0.05}
                color={particleColor}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            /> */}
            <primitive object={shaderMaterial} attach="material" />
        </points>
    );
}
