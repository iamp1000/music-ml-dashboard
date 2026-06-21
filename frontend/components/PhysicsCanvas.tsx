'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, InstancedRigidBodies, InstancedRigidBodyProps, RapierRigidBody } from '@react-three/rapier';
import { Environment, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Custom component to manage the instances
function FloatingGlassShapes({ count = 40 }) {
  const rigidBodyRefs = useRef<RapierRigidBody[]>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // Generate random initial transforms
  const instances = useMemo(() => {
    const insts: InstancedRigidBodyProps[] = [];
    for (let i = 0; i < count; i++) {
      insts.push({
        key: 'instance_' + i,
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15 - 5 
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: [1, 1, 1].map(() => 0.5 + Math.random() * 1.2) as [number, number, number],
      });
    }
    return insts;
  }, [count]);

  // Apply a gentle force towards the center to keep them from drifting off forever
  useFrame(() => {
    if (!rigidBodyRefs.current) return;
    rigidBodyRefs.current.forEach((api) => {
      if (!api) return;
      const pos = api.translation();
      const force = {
        x: -pos.x * 0.02,
        y: -pos.y * 0.02,
        z: (-5 - pos.z) * 0.02
      };
      // Add very subtle noise
      force.x += (Math.random() - 0.5) * 0.1;
      force.y += (Math.random() - 0.5) * 0.1;
      force.z += (Math.random() - 0.5) * 0.1;
      
      api.applyImpulse(force, true);
    });
  });

  return (
    <InstancedRigidBodies
      ref={rigidBodyRefs}
      positions={instances.map((i) => i.position as [number, number, number])}
      rotations={instances.map((i) => i.rotation as [number, number, number])}
      scales={instances.map((i) => i.scale as [number, number, number])}
      colliders="hull"
      gravityScale={0} // Zero gravity
      linearDamping={1.5}
      angularDamping={1.5}
    >
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, count]} count={count}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial 
          backside 
          samples={3} 
          thickness={1.5} 
          chromaticAberration={1.5} 
          anisotropy={0.3} 
          distortion={0.5} 
          distortionScale={0.5} 
          temporalDistortion={0.2}
          color="#1a1a1a" // Dark base
          attenuationDistance={2}
          attenuationColor="#ff6baf" // Pink glowing core
        />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}

// Invisible rigid body attached to mouse to "push" objects
function ScrollRepeller() {
  const ref = useRef<RapierRigidBody>(null);

  useFrame((state) => {
    if (ref.current) {
      const x = (state.pointer.x * state.viewport.width) / 2;
      const y = (state.pointer.y * state.viewport.height) / 2;
      // We keep it at z=0 so it intersects with shapes near the camera
      ref.current.setNextKinematicTranslation({ x, y, z: 0 });
    }
  });

  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders="ball">
      <mesh visible={false}>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial />
      </mesh>
    </RigidBody>
  );
}

// We'll expose a ref to animate the camera via GSAP from the parent
export default function PhysicsCanvas() {
  return (
    <div id="canvas-container" className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: false, alpha: false }} // Keep performance high
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 10]} intensity={3} color="#ff6baf" />
        <directionalLight position={[-10, -10, -10]} intensity={3} color="#4d6bff" />
        
        {/* Simple environment for reflections */}
        <Environment preset="night" />

        <Physics>
          <ScrollRepeller />
          <FloatingGlassShapes count={35} />
        </Physics>
      </Canvas>
    </div>
  );
}
