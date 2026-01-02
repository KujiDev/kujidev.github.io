import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIXIES } from '@/config/pixies';
import { useSlotMap } from '@/hooks/useGame';
import { PIXIE_SLOTS } from '@/config/slots';

/**
 * Fixed positions for pixies - Lineage 2 cubic style
 * They hover behind and above the character in an arc formation
 */
const PIXIE_POSITIONS = [
  { x: 0, y: 3.2, z: -0.8 },       // Center back, highest
  { x: -0.6, y: 3.0, z: -0.6 },    // Left shoulder
  { x: 0.6, y: 3.0, z: -0.6 },     // Right shoulder
];

/**
 * Single Pixie - a glowing cubic-like orb inspired by Lineage 2 cubics
 * Hovers at a fixed position with gentle bobbing motion
 */
const Pixie = memo(function Pixie({ pixieData, index, totalCount }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const innerGlowRef = useRef();
  const outerGlowRef = useRef();
  
  // Get fixed position based on index
  const basePosition = PIXIE_POSITIONS[index] || PIXIE_POSITIONS[0];
  
  // Random offsets for organic movement (but small since position is fixed)
  const offsets = useMemo(() => ({
    phase: index * 1.2, // Phase offset for desync
    bobSpeed: 1.5 + Math.random() * 0.3,
    bobAmount: 0.03 + Math.random() * 0.02,
    swaySpeed: 0.8 + Math.random() * 0.2,
    swayAmount: 0.02,
    rotateSpeed: 0.5 + Math.random() * 0.2,
  }), [index]);
  
  // Base colors
  const baseColor = useMemo(() => new THREE.Color(pixieData.color), [pixieData.color]);
  const glowColor = useMemo(() => new THREE.Color(pixieData.glowColor), [pixieData.glowColor]);
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { phase, bobSpeed, bobAmount, swaySpeed, swayAmount, rotateSpeed } = offsets;
    
    if (groupRef.current) {
      // Subtle bobbing and swaying at fixed position
      const bob = Math.sin(t * bobSpeed + phase) * bobAmount;
      const swayX = Math.sin(t * swaySpeed + phase) * swayAmount;
      const swayZ = Math.cos(t * swaySpeed * 0.7 + phase) * swayAmount;
      
      groupRef.current.position.set(
        basePosition.x + swayX,
        basePosition.y + bob,
        basePosition.z + swayZ
      );
      
      // Gentle rotation
      groupRef.current.rotation.y = t * rotateSpeed;
      groupRef.current.rotation.x = Math.sin(t * 0.5 + phase) * 0.05;
    }
    
    // Pulsing glow intensity
    const pulse = 1.5 + Math.sin(t * 4 + phase) * 0.5 + Math.sin(t * 7 + phase) * 0.3;
    
    if (coreRef.current) {
      coreRef.current.material.color.copy(baseColor).multiplyScalar(pulse * 2);
    }
    if (innerGlowRef.current) {
      innerGlowRef.current.material.color.copy(glowColor).multiplyScalar(pulse * 1.5);
      innerGlowRef.current.scale.setScalar(1 + Math.sin(t * 5 + phase) * 0.08);
    }
    if (outerGlowRef.current) {
      outerGlowRef.current.material.opacity = 0.12 + Math.sin(t * 3 + phase) * 0.04;
      outerGlowRef.current.scale.setScalar(1 + Math.sin(t * 2 + phase) * 0.1);
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Core - bright center (cubic style - slightly larger) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={pixieData.color} toneMapped={false} />
      </mesh>
      
      {/* Inner glow */}
      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial 
          color={pixieData.glowColor} 
          transparent 
          opacity={0.5} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Outer glow / aura */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial 
          color={pixieData.color} 
          transparent 
          opacity={0.12} 
          toneMapped={false}
        />
      </mesh>
      
      {/* Inner sparkle ring - subtle rotating particles */}
      {[...Array(3)].map((_, i) => {
        const angle = (i / 3) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle) * 0.08,
              0,
              Math.sin(angle) * 0.08
            ]}
          >
            <sphereGeometry args={[0.012, 4, 4]} />
            <meshBasicMaterial 
              color={pixieData.color} 
              transparent 
              opacity={0.6}
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
