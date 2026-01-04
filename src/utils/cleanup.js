/**
 * =============================================================================
 * SCENE CLEANUP - Dispose Scene Resources on Exit
 * =============================================================================
 * 
 * Utility for properly disposing scene resources when transitioning away.
 * Prevents memory leaks from undisposed Three.js objects.
 * 
 * WHAT GETS CLEANED:
 * ==================
 * - Three.js geometries
 * - Three.js materials
 * - Three.js textures
 * - Event listeners
 * - Animation frames
 * - Timers (setTimeout, setInterval)
 * - Zustand subscriptions
 * 
 * USAGE:
 * ======
 * const cleanup = useSceneCleanup(SCENES.GAME);
 * 
 * // Register resources for cleanup
 * cleanup.addGeometry(geometry);
 * cleanup.addMaterial(material);
 * cleanup.addTexture(texture);
 * cleanup.addTimer(timeoutId);
 * cleanup.addAnimationFrame(rafId);
 * cleanup.addSubscription(unsubscribe);
 */

import { useEffect, useRef, useCallback } from 'react';
import useSceneStore from '@/stores/sceneStore';

// =============================================================================
// CLEANUP REGISTRY
// =============================================================================

/**
 * Creates a cleanup registry for a scene.
 * All registered resources will be disposed when cleanup() is called.
 */
export function createCleanupRegistry() {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const timers = new Set();
  const intervals = new Set();
  const animationFrames = new Set();
  const subscriptions = new Set();
  const customCleanups = [];
  
  return {
    /**
     * Add a geometry to be disposed.
     */
    addGeometry(geometry) {
      if (geometry) geometries.add(geometry);
    },
    
    /**
     * Add a material to be disposed.
     */
    addMaterial(material) {
      if (material) materials.add(material);
    },
    
    /**
     * Add a texture to be disposed.
     */
    addTexture(texture) {
      if (texture) textures.add(texture);
    },
    
    /**
     * Add a setTimeout ID to be cleared.
     */
    addTimer(timerId) {
      if (timerId) timers.add(timerId);
    },
    
    /**
     * Add a setInterval ID to be cleared.
     */
    addInterval(intervalId) {
      if (intervalId) intervals.add(intervalId);
    },
    
    /**
     * Add a requestAnimationFrame ID to be cancelled.
     */
    addAnimationFrame(rafId) {
      if (rafId) animationFrames.add(rafId);
    },
    
    /**
     * Add a subscription unsubscribe function.
     */
    addSubscription(unsubscribe) {
      if (typeof unsubscribe === 'function') {
        subscriptions.add(unsubscribe);
      }
    },
    
    /**
     * Add a custom cleanup function.
     */
    addCleanup(cleanupFn) {
      if (typeof cleanupFn === 'function') {
        customCleanups.push(cleanupFn);
      }
    },
    
    /**
     * Dispose all registered resources.
     */
    cleanup() {
      if (import.meta.env.DEV) {
        console.log('[Cleanup] Disposing scene resources...');
        console.log(`  - Geometries: ${geometries.size}`);
        console.log(`  - Materials: ${materials.size}`);
        console.log(`  - Textures: ${textures.size}`);
        console.log(`  - Timers: ${timers.size}`);
        console.log(`  - Intervals: ${intervals.size}`);
        console.log(`  - Animation frames: ${animationFrames.size}`);
        console.log(`  - Subscriptions: ${subscriptions.size}`);
        console.log(`  - Custom cleanups: ${customCleanups.length}`);
      }
      
      // Dispose Three.js objects
      for (const geometry of geometries) {
        try {
          geometry.dispose();
        } catch (e) {
          console.error('[Cleanup] Failed to dispose geometry:', e);
        }
      }
      geometries.clear();
      
      for (const material of materials) {
        try {
          // Materials can have maps that need disposing
          if (material.map) material.map.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.roughnessMap) material.roughnessMap.dispose();
          if (material.metalnessMap) material.metalnessMap.dispose();
          if (material.aoMap) material.aoMap.dispose();
          if (material.emissiveMap) material.emissiveMap.dispose();
          material.dispose();
        } catch (e) {
          console.error('[Cleanup] Failed to dispose material:', e);
        }
      }
      materials.clear();
      
      for (const texture of textures) {
        try {
          texture.dispose();
        } catch (e) {
          console.error('[Cleanup] Failed to dispose texture:', e);
        }
      }
      textures.clear();
      
      // Clear timers
      for (const timerId of timers) {
        clearTimeout(timerId);
      }
      timers.clear();
      
      for (const intervalId of intervals) {
        clearInterval(intervalId);
      }
      intervals.clear();
      
      // Cancel animation frames
      for (const rafId of animationFrames) {
        cancelAnimationFrame(rafId);
      }
      animationFrames.clear();
      
      // Call subscription unsubscribes
      for (const unsubscribe of subscriptions) {
        try {
          unsubscribe();
        } catch (e) {
          console.error('[Cleanup] Failed to unsubscribe:', e);
        }
      }
      subscriptions.clear();
      
      // Call custom cleanups
      for (const cleanupFn of customCleanups) {
        try {
          cleanupFn();
        } catch (e) {
          console.error('[Cleanup] Failed to run custom cleanup:', e);
        }
      }
      customCleanups.length = 0;
      
      if (import.meta.env.DEV) {
        console.log('[Cleanup] Scene resources disposed.');
      }
    },
  };
}

// =============================================================================
// REACT HOOKS
// =============================================================================

/**
 * Hook to create a cleanup registry for a scene.
 * Automatically registers with sceneStore for cleanup on exit.
 * 
 * @param {string} sceneId - The scene ID
 * @returns {CleanupRegistry} The cleanup registry
 */
export function useCleanupRegistry(sceneId) {
  const registryRef = useRef(null);
  const registerCleanup = useSceneStore((s) => s.registerCleanup);
  
  // Create registry once
  if (!registryRef.current) {
    registryRef.current = createCleanupRegistry();
  }
  
  // Register with sceneStore
  useEffect(() => {
    const registry = registryRef.current;
    return registerCleanup(sceneId, () => registry.cleanup());
  }, [sceneId, registerCleanup]);
  
  return registryRef.current;
}

/**
 * Hook to run a cleanup function when a scene exits.
 * Simpler alternative to useCleanupRegistry for one-off cleanups.
 * 
 * @param {string} sceneId - The scene ID
 * @param {() => void} cleanupFn - Function to run on cleanup
 */
export function useOnSceneExit(sceneId, cleanupFn) {
  const registerCleanup = useSceneStore((s) => s.registerCleanup);
  
  useEffect(() => {
    return registerCleanup(sceneId, cleanupFn);
  }, [sceneId, cleanupFn, registerCleanup]);
}

/**
 * Utility to dispose a Three.js Object3D and all its children.
 * Useful for cleaning up loaded GLTF models.
 * 
 * @param {THREE.Object3D} object - The object to dispose
 */
export function disposeObject3D(object) {
  if (!object) return;
  
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    
    if (child.material) {
      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          disposeMaterial(material);
        }
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

/**
 * Dispose a material and its textures.
 * @param {THREE.Material} material - The material to dispose
 */
function disposeMaterial(material) {
  if (!material) return;
  
  // Dispose all texture maps
  const textureProps = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap',
    'aoMap', 'emissiveMap', 'alphaMap', 'envMap',
    'lightMap', 'bumpMap', 'displacementMap',
  ];
  
  for (const prop of textureProps) {
    if (material[prop]) {
      material[prop].dispose();
    }
  }
  
  material.dispose();
}

export default {
  createCleanupRegistry,
  useCleanupRegistry,
  useOnSceneExit,
  disposeObject3D,
};
