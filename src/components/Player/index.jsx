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
  const staffMaterialRef = useRef(null);
  const originalStaffMaterialRef = useRef(null);
  const originalMaterialsRef = useRef(new Map());
  const currentActionRef = useRef(null);
  
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
    animation, 
    state, 
    activeAction, 
    setCastProgress, 
    syncCastProgressUI, 
    dispatchAction, 
    tryRecast, 
    STATES 
  } = usePlayerState();

  // Store model reference
  useEffect(() => {
    modelRef.current = clone;
  }, [clone]);

  // Store original materials for restoration
  useEffect(() => {
    clone.traverse((child) => {
      if (!child.isMesh) return;
      originalMaterialsRef.current.set(child, child.material.clone());
      
      // Find staff for glow effects (common pattern across classes)
      if (child.name.includes('Staff') || child.name.includes('Weapon')) {
        staffMaterialRef.current = child;
        originalStaffMaterialRef.current = child.material.clone();
      }
    });
  }, [clone]);

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

  // Staff glow based on active element
  useEffect(() => {
    if (!staffMaterialRef.current) return;

    const element = activeAction ? getElementForAction(activeAction) : null;
    
    if (element && state !== STATES.IDLE) {
      staffMaterialRef.current.material = GLOW_MATERIALS[element.id] || originalStaffMaterialRef.current;
    } else {
      staffMaterialRef.current.material = originalStaffMaterialRef.current;
    }
  }, [state, activeAction, STATES]);

  // Animation handling
  useEffect(() => {
    const currentAnimation = actions?.[animation];
    if (!currentAnimation) return;

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

  // Cast progress tracking
  useFrame(() => {
    const action = currentActionRef.current;
    if (!action) return;

    if (state === STATES.CASTING || state === STATES.ATTACKING) {
      const duration = action.getClip().duration;
      const time = Math.min(action.time, duration);
      const progress = time / duration;
      setCastProgress(progress);

      if (progress >= 0.99) {
        syncCastProgressUI();
        if (tryRecast()) {
          action.reset().play();
        } else {
          dispatchAction('FINISH');
        }
      }
    }
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
