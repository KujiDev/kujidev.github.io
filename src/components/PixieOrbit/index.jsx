import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIXIES } from '@/hooks/usePixies';
import { useSlotMap, PIXIE_SLOTS } from '@/hooks/useSlotMap';

/**
 * Single Pixie - a glowing fairy-like orb inspired by Zelda's Navi
 * Orbits around a point with gentle bobbing motion
 */
const Pixie = memo(function Pixie({ pixieData, index, totalCount }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const innerGlowRef = useRef();
  const outerGlowRef = useRef();
  const wingsRef = useRef();
  
  // Random offsets for organic movement
  const offsets = useMemo(() => ({
    phase: (index / totalCount) * Math.PI * 2, // Evenly distribute around orbit
    bobSpeed: 2 + Math.random() * 0.5,
    bobAmount: 0.08 + Math.random() * 0.04,
    wobbleSpeed: 3 + Math.random(),
    orbitSpeed: 0.4 + Math.random() * 0.1,
    orbitRadius: 0.8 + index * 0.15,
    orbitHeight: 1.8 + Math.random() * 0.3,
  }), [index, totalCount]);
  
  // Base colors
  const baseColor = useMemo(() => new THREE.Color(pixieData.color), [pixieData.color]);
  const glowColor = useMemo(() => new THREE.Color(pixieData.glowColor), [pixieData.glowColor]);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { phase, bobSpeed, bobAmount, wobbleSpeed, orbitSpeed, orbitRadius, orbitHeight } = offsets;
    
    if (groupRef.current) {
      // Orbit around center
      const orbitAngle = t * orbitSpeed + phase;
      const x = Math.cos(orbitAngle) * orbitRadius;
      const z = Math.sin(orbitAngle) * orbitRadius;
      
      // Bobbing motion
      const bob = Math.sin(t * bobSpeed + phase) * bobAmount;
      const y = orbitHeight + bob;
      
      groupRef.current.position.set(x, y, z);
      
      // Slight wobble rotation
      groupRef.current.rotation.x = Math.sin(t * wobbleSpeed) * 0.1;
      groupRef.current.rotation.z = Math.cos(t * wobbleSpeed * 0.7) * 0.1;
    }
    
    // Pulsing glow intensity
    const pulse = 1.5 + Math.sin(t * 4 + phase) * 0.5 + Math.sin(t * 7 + phase) * 0.3;
    
    if (coreRef.current) {
      coreRef.current.material.color.copy(baseColor).multiplyScalar(pulse * 2);
    }
    if (innerGlowRef.current) {
      innerGlowRef.current.material.color.copy(glowColor).multiplyScalar(pulse * 1.5);
      innerGlowRef.current.scale.setScalar(1 + Math.sin(t * 5 + phase) * 0.1);
    }
    if (outerGlowRef.current) {
      outerGlowRef.current.material.opacity = 0.15 + Math.sin(t * 3 + phase) * 0.05;
      outerGlowRef.current.scale.setScalar(1 + Math.sin(t * 2 + phase) * 0.15);
    }
    
    // Wing flutter
    if (wingsRef.current) {
      const flutter = Math.sin(t * 20 + phase) * 0.3;
      wingsRef.current.children[0].rotation.z = 0.3 + flutter;
      wingsRef.current.children[1].rotation.z = -0.3 - flutter;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Core - bright center */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={pixieData.color} toneMapped={false} />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial 
          color={pixieData.glowColor} 
          transparent 
          opacity={0.6} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Outer glow / aura */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial 
          color={pixieData.color} 
          transparent 
          opacity={0.15} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Wings - simple transparent planes */}
      <group ref={wingsRef} position={[0, 0, 0]}>
        {/* Left wing */}
        <mesh position={[-0.05, 0.02, 0]} rotation={[0, 0.5, 0.3]}>
          <planeGeometry args={[0.08, 0.12]} />
          <meshBasicMaterial 
            color={pixieData.color} 
            transparent 
            opacity={0.4} 
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* Right wing */}
        <mesh position={[0.05, 0.02, 0]} rotation={[0, -0.5, -0.3]}>
          <planeGeometry args={[0.08, 0.12]} />
          <meshBasicMaterial 
            color={pixieData.color} 
            transparent 
            opacity={0.4} 
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      
      {/* Sparkle particles trail - static positions that fade */}
      {[...Array(4)].map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const dist = 0.1 + i * 0.02;
        return (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle) * dist,
              -0.05 - i * 0.03,
              Math.sin(angle) * dist
            ]}
          >
            <sphereGeometry args={[0.01 - i * 0.002, 4, 4]} />
            <meshBasicMaterial 
              color={pixieData.color} 
              transparent 
              opacity={0.5 - i * 0.1}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
});

/**
 * PixieOrbit - Container for all equipped pixies orbiting the player
 * Place this as a child of the player group
 */
export default function PixieOrbit() {
  const { slotMap } = useSlotMap();
  
  // Get equipped pixies from slot map - use slotMap directly for stable reference
  const equippedPixies = useMemo(() => {
    return PIXIE_SLOTS
      .map(slot => slotMap?.[slot.id])
      .filter(Boolean)
      .map(id => PIXIES[id])
      .filter(Boolean);
  }, [slotMap]);
  
  if (equippedPixies.length === 0) return null;
  
  return (
    <group>
      {equippedPixies.map((pixie, index) => (
        <Pixie 
          key={pixie.id} 
          pixieData={pixie} 
          index={index} 
          totalCount={equippedPixies.length}
        />
      ))}
    </group>
  );
}
