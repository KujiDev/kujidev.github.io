/**
 * =============================================================================
 * SCENE MANAGER - Orchestrates Scene Lifecycle
 * =============================================================================
 * 
 * This component is the single source of truth for which scene is rendered.
 * 
 * RESPONSIBILITIES:
 * - Renders exactly ONE scene at a time
 * - Manages scene transitions with proper lifecycle
 * - Shows transition overlay during scene changes
 * - Gates input during transitions
 * 
 * USAGE:
 * ======
 * <SceneManager>
 *   <Scene id={SCENES.LOADING}>
 *     <LoadingScene />
 *   </Scene>
 *   <Scene id={SCENES.CHARACTER_SELECTION}>
 *     <CharacterSelectionScene />
 *   </Scene>
 *   <Scene id={SCENES.GAME}>
 *     <GameScene />
 *   </Scene>
 * </SceneManager>
 */

import React, { memo, useEffect, useMemo } from 'react';
import useSceneStore, {
  selectCurrentScene,
  selectSceneState,
  SCENE_STATES,
} from '@/stores/sceneStore';
import TransitionOverlay from '@/components/TransitionOverlay';

// =============================================================================
// SCENE COMPONENT
// =============================================================================

/**
 * Wrapper for individual scenes.
 * Children are only rendered when this scene is current.
 */
export const Scene = memo(function Scene({ id, children, onEnter, onExit, onPreload }) {
  const currentScene = useSceneStore(selectCurrentScene);
  const sceneState = useSceneStore(selectSceneState);
  const registerCleanup = useSceneStore((s) => s.registerCleanup);
  
  const isActive = currentScene === id;
  
  // Register onExit as cleanup
  useEffect(() => {
    if (onExit) {
      return registerCleanup(id, onExit);
    }
  }, [id, onExit, registerCleanup]);
  
  // Call onEnter when scene becomes active
  useEffect(() => {
    if (isActive && sceneState === SCENE_STATES.ACTIVE && onEnter) {
      onEnter();
    }
  }, [isActive, sceneState, onEnter]);
  
  // Call onPreload immediately (for preloading assets)
  useEffect(() => {
    if (onPreload) {
      onPreload();
    }
  }, [onPreload]);
  
  // Only render if this is the current scene
  if (!isActive) {
    return null;
  }
  
  return <>{children}</>;
});

// =============================================================================
// SCENE MANAGER COMPONENT
// =============================================================================

/**
 * Main scene manager - wraps all scenes and handles transitions.
 */
function SceneManager({ children, debug = false }) {
  const currentScene = useSceneStore(selectCurrentScene);
  const sceneState = useSceneStore(selectSceneState);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  
  // Debug logging
  useEffect(() => {
    if (debug && import.meta.env.DEV) {
      console.log(`[SceneManager] Scene: ${currentScene}, State: ${sceneState}, Transitioning: ${isTransitioning}`);
    }
  }, [currentScene, sceneState, isTransitioning, debug]);
  
  // Validate children - all should be Scene components
  const scenes = useMemo(() => {
    const sceneMap = new Map();
    
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === Scene) {
        const id = child.props.id;
        if (sceneMap.has(id)) {
          console.warn(`[SceneManager] Duplicate scene ID: ${id}`);
        }
        sceneMap.set(id, child);
      } else if (child) {
        console.warn('[SceneManager] Invalid child - use <Scene id="..."> wrapper');
      }
    });
    
    return sceneMap;
  }, [children]);
  
  return (
    <>
      {/* Render scene children */}
      {children}
      
      {/* Transition overlay - always mounted for smooth animations */}
      <TransitionOverlay />
    </>
  );
}

export default memo(SceneManager);
