/**
 * =============================================================================
 * SCENE STORE - Production-Grade Scene Management
 * =============================================================================
 * 
 * Central store for scene lifecycle management. Only ONE scene can be active
 * at a time. Scenes follow a strict lifecycle:
 * 
 * LIFECYCLE STATES:
 * =================
 * - idle:      Scene not loaded
 * - preloaded: Assets loaded, not rendering
 * - entering:  Transition in progress
 * - active:    Rendering, accepting input
 * - exiting:   Transition out in progress
 * - disposed:  Cleaned up, ready for GC
 * 
 * TRANSITION FLOW:
 * ================
 * 1. Request transition to new scene
 * 2. Block all input
 * 3. Current scene: active → exiting
 * 4. Fade overlay in
 * 5. Current scene: exiting → disposed (cleanup)
 * 6. Next scene: preloaded → entering
 * 7. Fade overlay out
 * 8. Next scene: entering → active
 * 9. Unblock input
 * 
 * INPUT ISOLATION:
 * ================
 * - inputBlocked: true during ANY transition
 * - Scenes MUST check inputBlocked before handling input
 * - No global input listeners - all through SceneManager
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// =============================================================================
// SCENE DEFINITIONS
// =============================================================================

export const SCENES = {
  LOADING: 'loading',
  CHARACTER_SELECTION: 'characterSelection',
  GAME: 'game',
};

export const SCENE_STATES = {
  IDLE: 'idle',
  PRELOADED: 'preloaded',
  ENTERING: 'entering',
  ACTIVE: 'active',
  EXITING: 'exiting',
  DISPOSED: 'disposed',
};

// =============================================================================
// TRANSITION CONFIGURATION
// =============================================================================

const TRANSITION_CONFIG = {
  fadeOutDuration: 400,   // ms - fade to black
  fadeInDuration: 400,    // ms - fade from black
  holdDuration: 100,      // ms - hold on black between scenes
  seamlessDuration: 1500, // ms - duration for seamless 3D transitions (camera + walk)
};

// =============================================================================
// SCENE STORE
// =============================================================================

const useSceneStore = create(
  subscribeWithSelector((set, get) => ({
    // Current scene state
    currentScene: SCENES.LOADING,
    currentSceneState: SCENE_STATES.ACTIVE,
    
    // Transition state
    isTransitioning: false,
    transitionProgress: 0, // 0-1, used for fade
    inputBlocked: false,
    
    // Preload tracking
    preloadedScenes: new Set(),
    
    // Scene-specific data (passed during transition)
    sceneData: {},
    
    // Overlay visibility
    overlayOpacity: 0,
    overlayVisible: false,
    
    // Cleanup callbacks registry
    cleanupCallbacks: new Map(),
    
    // =========================================================================
    // ACTIONS
    // =========================================================================
    
    /**
     * Register a cleanup callback for a scene.
     * Called when scene exits.
     */
    registerCleanup: (sceneId, callback) => {
      const callbacks = get().cleanupCallbacks;
      if (!callbacks.has(sceneId)) {
        callbacks.set(sceneId, []);
      }
      callbacks.get(sceneId).push(callback);
      set({ cleanupCallbacks: new Map(callbacks) });
      
      // Return unregister function
      return () => {
        const cbs = get().cleanupCallbacks.get(sceneId);
        if (cbs) {
          const idx = cbs.indexOf(callback);
          if (idx > -1) cbs.splice(idx, 1);
        }
      };
    },
    
    /**
     * Mark a scene as preloaded (assets ready).
     */
    markPreloaded: (sceneId) => {
      const preloaded = new Set(get().preloadedScenes);
      preloaded.add(sceneId);
      set({ preloadedScenes: preloaded });
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] preload ${sceneId}`);
      }
    },
    
    /**
     * Check if a scene is preloaded.
     */
    isPreloaded: (sceneId) => {
      return get().preloadedScenes.has(sceneId);
    },
    
    /**
     * Transition to a new scene.
     * This is the main entry point for scene changes.
     * 
     * @param {string} nextScene - The scene to transition to
     * @param {object} data - Optional data to pass to the new scene
     * @param {object} options - Transition options
     * @param {boolean} options.seamless - Skip overlay for seamless 3D transitions
     */
    transitionTo: async (nextScene, data = {}, options = {}) => {
      const state = get();
      const { seamless = false } = options;
      
      // Prevent double transitions
      if (state.isTransitioning) {
        console.warn('[Scene] Transition already in progress, ignoring');
        return;
      }
      
      // Same scene, no-op
      if (state.currentScene === nextScene && state.currentSceneState === SCENE_STATES.ACTIVE) {
        console.warn('[Scene] Already on scene:', nextScene);
        return;
      }
      
      const previousScene = state.currentScene;
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] transition ${previousScene} → ${nextScene}${seamless ? ' (seamless)' : ''}`);
      }
      
      // 1. Block input and start transition
      set({
        isTransitioning: true,
        inputBlocked: true,
        currentSceneState: SCENE_STATES.EXITING,
        sceneData: data,
      });
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] exit ${previousScene}`);
      }
      
      // 2. For seamless transitions, skip the overlay fade
      if (!seamless) {
        set({ overlayVisible: true });
        await animateValue(
          0, 1,
          TRANSITION_CONFIG.fadeOutDuration,
          (v) => set({ overlayOpacity: v })
        );
      }
      
      // 3. Run cleanup for previous scene
      const cleanups = state.cleanupCallbacks.get(previousScene) || [];
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch (e) {
          console.error(`[Scene] Cleanup error for ${previousScene}:`, e);
        }
      }
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] dispose ${previousScene}`);
      }
      
      // 4. For seamless, wait for camera/animation transition instead
      if (seamless) {
        // Seamless transition duration (camera move + character walk)
        await sleep(TRANSITION_CONFIG.seamlessDuration);
      } else {
        // Hold on black briefly
        await sleep(TRANSITION_CONFIG.holdDuration);
      }
      
      // 5. Switch to new scene
      set({
        currentScene: nextScene,
        currentSceneState: SCENE_STATES.ENTERING,
      });
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] enter ${nextScene}`);
      }
      
      // 6. Fade in (skip for seamless)
      if (!seamless) {
        await animateValue(
          1, 0,
          TRANSITION_CONFIG.fadeInDuration,
          (v) => set({ overlayOpacity: v })
        );
      }
      
      set({ overlayVisible: false });
      
      // 7. Scene is now active
      set({
        currentSceneState: SCENE_STATES.ACTIVE,
        isTransitioning: false,
        inputBlocked: false,
      });
      
      if (import.meta.env.DEV) {
        console.log(`[Scene] active ${nextScene}`);
      }
    },
    
    /**
     * Immediate scene switch (no transition).
     * Use sparingly - mainly for initial load.
     */
    setScene: (sceneId, data = {}) => {
      if (import.meta.env.DEV) {
        console.log(`[Scene] set ${sceneId} (immediate)`);
      }
      
      set({
        currentScene: sceneId,
        currentSceneState: SCENE_STATES.ACTIVE,
        sceneData: data,
        isTransitioning: false,
        inputBlocked: false,
        overlayOpacity: 0,
        overlayVisible: false,
      });
    },
    
    /**
     * Block input manually (for custom transitions).
     */
    blockInput: () => set({ inputBlocked: true }),
    
    /**
     * Unblock input manually.
     */
    unblockInput: () => set({ inputBlocked: false }),
    
    /**
     * Check if input should be allowed.
     */
    canAcceptInput: () => {
      const state = get();
      return !state.inputBlocked && 
             !state.isTransitioning && 
             state.currentSceneState === SCENE_STATES.ACTIVE;
    },
  }))
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function animateValue(from, to, duration, onUpdate) {
  return new Promise(resolve => {
    const startTime = performance.now();
    
    function tick() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (to - from) * eased;
      
      onUpdate(value);
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(tick);
  });
}

// =============================================================================
// SELECTORS
// =============================================================================

export const selectCurrentScene = (state) => state.currentScene;
export const selectSceneState = (state) => state.currentSceneState;
export const selectIsTransitioning = (state) => state.isTransitioning;
export const selectInputBlocked = (state) => state.inputBlocked;
export const selectOverlayOpacity = (state) => state.overlayOpacity;
export const selectOverlayVisible = (state) => state.overlayVisible;
export const selectSceneData = (state) => state.sceneData;
export const selectCanAcceptInput = (state) => state.canAcceptInput();

// =============================================================================
// HOOKS
// =============================================================================

export function useSceneTransition() {
  const transitionTo = useSceneStore((s) => s.transitionTo);
  const currentScene = useSceneStore(selectCurrentScene);
  const isTransitioning = useSceneStore(selectIsTransitioning);
  
  return { transitionTo, currentScene, isTransitioning };
}

export function useInputGate() {
  const inputBlocked = useSceneStore(selectInputBlocked);
  const canAcceptInput = useSceneStore((s) => s.canAcceptInput);
  
  return { inputBlocked, canAcceptInput };
}

export function useSceneCleanup(sceneId, cleanup) {
  const registerCleanup = useSceneStore((s) => s.registerCleanup);
  
  // Register on mount, unregister on unmount
  React.useEffect(() => {
    return registerCleanup(sceneId, cleanup);
  }, [sceneId, cleanup, registerCleanup]);
}

// Need React for the hook
import React from 'react';

export default useSceneStore;
