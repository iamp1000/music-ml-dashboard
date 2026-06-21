'use client';
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Swirling Galaxy Particles ────────────────────────────────
// 5000 particles arranged in a spiral galaxy shape that slowly
// rotates and gently reacts to the mouse cursor.

function Galaxy() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 5000;
  const branches = 5;
  const spin = 1.5;
  const randomness = 0.4;

  const [positions, colors, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const scl = new Float32Array(count);

    const colorInside = new THREE.Color('#ff6baf');
    const colorOutside = new THREE.Color('#1b3fff');

    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 5;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = radius * spin;

      const rx = (Math.random() - 0.5) * randomness * radius;
      const ry = (Math.random() - 0.5) * randomness * radius * 0.4;
      const rz = (Math.random() - 0.5) * randomness * radius;

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * radius + rx;
      pos[i * 3 + 1] = ry;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

      const mixedColor = colorInside.clone().lerp(colorOutside, radius / 5);
      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;

      scl[i] = Math.random();
    }
    return [pos, col, scl];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;

    // Subtle tilt toward mouse
    const targetX = state.pointer.y * 0.15;
    const targetZ = -state.pointer.x * 0.15;
    pointsRef.current.rotation.x += (targetX - pointsRef.current.rotation.x) * 0.02;
    pointsRef.current.rotation.z += (targetZ - pointsRef.current.rotation.z) * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Core glow at center ──────────────────────────────────────
function CoreGlow() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const s = 1.0 + Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
    </mesh>
  );
}

// ─── Orbital Ring ─────────────────────────────────────────────
function OrbitalRing({ radius, speed, color, opacity }: { radius: number; speed: number; color: string; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.3;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.005, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function GalaxyCanvas() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Galaxy />
        <CoreGlow />
        <OrbitalRing radius={2.0} speed={0.15} color="#ff6baf" opacity={0.3} />
        <OrbitalRing radius={3.2} speed={-0.1} color="#4d6bff" opacity={0.2} />
        <OrbitalRing radius={4.5} speed={0.08} color="#00ddff" opacity={0.1} />
      </Canvas>
    </div>
  );
}
