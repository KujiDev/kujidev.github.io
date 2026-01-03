import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import { usePlayerState } from '@/hooks/useGame'
import { ELEMENTS, isActionForSkill } from '@/config/actions'
import * as THREE from 'three'

const MAX_GHOSTS = 5
const SPAWN_INTERVAL = 0.07 // seconds between spawning new ghost
const GHOST_LIFETIME = 0.4 // seconds before ghost fades completely
const TRAIL_SPEED = 3.5 // how fast ghosts move backward

// Parse arcane color once for ghost tinting
const arcaneBase = new THREE.Color(ELEMENTS.arcane.primary)

// Single ghost - a clone that syncs pose and moves backward
function Ghost({ sourceClone, spawnTime, index }) {
  const groupRef = useRef()
  const opacityRef = useRef(0.55)
  
  // Create ghost clone with tinted material
  const { clone, materials } = useMemo(() => {
    if (!sourceClone) return { clone: null, materials: [] }
    
    const cloned = SkeletonUtils.clone(sourceClone)
    const mats = []
    
    // Each ghost gets progressively lighter arcane purple
    const intensity = 0.7 + index * 0.08
    const color = arcaneBase.clone().multiplyScalar(intensity)
    
    cloned.traverse((child) => {
      if (child.isMesh) {
        const mat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        })
        child.material = mat
        child.castShadow = false
        child.receiveShadow = false
        mats.push(mat)
      }
    })
    
    return { clone: cloned, materials: mats }
  }, [sourceClone, index])
  
  // Sync skeleton pose from source each frame, move backward, fade out
  useFrame((state) => {
    if (!clone || !sourceClone || !groupRef.current) return
    
    const age = state.clock.elapsedTime - spawnTime
    const progress = age / GHOST_LIFETIME
    
    // Update opacity
    const opacity = Math.max(0, 0.55 * (1 - progress))
    opacityRef.current = opacity
    materials.forEach(mat => {
      mat.opacity = opacity
    })
    
    // Move backward (negative Z)
    groupRef.current.position.z = -age * TRAIL_SPEED
    
    // Slight scale down
    const scale = 1 - progress * 0.15
    groupRef.current.scale.setScalar(scale)
    
    // Sync bone transforms from source
    const sourceBones = []
    const cloneBones = []
    
    sourceClone.traverse((obj) => {
      if (obj.isBone) sourceBones.push(obj)
    })
    clone.traverse((obj) => {
      if (obj.isBone) cloneBones.push(obj)
    })
    
    // Match bone transforms
    sourceBones.forEach((srcBone, i) => {
      if (cloneBones[i]) {
        cloneBones[i].position.copy(srcBone.position)
        cloneBones[i].quaternion.copy(srcBone.quaternion)
        cloneBones[i].scale.copy(srcBone.scale)
      }
    })
  })
  
  if (!clone) return null
  
  return (
    <group ref={groupRef}>
      <primitive object={clone} />
    </group>
  )
}

export default function ArcaneTrail({ wizardRef }) {
  const { state, activeAction, STATES } = usePlayerState()
  
  // Ghost trail state
  const [ghosts, setGhosts] = useState([])
  const ghostIdRef = useRef(0)
  const lastSpawnRef = useRef(0)
  
  // Check if Arcane Rush is active
  const isArcaneRush = state === STATES.MOVING && isActionForSkill(activeAction, 'arcane_rush')
  
  // Spawn ghosts and manage trail
  useFrame((frameState) => {
    const now = frameState.clock.elapsedTime
    
    // Always clean up old ghosts
    setGhosts(prev => prev.filter(g => now - g.spawnTime < GHOST_LIFETIME))
    
    if (!isArcaneRush) return
    if (!wizardRef?.current) return
    
    // Check if it's time to spawn a new ghost
    if (now - lastSpawnRef.current < SPAWN_INTERVAL) return
    
    lastSpawnRef.current = now
    
    // Create new ghost
    const newGhost = {
      id: ghostIdRef.current++,
      spawnTime: now,
    }
    
    setGhosts(prev => {
      if (prev.length >= MAX_GHOSTS) {
        return [...prev.slice(1), newGhost]
      }
      return [...prev, newGhost]
    })
  })
  
  if (ghosts.length === 0) return null
  
  return (
    <group>
      {ghosts.map((ghost, i) => (
        <Ghost
          key={ghost.id}
          sourceClone={wizardRef?.current}
          spawnTime={ghost.spawnTime}
          index={i}
        />
      ))}
    </group>
  )
}
