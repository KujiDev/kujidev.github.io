/**
 * =============================================================================
 * CLASS PREVIEW MODEL
 * =============================================================================
 * 
 * Displays a class model in idle animation for character selection.
 * Data-driven: loads model path and animations from class config.
 * 
 * ARCHITECTURE:
 * =============
 * - Model path comes from class.model.path
 * - Animation binding comes from class.stateAnimations
 * - Selection highlight via outline/emissive effect
 * - Error handling for missing animations
 * - No game logic - purely visual rendering
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { getAnimationClip } from '@/engine/loader';

/**
 * Inner model component - handles actual GLTF loading
 * Separated to allow Suspense boundary
 */
function ModelInner({ 
  classConfig, 
  isSelected,
}) {
  const group = useRef();
  const [isReady, setIsReady] = useState(false);
  
  const modelPath = classConfig.model?.path || '/models/Wizard-transformed.glb';
  
  // Get idle animation key from class config, then resolve to actual clip name
  const idleAnimationKey = classConfig.stateAnimations?.idle || 'IDLE';
  const idleClipName = getAnimationClip(classConfig.id, idleAnimationKey);
  
  // Load model - useGLTF suspends until loaded
  const { scene, animations } = useGLTF(modelPath);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, clone);
  
  // Debug: Log loaded animations on mount
  useEffect(() => {
    if (!actions) return;
    
    const animationNames = Object.keys(actions);
    
    if (import.meta.env.DEV) {
      console.log(
        `[DEBUG][CharacterCreation] Loaded ${classConfig.id} model, animations: [${animationNames.join(', ')}]`
      );
      console.log(
        `[DEBUG][CharacterCreation] Idle mapping: ${idleAnimationKey} → ${idleClipName || 'NOT FOUND'}`
      );
    }
    
    setIsReady(true);
  }, [actions, classConfig.id, idleAnimationKey, idleClipName]);
  
  // Play idle animation with error handling
  useEffect(() => {
    if (!actions || !isReady) return;
    
    // Try resolved clip name first, then fall back to key
    const clipNameToPlay = idleClipName || idleAnimationKey;
    const idleAction = actions[clipNameToPlay];
    
    if (idleAction) {
      idleAction.reset().fadeIn(0.3).play();
      
      if (import.meta.env.DEV) {
        console.log(`[DEBUG][CharacterCreation] Playing animation: ${clipNameToPlay} for ${classConfig.id}`);
      }
      
      return () => {
        try {
          idleAction.fadeOut(0.3);
        } catch (e) {
          // Animation may already be stopped
        }
      };
    } else if (import.meta.env.DEV) {
      console.warn(
        `[ClassPreviewModel] Missing idle animation "${clipNameToPlay}" for ${classConfig.name}, ` +
        `available: [${Object.keys(actions).join(', ')}]`
      );
      // Try fallback to first available animation (but not Death!)
      const availableNames = Object.keys(actions);
      const fallbackName = availableNames.find(n => 
        n.toLowerCase().includes('idle') || 
        n.toLowerCase().includes('stand')
      ) || availableNames.find(n => 
        !n.toLowerCase().includes('death') && 
        !n.toLowerCase().includes('dead')
      );
      
      if (fallbackName && actions[fallbackName]) {
        console.log(`[ClassPreviewModel] Using fallback animation: ${fallbackName}`);
        actions[fallbackName].reset().fadeIn(0.3).play();
      }
    }
  }, [actions, idleClipName, idleAnimationKey, classConfig.name, classConfig.id, isReady]);
  
  // Gentle floating animation for selected character
  useFrame((state) => {
    if (!group.current) return;
    
    if (isSelected) {
      const t = state.clock.elapsedTime;
      group.current.position.y = Math.sin(t * 2) * 0.05;
    } else {
      group.current.position.y = 0;
    }
  });
  
  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
}

/**
 * Main export - wraps model with interaction handlers
 */
export default function ClassPreviewModel({ 
  classConfig, 
  isSelected = false,
  onPointerOver,
  onPointerOut,
  onClick,
}) {
  return (
    <group
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <ModelInner
        classConfig={classConfig}
        isSelected={isSelected}
      />
    </group>
  );
}
