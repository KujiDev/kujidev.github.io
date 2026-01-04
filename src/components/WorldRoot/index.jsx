/**
 * =============================================================================
 * WORLD ROOT - DIABLO-STYLE WORLD OFFSET SYSTEM
 * =============================================================================
 * 
 * This component implements the "world moves around player" paradigm:
 * - Player is ALWAYS at (0, 0, 0)
 * - World moves inversely to player input
 * - Camera always looks at origin (where player is)
 * 
 * ARCHITECTURE:
 * =============
 * - WorldRoot wraps all world objects (terrain, enemies, props, FX)
 * - Player is NOT a child of WorldRoot
 * - worldOffset state drives the group position
 * - Movement input updates worldOffset, not player position
 * 
 * WHY THIS APPROACH:
 * ==================
 * 1. Clean targeting - player is always at origin
 * 2. Animation consistency - no position interpolation issues
 * 3. Deterministic logic - player position is always known
 * 4. Future multiplayer sync - only need to sync worldOffset
 * 5. Simplified camera - always looks at (0, 0, 0)
 */

import { useRef, useMemo, createContext, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useWorldStore, { getWorldMutable } from '@/stores/worldStore';

// =============================================================================
// WORLD CONTEXT - Access world offset from any component
// =============================================================================

const WorldContext = createContext(null);

export function useWorld() {
  const context = useContext(WorldContext);
  if (!context) {
    // Allow null context for components outside world (e.g., in Canvas setup)
    return null;
  }
  return context;
}

// =============================================================================
// WORLD ROOT COMPONENT
// =============================================================================

export default function WorldRoot({ children }) {
  const groupRef = useRef();
  
  // Smoothly interpolate toward target offset
  // Access mutable state directly in useFrame to avoid re-renders
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Get mutable state directly (no React re-render)
    const mutable = getWorldMutable();
    const smoothing = useWorldStore.getState().smoothing;
    
    // Lerp current offset toward target
    mutable.currentOffset.lerp(mutable.targetOffset, 1 - Math.pow(smoothing, delta * 60));
    
    // Apply to group
    groupRef.current.position.copy(mutable.currentOffset);
  });
  
  // Context value - provides world-space utilities
  const contextValue = useMemo(() => ({
    // Get current world offset (for raycasting, targeting)
    getWorldOffset: () => getWorldMutable().currentOffset.clone(),
    
    // Convert screen/local position to world position
    localToWorld: (localPos) => {
      const offset = getWorldMutable().currentOffset;
      return new THREE.Vector3(
        localPos.x - offset.x,
        localPos.y - offset.y,
        localPos.z - offset.z
      );
    },
    
    // Convert world position to local (relative to player at origin)
    worldToLocal: (worldPos) => {
      const offset = getWorldMutable().currentOffset;
      return new THREE.Vector3(
        worldPos.x + offset.x,
        worldPos.y + offset.y,
        worldPos.z + offset.z
      );
    },
  }), []);
  
  return (
    <WorldContext.Provider value={contextValue}>
      <group ref={groupRef}>
        {children}
      </group>
    </WorldContext.Provider>
  );
}
