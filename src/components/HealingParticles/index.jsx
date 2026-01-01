import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'

// Configuration
const RISING_PARTICLE_COUNT = 16
const ORBIT_PARTICLE_COUNT = 8
const SPAWN_RADIUS = 0.8
const MAX_HEIGHT = 3.0
const RISE_SPEED = 0.6
const ORBIT_RADIUS = 1.2
const ORBIT_SPEED = 1.8
const PARTICLE_SIZE = 0.12

// Colors for different buff types
const POTION_COLOR = new THREE.Color('#ff6b6b') // Red/pink for health potion
const FOOD_COLOR = new THREE.Color('#60a0ff')   // Blue for mana food

// Create a soft glowing particle texture
const createParticleTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  
  return new THREE.CanvasTexture(canvas)
}

// Rising sparkle particles that float upward with gentle sway
function RisingParticles({ isActive, color, particleTexture }) {
  const pointsRef = useRef()
  const fadeRef = useRef(0)
  const timeRef = useRef(0)
  
  const { positions, lifetimes, speeds, offsets, swayPhases, sizes } = useMemo(() => {
    const pos = new Float32Array(RISING_PARTICLE_COUNT * 3)
    const life = new Float32Array(RISING_PARTICLE_COUNT)
    const spd = new Float32Array(RISING_PARTICLE_COUNT)
    const off = new Float32Array(RISING_PARTICLE_COUNT * 2) // x,z offset per particle
    const sway = new Float32Array(RISING_PARTICLE_COUNT)
    const siz = new Float32Array(RISING_PARTICLE_COUNT)
    
    for (let i = 0; i < RISING_PARTICLE_COUNT; i++) {
      // Staggered start times
      life[i] = Math.random()
      spd[i] = RISE_SPEED * (0.7 + Math.random() * 0.6)
      
      // Random spawn position around character
      const angle = Math.random() * Math.PI * 2
      const radius = SPAWN_RADIUS * (0.3 + Math.random() * 0.7)
      off[i * 2] = Math.cos(angle) * radius
      off[i * 2 + 1] = Math.sin(angle) * radius
      
      sway[i] = Math.random() * Math.PI * 2
      siz[i] = PARTICLE_SIZE * (0.6 + Math.random() * 0.8)
      
      // Initial position
      pos[i * 3] = off[i * 2]
      pos[i * 3 + 1] = life[i] * MAX_HEIGHT
      pos[i * 3 + 2] = off[i * 2 + 1]
    }
    
    return { positions: pos, lifetimes: life, speeds: spd, offsets: off, swayPhases: sway, sizes: siz }
  }, [])
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(RISING_PARTICLE_COUNT * 3), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, sizes])
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      map: particleTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    })
  }, [particleTexture])
  
  useFrame((_, delta) => {
    if (!pointsRef.current) return
    
    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position
    const colorAttr = geo.attributes.color
    const sizeAttr = geo.attributes.size
    const mat = pointsRef.current.material
    
    timeRef.current += delta
    
    // Fade in/out
    const targetFade = isActive ? 1 : 0
    fadeRef.current += (targetFade - fadeRef.current) * delta * 3
    mat.opacity = fadeRef.current
    
    if (fadeRef.current < 0.01 && !isActive) {
      mat.opacity = 0
      return
    }
    
    for (let i = 0; i < RISING_PARTICLE_COUNT; i++) {
      // Update lifetime
      lifetimes[i] += delta * speeds[i] / MAX_HEIGHT
      
      // Reset when reaching top
      if (lifetimes[i] >= 1) {
        lifetimes[i] = 0
        const angle = Math.random() * Math.PI * 2
        const radius = SPAWN_RADIUS * (0.3 + Math.random() * 0.7)
        offsets[i * 2] = Math.cos(angle) * radius
        offsets[i * 2 + 1] = Math.sin(angle) * radius
        swayPhases[i] = Math.random() * Math.PI * 2
        sizes[i] = PARTICLE_SIZE * (0.6 + Math.random() * 0.8)
      }
      
      // Gentle sway motion
      const swayAmount = 0.15 * Math.sin(lifetimes[i] * Math.PI) // More sway in middle
      const swayX = Math.sin(timeRef.current * 2 + swayPhases[i]) * swayAmount
      const swayZ = Math.cos(timeRef.current * 2.3 + swayPhases[i]) * swayAmount
      
      // Position with sway
      posAttr.array[i * 3] = offsets[i * 2] + swayX
      posAttr.array[i * 3 + 1] = lifetimes[i] * MAX_HEIGHT
      posAttr.array[i * 3 + 2] = offsets[i * 2 + 1] + swayZ
      
      // Alpha - fade in at bottom, solid in middle, fade out at top
      let alpha = 1
      if (lifetimes[i] < 0.15) {
        alpha = lifetimes[i] / 0.15
      } else if (lifetimes[i] > 0.7) {
        alpha = 1 - (lifetimes[i] - 0.7) / 0.3
      }
      
      // Size pulses slightly
      const sizePulse = 1 + 0.2 * Math.sin(timeRef.current * 3 + swayPhases[i])
      sizeAttr.array[i] = sizes[i] * sizePulse * (0.5 + alpha * 0.5)
      
      // Color with alpha
      colorAttr.array[i * 3] = color.r * alpha
      colorAttr.array[i * 3 + 1] = color.g * alpha
      colorAttr.array[i * 3 + 2] = color.b * alpha
    }
    
    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })
  
  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  )
}

// Orbiting particles that circle around the character
function OrbitingParticles({ isActive, color, particleTexture, orbitDirection = 1, heightOffset = 0 }) {
  const pointsRef = useRef()
  const fadeRef = useRef(0)
  const timeRef = useRef(0)
  
  const { angles, heights, sizes } = useMemo(() => {
    const ang = new Float32Array(ORBIT_PARTICLE_COUNT)
    const hgt = new Float32Array(ORBIT_PARTICLE_COUNT)
    const siz = new Float32Array(ORBIT_PARTICLE_COUNT)
    
    for (let i = 0; i < ORBIT_PARTICLE_COUNT; i++) {
      ang[i] = (i / ORBIT_PARTICLE_COUNT) * Math.PI * 2
      hgt[i] = heightOffset + (Math.random() - 0.5) * 0.3
      siz[i] = PARTICLE_SIZE * (0.8 + Math.random() * 0.4)
    }
    
    return { angles: ang, heights: hgt, sizes: siz }
  }, [heightOffset])
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORBIT_PARTICLE_COUNT * 3), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ORBIT_PARTICLE_COUNT * 3), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [sizes])
  
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      map: particleTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    })
  }, [particleTexture])
  
  useFrame((_, delta) => {
    if (!pointsRef.current) return
    
    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position
    const colorAttr = geo.attributes.color
    const sizeAttr = geo.attributes.size
    const mat = pointsRef.current.material
    
    timeRef.current += delta
    
    // Fade in/out
    const targetFade = isActive ? 1 : 0
    fadeRef.current += (targetFade - fadeRef.current) * delta * 3
    mat.opacity = fadeRef.current * 0.85
    
    if (fadeRef.current < 0.01 && !isActive) {
      mat.opacity = 0
      return
    }
    
    for (let i = 0; i < ORBIT_PARTICLE_COUNT; i++) {
      const currentAngle = angles[i] + timeRef.current * ORBIT_SPEED * orbitDirection
      
      // Slight bob up and down
      const bob = Math.sin(timeRef.current * 1.5 + angles[i]) * 0.1
      
      // Slight radius variation
      const radiusVar = ORBIT_RADIUS + Math.sin(timeRef.current * 2 + angles[i] * 2) * 0.1
      
      posAttr.array[i * 3] = Math.cos(currentAngle) * radiusVar
      posAttr.array[i * 3 + 1] = heights[i] + bob
      posAttr.array[i * 3 + 2] = Math.sin(currentAngle) * radiusVar
      
      // Twinkle effect
      const twinkle = 0.7 + 0.3 * Math.sin(timeRef.current * 4 + angles[i] * 3)
      
      // Size with twinkle
      sizeAttr.array[i] = sizes[i] * twinkle
      
      // Color
      colorAttr.array[i * 3] = color.r * twinkle
      colorAttr.array[i * 3 + 1] = color.g * twinkle
      colorAttr.array[i * 3 + 2] = color.b * twinkle
    }
    
    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })
  
  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  )
}

export default function HealingParticles({ position = [0, 0, 0] }) {
  const { buffs } = usePlayerState()
  
  // Check for healing buffs
  const hasPotionBuff = buffs?.some(b => b.id === 'health_potion') ?? false
  const hasFoodBuff = buffs?.some(b => b.id === 'food_buff') ?? false
  
  // Create shared particle texture
  const particleTexture = useMemo(() => createParticleTexture(), [])
  
  return (
    <group position={position}>
      {/* Health potion - red rising sparkles + orbiting ring */}
      <RisingParticles 
        isActive={hasPotionBuff}
        color={POTION_COLOR}
        particleTexture={particleTexture}
      />
      <OrbitingParticles 
        isActive={hasPotionBuff}
        color={POTION_COLOR}
        particleTexture={particleTexture}
        orbitDirection={1}
        heightOffset={1.0}
      />
      
      {/* Mana food - blue rising sparkles + orbiting ring (opposite direction) */}
      <RisingParticles 
        isActive={hasFoodBuff}
        color={FOOD_COLOR}
        particleTexture={particleTexture}
      />
      <OrbitingParticles 
        isActive={hasFoodBuff}
        color={FOOD_COLOR}
        particleTexture={particleTexture}
        orbitDirection={-1}
        heightOffset={1.5}
      />
    </group>
  )
}
