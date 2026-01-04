/**
 * =============================================================================
 * PHYSICS WORLD - Rapier Integration for Movement
 * =============================================================================
 * 
 * Wraps the game scene in Rapier physics for proper collision detection
 * and movement. Uses the "world moves around player" paradigm:
 * 
 * - Player has a kinematic rigidbody at origin (0,0,0)
 * - World has a kinematic rigidbody that moves based on worldStore
 * - Click-to-move updates worldStore, physics follows
 * - Ground plane is a static collider for raycasting clicks
 * 
 * SINGLE SOURCE OF TRUTH:
 * =======================
 * - worldStore.mutableState holds the canonical world offset
 * - Physics bodies follow the store, not the other way around
 * - This keeps movement logic centralized
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, useRapier } from '@react-three/rapier';
import * as THREE from 'three';

import useWorldStore, { 
  getWorldMutable, 
  getPlayerWorldPosition,
  getDestination
} from '@/stores/worldStore';
import { pathfinder } from './Pathfinding';

// =============================================================================
// PHYSICS GROUND - Static collider for raycasting
// =============================================================================

/**
 * Physics-enabled ground plane for click detection.
 * Static body that moves with the world.
 */
export function PhysicsGround({ onGroundClick }) {
  const handleClick = useCallback((event) => {
    event.stopPropagation();
    
    // Get the intersection point
    const clickPoint = event.point;
    
    // Account for world offset to get world coordinates
    const mutable = getWorldMutable();
    const worldX = clickPoint.x - mutable.currentOffset.x;
    const worldZ = clickPoint.z - mutable.currentOffset.z;
    
    // Get player's current world position
    const playerPos = getPlayerWorldPosition();
    
    if (import.meta.env.DEV) {
      console.log('[PhysicsGround] Click at world:', worldX.toFixed(2), worldZ.toFixed(2));
    }
    
    // Find path from player to click point
    const path = pathfinder.findPath(
      playerPos.x, playerPos.z,
      worldX, worldZ
    );
    
    if (path.length > 0) {
      useWorldStore.getState().setPath(path);
    }
  }, []);
  
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        onClick={handleClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </RigidBody>
  );
}

// =============================================================================
// WORLD BODY - Kinematic body that follows worldStore offset
// =============================================================================

/**
 * Kinematic body that moves the world based on worldStore.
 * Children are positioned relative to this body.
 */
export function WorldBody({ children }) {
  const rigidBodyRef = useRef();
  
  useFrame(() => {
    if (!rigidBodyRef.current) return;
    
    const mutable = getWorldMutable();
    
    // Set kinematic body position to match world offset
    rigidBodyRef.current.setTranslation({
      x: mutable.currentOffset.x,
      y: mutable.currentOffset.y,
      z: mutable.currentOffset.z
    }, true);
  });
  
  return (
    <RigidBody 
      ref={rigidBodyRef} 
      type="kinematicPosition"
      colliders={false}
    >
      <group>
        {children}
      </group>
    </RigidBody>
  );
}

// =============================================================================
// CLICK INDICATOR - Shows destination with physics raycast validation
// =============================================================================

export function PhysicsClickIndicator() {
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
    
    // The destination is in WORLD coordinates
    // The click indicator is a child of WorldBody which is at currentOffset
    // So we need to position at: dest - (-currentOffset) = dest + currentOffset? No...
    // 
    // WorldBody is at currentOffset. 
    // Destination is at worldPos.
    // Child local position = worldPos - parentPos = dest - currentOffset
    // But wait, the indicator is NOT inside WorldBody in this design...
    // 
    // Let's think about this:
    // - Destination is stored in world coordinates (e.g., x=5, z=3)
    // - World offset is the inverse of player position (e.g., if player is at 5,3, offset is -5,-3)
    // - If indicator is in WorldBody (which is at offset -5,-3):
    //   - Local position = world position relative to WorldBody
    //   - dest (5,3) in world = dest - offset in local = 5-(-5), 3-(-3) = 10,6 ??? That seems wrong
    // 
    // Actually let's reconsider the coordinate system:
    // - Player is at origin (0,0,0)
    // - Player's "world position" is -offset (if offset is -5,-3, player is at 5,3)
    // - WorldBody is positioned at offset (-5,-3)
    // - Something at world position (5,3) should be at local position (5,3) - (-5,-3) = (10,6)? 
    // 
    // Wait no. If WorldBody.position = offset, and we want something to appear at world position W:
    // localPos = W - WorldBody.position = W - offset
    // 
    // If player is at world(5,3), offset = -5,-3
    // dest at world(7,5), localPos = (7,5) - (-5,-3) = (12,8)
    // 
    // Hmm, let me verify with a simpler case:
    // Player at world(0,0), offset = (0,0)
    // dest at world(3,4), localPos = (3,4) - (0,0) = (3,4) ✓
    // 
    // Player at world(5,0), offset = (-5,0)
    // dest at world(5,0) (same as player), localPos = (5,0) - (-5,0) = (10,0) ✗ should be (0,0)
    // 
    // I think the issue is the offset is stored as the negative. Let me check:
    // In worldStore: targetOffset = -playerWorldPos
    // So if player is at world(5,0), currentOffset = (-5,0)
    // WorldBody.position = currentOffset = (-5,0)
    // 
    // For something at world(5,0) to appear at scene origin (where player is rendered):
    // scene position = world position + offset = (5,0) + (-5,0) = (0,0) ✓
    // 
    // So for the indicator which is in WorldBody:
    // We want it at world position dest
    // WorldBody is at currentOffset
    // localPos in WorldBody = worldPos - WorldBody.position... no wait
    // 
    // If WorldBody.position = P, and child has localPos = L, then worldPos = P + L
    // So L = worldPos - P = dest - currentOffset
    // 
    // But wait, WorldBody.position = currentOffset, so:
    // L = dest - currentOffset
    // 
    // Since currentOffset = -playerWorldPos, and player is at origin in render:
    // L = dest - (-playerWorldPos) = dest + playerWorldPos
    // 
    // Hmm this is getting confusing. Let me just use the simpler approach:
    // The indicator is NOT in WorldBody - it's a separate entity that positions itself
    // based on the destination and current offset.
    //
    // Since everything inside WorldRoot (which uses currentOffset as position) has:
    // scenePos = localPos + currentOffset
    // 
    // We want scenePos = some stable position for the destination marker
    // The destination in world coords should appear at a fixed scene location
    // 
    // Actually simplest: destination.x + offset.x gives scene position if indicator is at root
    // But our indicator is inside WorldRoot, so it needs:
    // localPos = destScenePos - WorldRoot.position = (dest + offset) - offset = dest
    // 
    // Wait that means just use dest directly!
    
    const mutable = getWorldMutable();
    
    // If indicator is inside WorldRoot, local position IS the world position
    // because WorldRoot transforms everything by offset
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
// PHYSICS PROVIDER - Wraps scene in Rapier physics
// =============================================================================

export function PhysicsProvider({ children, debug = false }) {
  return (
    <Physics debug={debug} gravity={[0, -9.81, 0]}>
      {children}
    </Physics>
  );
}

export default PhysicsProvider;
