import React, { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, RootState } from '@react-three/fiber';
import { RoundedBox, MeshTransmissionMaterial, Environment } from '@react-three/drei';

interface FluidBarBgProps {
  color?: string;
}

const BarMesh: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state: RootState) => {
    if (meshRef.current) {
      // Gentle floating animation to give it an organic glass feel
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[12, 1.8, 0.5]} // Width, height, depth (tuned perfectly for the nav bar)
      radius={0.4}
      smoothness={4}
    >
      <MeshTransmissionMaterial
        backside
        samples={4}
        thickness={2}
        chromaticAberration={0.05}
        anisotropy={0.1}
        distortion={0.2}
        distortionScale={0.5}
        temporalDistortion={0.1}
        ior={1.15}
        color={color}
        resolution={1024}
        transmission={1}
        roughness={0.1}
      />
    </RoundedBox>
  );
};

export const FluidBarBg: React.FC<FluidBarBgProps> = ({ 
  color = '#2a2238' // Subtle dark glass tint matching the app's aesthetic
}) => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none rounded-xl overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 25 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="city" />
        <BarMesh color={color} />
      </Canvas>
    </div>
  );
};
