import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'
import { createFresnelAuraMaterial } from '@/materials/fresnelAura'
import { ELEMENTS } from '@/config/actions'

// Mana shield - uses unified mana glow color
const SHIELD_COLOR = ELEMENTS.mana.glow

// Only these buffs trigger the mana shield visual
const MANA_BUFF_IDS = ['mana_body']

export default function ManaShield({ position = [0, 0, 0] }) {
  const groupRef = useRef()
  const meshRef = useRef()
  const materialRef = useRef()
  const { buffs } = usePlayerState()
  
  // Active only when mana-related buffs are present (not healing buffs)
  const isActive = buffs.some(buff => MANA_BUFF_IDS.includes(buff.id))
  
  // Create sphere geometry - sized to wrap around character
  const sphereGeometry = useMemo(() => {
    return new THREE.SphereGeometry(2.0, 32, 32)
  }, [])
  
  // Create shader material using shared factory
  const shaderMaterial = useMemo(() => {
    return createFresnelAuraMaterial({
      color: SHIELD_COLOR,
      pulseSpeed: 5.0,
      waveFreq: 3.0,
      waveSpeed: 6.0,
      colorShift: '0.1, 0.15, 0.25'
    })
  }, [])
  
  // Animate
  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) return
    
    const uniforms = materialRef.current.uniforms
    const targetOpacity = isActive ? 1.0 : 0.0
    const currentOpacity = uniforms.uOpacity.value
    
    // Skip if fully faded
    if (!isActive && currentOpacity < 0.01) {
      uniforms.uOpacity.value = 0
      if (groupRef.current) groupRef.current.visible = false
      meshRef.current.scale.setScalar(0.5)
      return
    }
    
    if (groupRef.current) groupRef.current.visible = true
    
    // Smooth opacity transition
    const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * delta * 8
    uniforms.uTime.value += delta
    uniforms.uOpacity.value = newOpacity
    
    // Scale animation
    const targetScale = isActive ? 1.0 : 0.5
    const s = meshRef.current.scale
    s.x += (targetScale - s.x) * delta * 6
    s.y += (targetScale - s.y) * delta * 6
    s.z += (targetScale - s.z) * delta * 6
  })
  
  return (
    <group ref={groupRef} position={position} visible={false}>
      <mesh ref={meshRef} scale={0.5}>
        <primitive object={sphereGeometry} attach="geometry" />
        <primitive object={shaderMaterial} ref={materialRef} attach="material" />
      </mesh>
    </group>
  )
}
