/**
 * =============================================================================
 * PLAYER COMPONENT - Generic Player Abstraction
 * =============================================================================
 * 
 * This component renders a player character based on class configuration.
 * It is class-agnostic - Wizard, Cleric, or any future class renders through
 * this same component by passing different classId.
 * 
 * ARCHITECTURE:
 * =============
 * - Reads class config from engine/classes.js
 * - Loads the appropriate 3D model
 * - Binds animations to game states
 * - Owns class-specific VFX (casting circle, trails, etc.)
 * - Spawns projectiles based on skill execution
 * 
 * NO CLASS-SPECIFIC IF STATEMENTS - behavior is purely config-driven.
 */

import React, { useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

import { usePlayerState } from '@/hooks/useGame';
import { getClassById, getAnimationsForClass, getModelConfigForClass } from '@/engine/classes';
import { getElementForAction, getActionById, ELEMENTS } from '@/config/actions';
import useWorldStore, { getFacingDirection } from '@/stores/worldStore';

// Class-agnostic VFX components
import CastingCircle from '@/components/CastingCircle';
import ShieldEffect from '@/components/ShieldEffect';
import ManaShield from '@/components/ManaShield';
import HealingParticles from '@/components/HealingParticles';
import ArcaneTrail from '@/components/ArcaneTrail';

// =============================================================================
// PLAYER CONTEXT
// =============================================================================

const PlayerContext = createContext(null);

export function usePlayer() {
  return useContext(PlayerContext);
}

// =============================================================================
// SHARED MATERIALS - Created once, reused
// =============================================================================

const GLOW_MATERIALS = {};
Object.values(ELEMENTS).forEach(element => {
  GLOW_MATERIALS[element.id] = new THREE.MeshStandardMaterial({
    color: element.glow,
    emissive: element.glow,
    emissiveIntensity: 4,
    toneMapped: false,
  });
});

// Channel ability material (arcane rush, etc.)
const CHANNEL_MATERIAL = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#8b30a0'),
  transparent: true,
  opacity: 0.75,
});

// =============================================================================
// PLAYER MODEL - Handles model loading and animation
// =============================================================================

function PlayerModel({ classConfig, children }) {
  const group = useRef();
  const modelRef = useRef();
  const rotationGroupRef = useRef();
  const weaponMeshRef = useRef(null);
  const originalWeaponMaterialRef = useRef(null);
  const originalMaterialsRef = useRef(new Map());
  const currentActionRef = useRef(null);
  const targetRotationRef = useRef(0);
  
  // Get weapon mesh names from class config (data-driven)
  const weaponMeshNames = classConfig.weaponMeshes || [];
  
  const modelConfig = getModelConfigForClass(classConfig.id);
  const animationMap = getAnimationsForClass(classConfig.id);
  
  const { scene, animations: gltfAnimations } = useGLTF(modelConfig.path);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(gltfAnimations, clone);
  
  // DEBUG: Log available animations once when model loads
  useEffect(() => {
    if (import.meta.env.DEV && actions) {
      const animationNames = Object.keys(actions);
      console.log(
        `[ANIMATIONS][${classConfig.name}]\n` +
        animationNames.map(name => `  - ${name}`).join('\n')
      );
      
      // Warn about missing animation bindings
      const mappedAnimations = Object.values(animationMap);
      const missing = mappedAnimations.filter(anim => !actions[anim]);
      if (missing.length > 0) {
        console.warn(
          `[ANIMATIONS][${classConfig.name}] ✖ Missing animations:\n` +
          missing.map(name => `  - ${name}`).join('\n')
        );
      }
    }
  }, [actions, classConfig.name, animationMap]);
  
  const { 
    state, 
    activeAction, 
    setCastProgress, 
    syncCastProgressUI, 
    dispatchAction, 
    tryRecast, 
    STATES 
  } = usePlayerState();

  // Derive animation name from class-specific animationMap, not global STATE_ANIMATIONS
  const animation = animationMap[state] || animationMap.idle || 'IDLE';

  // Store model reference
  useEffect(() => {
    modelRef.current = clone;
  }, [clone]);

  // Store original materials for restoration
  useEffect(() => {
    clone.traverse((child) => {
      if (!child.isMesh) return;
      originalMaterialsRef.current.set(child, child.material.clone());
      
      // Find weapon mesh based on class config (data-driven)
      if (weaponMeshNames.includes(child.name)) {
        weaponMeshRef.current = child;
        originalWeaponMaterialRef.current = child.material.clone();
        if (import.meta.env.DEV) {
          console.log(`[WEAPON] Found weapon mesh: "${child.name}" for class ${classConfig.id}`);
        }
      }
    });
  }, [clone, weaponMeshNames, classConfig.id]);

  // Channel ability detection (mana drain abilities)
  const isChanneling = useMemo(() => {
    if (state !== STATES.MOVING || !activeAction) return false;
    const action = getActionById(activeAction);
    return action?.manaPerSecond > 0;
  }, [state, activeAction, STATES]);
  
  // Apply channel material when active
  useEffect(() => {
    if (isChanneling) {
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = CHANNEL_MATERIAL;
        }
      });
    } else {
      clone.traverse((child) => {
        if (child.isMesh && originalMaterialsRef.current.has(child)) {
          child.material = originalMaterialsRef.current.get(child);
        }
      });
    }
  }, [isChanneling, clone]);

  // Weapon glow based on active element (data-driven via weaponMeshes)
  useEffect(() => {
    if (!weaponMeshRef.current) return;

    const element = activeAction ? getElementForAction(activeAction) : null;
    
    if (element && state !== STATES.IDLE) {
      weaponMeshRef.current.material = GLOW_MATERIALS[element.id] || originalWeaponMaterialRef.current;
    } else {
      weaponMeshRef.current.material = originalWeaponMaterialRef.current;
    }
  }, [state, activeAction, STATES]);

  // Animation handling
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[ANIMATION] state="${state}" -> animation="${animation}" (available: ${Object.keys(actions || {}).join(', ')})`);
    }
    
    const currentAnimation = actions?.[animation];
    if (!currentAnimation) {
      if (import.meta.env.DEV) {
        console.warn(`[ANIMATION] Animation "${animation}" not found in model!`);
      }
      // CRITICAL FIX: Don't block FSM if animation is missing
      // Set a null ref so fallback timer handles completion
      currentActionRef.current = null;
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[ANIMATION] Playing: "${animation}"`);
    }

    currentActionRef.current = currentAnimation;

    // Fade out other animations
    Object.values(actions).forEach((action) => {
      if (action !== currentAnimation) action?.fadeOut(0.2);
    });

    const isCastingOrAttacking = state === STATES.CASTING || state === STATES.ATTACKING;
    if (isCastingOrAttacking) {
      currentAnimation.setLoop(THREE.LoopOnce, 1);
      currentAnimation.clampWhenFinished = true;
      setCastProgress(0);
    } else {
      currentAnimation.setLoop(THREE.LoopRepeat);
    }

    currentAnimation.reset().fadeIn(0.2).play();
  }, [animation, actions, state, activeAction, STATES, setCastProgress]);

  // FALLBACK: Timer-based cast completion when animation is missing
  // This ensures FSM is NEVER blocked by animation failures
  const castStartTimeRef = useRef(null);
  const FALLBACK_CAST_DURATION = 1.0; // seconds
  
  useEffect(() => {
    if (state === STATES.CASTING || state === STATES.ATTACKING) {
      castStartTimeRef.current = performance.now();
    } else {
      castStartTimeRef.current = null;
    }
  }, [state, STATES]);

  // Cast progress tracking - handles both animation-based and fallback timer
  useFrame(() => {
    const isCastingOrAttacking = state === STATES.CASTING || state === STATES.ATTACKING;
    if (!isCastingOrAttacking) return;
    
    const action = currentActionRef.current;
    
    if (action) {
      // Animation-based progress tracking
      const duration = action.getClip().duration;
      const time = Math.min(action.time, duration);
      const progress = time / duration;
      setCastProgress(progress);

      if (progress >= 0.99) {
        syncCastProgressUI();
        if (tryRecast()) {
          action.reset().play();
        } else {
          if (import.meta.env.DEV) {
            console.log(`[FSM] Animation complete, dispatching FINISH`);
          }
          dispatchAction('FINISH');
        }
      }
    } else if (castStartTimeRef.current) {
      // FALLBACK: Timer-based progress when animation is missing
      const elapsed = (performance.now() - castStartTimeRef.current) / 1000;
      const progress = Math.min(elapsed / FALLBACK_CAST_DURATION, 1);
      setCastProgress(progress);
      
      if (progress >= 1) {
        if (import.meta.env.DEV) {
          console.log(`[FSM] Fallback timer complete, dispatching FINISH (animation was missing)`);
        }
        syncCastProgressUI();
        if (!tryRecast()) {
          dispatchAction('FINISH');
        }
        castStartTimeRef.current = performance.now(); // Reset for potential recast
      }
    }
  });
  
  // Player rotation - smoothly rotate to face movement direction
  useFrame((_, delta) => {
    if (!rotationGroupRef.current) return;
    
    const isMoving = useWorldStore.getState().isMoving;
    if (isMoving) {
      const facingDir = getFacingDirection();
      if (facingDir) {
        // Calculate target rotation from facing direction vector
        targetRotationRef.current = Math.atan2(facingDir.x, facingDir.z);
      }
    }
    
    // Smoothly interpolate current rotation to target
    const currentRotation = rotationGroupRef.current.rotation.y;
    const targetRotation = targetRotationRef.current;
    
    // Handle angle wrapping for shortest path
    let diff = targetRotation - currentRotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    // Apply smooth rotation (lerp factor ~10 = responsive but smooth)
    rotationGroupRef.current.rotation.y += diff * Math.min(delta * 10, 1);
  });

  // Player context value
  const playerContext = useMemo(() => ({
    classId: classConfig.id,
    modelRef,
    classConfig,
  }), [classConfig]);

  return (
    <PlayerContext.Provider value={playerContext}>
      <group ref={group} dispose={null}>
        {/* Rotation group - character rotates to face movement direction */}
        <group ref={rotationGroupRef}>
          <primitive object={clone} />
        
          {/* Class-agnostic VFX - these read state and show/hide themselves */}
          <CastingCircle position={[0, 0.02, 0]} />
          <ShieldEffect position={[0, 1.5, 0]} />
          <ManaShield position={[0, 1.5, 0]} />
          <HealingParticles position={[0, 0, 0]} />
          <ArcaneTrail wizardRef={modelRef} />
        
          {/* Additional children (pixies, etc.) */}
          {children}
        </group>
      </group>
    </PlayerContext.Provider>
  );
}

// =============================================================================
// MAIN PLAYER COMPONENT
// =============================================================================

export default function Player({ classId = 'wizard', children, ...props }) {
  const classConfig = useMemo(() => getClassById(classId), [classId]);
  
  if (!classConfig) {
    console.error(`[Player] Unknown class: ${classId}`);
    return null;
  }
  
  return (
    <group {...props}>
      <PlayerModel classConfig={classConfig}>
        {children}
      </PlayerModel>
    </group>
  );
}

// Preload common models
useGLTF.preload('/models/Wizard-transformed.glb');
