/**
 * =============================================================================
 * MOVEMENT SYSTEM - CLICK-TO-MOVE WITH A* PATHFINDING
 * =============================================================================
 * 
 * Implements Diablo-style point-and-click movement.
 * 
 * PIPELINE:
 * =========
 * 1. User clicks on ground
 * 2. Raycast to find click position in world space
 * 3. Calculate path using A* pathfinding
 * 4. Store path in worldStore
 * 5. WorldRoot follows path each frame
 * 
 * COMPONENTS:
 * ===========
 * - ClickToMove: Handles ground click detection
 * - PathFollower: Updates world position along path each frame
 * - ClickIndicator: Visual feedback at destination
 * - MovementDebugOverlay: Dev overlay showing movement state
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useWorldStore, { 
  getWorldMutable, 
  getPlayerWorldPosition,
  getDestination,
  useHasDestination,
  getFacingDirection
} from '@/stores/worldStore';
import { useGameStore } from '@/stores/gameStore';
import { pathfinder } from './Pathfinding';
import useSceneStore from '@/stores/sceneStore';

// =============================================================================
// CLICK-TO-MOVE GROUND PLANE
// =============================================================================

// Track when game became active for click debounce
let gameActivatedTime = 0;
const CLICK_DEBOUNCE_MS = 300; // Ignore clicks for 300ms after transition

export function markGameActive() {
  gameActivatedTime = performance.now();
}

/**
 * Invisible ground plane that captures clicks for movement.
 * Uses R3F's built-in event system for reliable click detection.
 */
export function GroundPlane() {
  const actionsRef = useRef(null);
  if (!actionsRef.current) {
    actionsRef.current = {
      setPath: useWorldStore.getState().setPath,
    };
  }
  
  const handleClick = useCallback((event) => {
    // INPUT GATING: Block all clicks during scene transitions
    if (!useSceneStore.getState().canAcceptInput()) {
      if (import.meta.env.DEV) {
        console.log('[GroundPlane] Click ignored (scene transitioning)');
      }
      return;
    }
    
    // Debounce: Ignore clicks immediately after game transition
    // This prevents the "Begin Adventure" button click from triggering movement
    const timeSinceActive = performance.now() - gameActivatedTime;
    if (timeSinceActive < CLICK_DEBOUNCE_MS) {
      if (import.meta.env.DEV) {
        console.log('[GroundPlane] Click ignored (debounce):', timeSinceActive.toFixed(0), 'ms');
      }
      return;
    }
    
    // Stop propagation to prevent other handlers
    event.stopPropagation();
    
    // Get the intersection point in world space
    const clickPoint = event.point;
    
    // Account for world offset - the ground plane moves with WorldRoot
    // so we need the actual world position
    const mutable = getWorldMutable();
    const worldX = clickPoint.x - mutable.currentOffset.x;
    const worldZ = clickPoint.z - mutable.currentOffset.z;
    
    // Get player's current world position
    const playerPos = getPlayerWorldPosition();
    
    if (import.meta.env.DEV) {
      console.log('[GroundPlane] Click at world:', worldX.toFixed(2), worldZ.toFixed(2));
      console.log('[GroundPlane] Player at:', playerPos.x.toFixed(2), playerPos.z.toFixed(2));
    }
    
    // Find path from player to click point
    const path = pathfinder.findPath(
      playerPos.x, playerPos.z,
      worldX, worldZ
    );
    
    if (import.meta.env.DEV) {
      console.log('[GroundPlane] Path found:', path.length, 'waypoints');
    }
    
    if (path.length > 0) {
      actionsRef.current.setPath(path);
    }
  }, []);
  
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.01, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

/**
 * ClickToMove wrapper - now just a simple group wrapper.
 * Actual click handling is done by GroundPlane inside WorldRoot.
 */
export function ClickToMove({ children }) {
  return <group>{children}</group>;
}

// =============================================================================
// PATH FOLLOWER - Updates world position each frame
// =============================================================================

export function PathFollower() {
  // Get actions once (stable references)
  const actionsRef = useRef(null);
  if (!actionsRef.current) {
    actionsRef.current = {
      updatePathFollowing: useWorldStore.getState().updatePathFollowing,
    };
  }
  
  useFrame((_, delta) => {
    actionsRef.current.updatePathFollowing(delta);
  });
  
  return null;
}

// =============================================================================
// CLICK INDICATOR - Visual feedback at destination
// =============================================================================

export function ClickIndicator() {
  const meshRef = useRef();
  const ringRef = useRef();
  const scaleRef = useRef(1);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const dest = getDestination();
    const isMoving = useWorldStore.getState().isMoving;
    
    // Only show when we have a destination AND are moving
    if (!dest || !isMoving) {
      meshRef.current.visible = false;
      return;
    }
    
    // The indicator is inside WorldRoot which is positioned at currentOffset.
    // WorldRoot.position = currentOffset = -playerWorldPosition
    // 
    // For a child at local position L inside WorldRoot:
    //   scenePosition = L + WorldRoot.position = L + currentOffset
    // 
    // We want the indicator to appear at the destination's world position.
    // Since WorldRoot transforms by currentOffset, the local position should
    // simply be the world destination coordinates. The WorldRoot transform
    // will correctly position it relative to the player (at origin).
    //
    // Example: 
    //   - Player at world (5, 0, 3), so currentOffset = (-5, 0, -3)
    //   - Destination at world (7, 0, 5)
    //   - Indicator local position = (7, 0, 5)
    //   - Scene position = (7, 0, 5) + (-5, 0, -3) = (2, 0, 2) ✓
    //   - Player is at scene origin, so indicator is 2 units forward-right
    
    meshRef.current.position.set(dest.x, 0.05, dest.z);
    meshRef.current.visible = true;
    
    // Animate ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2;
    }
    
    // Pulse scale
    scaleRef.current = 0.9 + Math.sin(Date.now() * 0.005) * 0.1;
    meshRef.current.scale.setScalar(scaleRef.current);
  });
  
  return (
    <group ref={meshRef} visible={false}>
      {/* Center dot */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
      </mesh>
      
      {/* Animated ring */}
      <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// =============================================================================
// MOVEMENT DEBUG OVERLAY
// =============================================================================

export function MovementDebugOverlay() {
  const isMoving = useWorldStore((state) => state.isMoving);
  const moveSpeed = useWorldStore((state) => state.moveSpeed);
  const hasDestination = useWorldStore((state) => state.hasDestination);
  
  const [displayData, setDisplayData] = useState({
    playerX: 0, playerZ: 0,
    destX: 0, destZ: 0,
    pathLength: 0,
    pathIndex: 0,
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      const mutable = getWorldMutable();
      const dest = getDestination();
      const playerPos = getPlayerWorldPosition();
      
      setDisplayData({
        playerX: playerPos.x,
        playerZ: playerPos.z,
        destX: dest?.x ?? 0,
        destZ: dest?.z ?? 0,
        pathLength: mutable.path.length,
        pathIndex: mutable.pathIndex,
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!import.meta.env.DEV) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      padding: '10px 14px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#0f0',
      fontFamily: 'monospace',
      fontSize: '11px',
      lineHeight: 1.6,
      borderRadius: '4px',
      zIndex: 99999,
      pointerEvents: 'none',
      whiteSpace: 'pre',
    }}>
      <div style={{ color: '#ff0', marginBottom: 4 }}>🎮 CLICK-TO-MOVE DEBUG</div>
      <div>Player (world): ({displayData.playerX.toFixed(2)}, {displayData.playerZ.toFixed(2)})</div>
      <div>Player (local): (0, 0) ✓</div>
      {hasDestination && (
        <>
          <div>Destination: ({displayData.destX.toFixed(2)}, {displayData.destZ.toFixed(2)})</div>
          <div>Path: {displayData.pathIndex + 1} / {displayData.pathLength}</div>
        </>
      )}
      <div>Moving: {isMoving ? '✓' : '✗'}</div>
      <div>Speed: {moveSpeed} u/s</div>
      <div style={{ color: '#888', marginTop: 4 }}>Click ground to move</div>
    </div>
  );
}

// =============================================================================
// MOVEMENT STATE SYNC - Connects worldStore.isMoving to gameStore FSM
// =============================================================================

/**
 * Syncs worldStore movement state to gameStore player state.
 * When isMoving changes, triggers MOVE/STOP transitions in the FSM.
 * 
 * NOTE: Only uses gameStore.transition() - the single source of truth for FSM.
 * Components subscribe to gameStore via hooks/useGame.js.
 */
export function MovementStateSync() {
  const isMoving = useWorldStore((state) => state.isMoving);
  const prevIsMovingRef = useRef(false);
  
  useEffect(() => {
    const transition = useGameStore.getState().transition;
    
    if (isMoving && !prevIsMovingRef.current) {
      // Started moving - transition to MOVING state
      transition('MOVE');
      if (import.meta.env.DEV) {
        console.log('[MovementStateSync] → MOVE');
      }
    } else if (!isMoving && prevIsMovingRef.current) {
      // Stopped moving - transition to IDLE state  
      transition('STOP');
      if (import.meta.env.DEV) {
        console.log('[MovementStateSync] → STOP');
      }
    }
    
    prevIsMovingRef.current = isMoving;
  }, [isMoving]);
  
  return null;
}

// =============================================================================
// COMBINED MOVEMENT SYSTEM
// =============================================================================

export function MovementSync() {
  return (
    <>
      <PathFollower />
      <MovementStateSync />
    </>
  );
}

export default MovementSync;
