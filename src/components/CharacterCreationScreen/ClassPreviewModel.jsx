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
 * - Selection highlight via rim glow and floating animation
 * - Class-colored aura effect on selection
 * - Error handling for missing animations
 * - No game logic - purely visual rendering
 * 
 * AAA POLISH:
 * ===========
 * - Smooth floating animation on selected character
 * - Rim glow effect using emissive materials
 * - Scale pulse on hover
 * - Class-specific aura coloring
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

/**
 * Inner model component - handles actual GLTF loading
 * Separated to allow Suspense boundary
 */
function ModelInner({ 
  classConfig, 
  isSelected,
  isHovered,
  isTransitioning,
}) {
  const group = useRef();
  const [isReady, setIsReady] = useState(false);
  const targetScale = useRef(1);
  const currentFloatY = useRef(0);
  
  const modelPath = classConfig.model?.path || '/models/Wizard-transformed.glb';
  const classColor = classConfig.ui?.color || '#a89878';
  
  // Get animation keys from class config
  const idleAnimationKey = classConfig.stateAnimations?.idle || 'Idle';
  const runAnimationKey = classConfig.stateAnimations?.moving || 'Run';
  
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
    }
    
    setIsReady(true);
  }, [actions, classConfig.id]);
  
  // Play idle or run animation based on transitioning state
  useEffect(() => {
    if (!actions || !isReady) return;
    
    // Choose animation based on state
    const animationToPlay = isTransitioning ? runAnimationKey : idleAnimationKey;
    const action = actions[animationToPlay];
    
    if (action) {
      // Fade out all other animations
      Object.values(actions).forEach(a => {
        if (a !== action) a.fadeOut(0.3);
      });
      
      action.reset().fadeIn(0.3).play();
      
      if (import.meta.env.DEV) {
        console.log(`[DEBUG][CharacterCreation] Playing animation: ${animationToPlay} for ${classConfig.id}`);
      }
      
      return () => {
        try {
          action.fadeOut(0.3);
        } catch (e) {
          // Animation may already be stopped
        }
      };
    } else if (import.meta.env.DEV) {
      console.warn(
        `[ClassPreviewModel] Missing animation "${animationToPlay}" for ${classConfig.name}, ` +
        `available: [${Object.keys(actions).join(', ')}]`
      );
    }
  }, [actions, idleAnimationKey, runAnimationKey, classConfig.name, classConfig.id, isReady, isTransitioning]);
  
  // Gentle floating animation for selected character + hover scale
  useFrame((state, delta) => {
    if (!group.current) return;
    
    // Floating animation for selected - only bobs UPWARD, never below ground
    if (isSelected) {
      const t = state.clock.elapsedTime;
      // Use abs(sin) to keep it always positive (0.05 to 0.15 range)
      const targetY = 0.05 + Math.abs(Math.sin(t * 1.2)) * 0.1;
      currentFloatY.current = THREE.MathUtils.lerp(currentFloatY.current, targetY, delta * 3);
    } else {
      currentFloatY.current = THREE.MathUtils.lerp(currentFloatY.current, 0, delta * 4);
    }
    group.current.position.y = currentFloatY.current;
    
    // Scale pulse on hover/selection - subtle
    const baseScale = isSelected ? 1.02 : (isHovered ? 1.01 : 1.0);
    targetScale.current = THREE.MathUtils.lerp(targetScale.current, baseScale, delta * 6);
    group.current.scale.setScalar(targetScale.current);
  });
  
  // Apply emissive glow to materials when selected
  useEffect(() => {
    if (!clone) return;
    
    const glowColor = new THREE.Color(classColor);
    const glowIntensity = isSelected ? 0.15 : (isHovered ? 0.08 : 0);
    
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material;
        if (mat.emissive) {
          mat.emissive = glowColor;
          mat.emissiveIntensity = glowIntensity;
        }
      }
    });
  }, [clone, isSelected, isHovered, classColor]);

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
  isHovered = false,
  isTransitioning = false,
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
        isHovered={isHovered}
        isTransitioning={isTransitioning}
      />
    </group>
  );
}
