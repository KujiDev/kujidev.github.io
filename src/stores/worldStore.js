/**
 * =============================================================================
 * WORLD STORE - WORLD OFFSET & PATH-FOLLOWING MOVEMENT
 * =============================================================================
 * 
 * Manages the world offset for the "world moves around player" paradigm.
 * Uses CLICK-TO-MOVE with A* pathfinding.
 * 
 * KEY CONCEPTS:
 * =============
 * - Player is ALWAYS at (0, 0, 0) in world space
 * - World objects are offset by -playerPosition
 * - Click on ground → calculate path → follow path
 * - World moves along path, player stays at origin
 * 
 * PATH FOLLOWING:
 * ===============
 * - path[] contains waypoints in WORLD coordinates
 * - Each frame, move toward current waypoint
 * - When close enough, advance to next waypoint
 * - When path complete, stop moving
 * 
 * IMPORTANT - PERFORMANCE:
 * ========================
 * Position updates happen EVERY FRAME. Using React state for this would
 * cause infinite re-render loops. Instead:
 * - targetOffset is a MUTABLE Vector3 (not replaced, just mutated)
 * - Components read it directly via getState() in useFrame
 * - Only discrete state (isMoving, moveSpeed) triggers React re-renders
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as THREE from 'three';

// =============================================================================
// MOVEMENT CONSTANTS
// =============================================================================

const DEFAULT_MOVE_SPEED = 5; // Units per second
const DEFAULT_SMOOTHING = 0.15; // Lower = more damping (0-1)
const WAYPOINT_THRESHOLD = 0.3; // Distance to consider waypoint reached
const ARRIVAL_THRESHOLD = 0.1; // Distance to consider final destination reached

// =============================================================================
// MUTABLE STATE (NOT TRACKED BY REACT)
// These are mutated directly in animation loops, never trigger re-renders
// =============================================================================

const mutableState = {
  // Current world offset (where world actually is)
  currentOffset: new THREE.Vector3(0, 0, 0),
  
  // Target offset for smooth interpolation
  targetOffset: new THREE.Vector3(0, 0, 0),
  
  // Current movement direction (calculated from path)
  moveDirection: new THREE.Vector3(0, 0, 0),
  
  // Current facing direction (for character rotation)
  facingDirection: new THREE.Vector3(0, 0, -1),
  
  // Path waypoints (world coordinates)
  path: [],
  
  // Current waypoint index
  pathIndex: 0,
  
  // Final destination (for click indicator)
  destination: null,
};

// =============================================================================
// WORLD STORE
// =============================================================================

const useWorldStore = create(
  subscribeWithSelector((set, get) => ({
    // ==========================================================================
    // REACT STATE - Only discrete values that should trigger re-renders
    // ==========================================================================
    
    // Movement smoothing factor (lower = more damping)
    smoothing: DEFAULT_SMOOTHING,
    
    // Movement speed (units per second)
    moveSpeed: DEFAULT_MOVE_SPEED,
    
    // Is player currently moving? (discrete, for animations/UI)
    isMoving: false,
    
    // Has a destination been set? (for click indicator)
    hasDestination: false,
    
    // ==========================================================================
    // ACTIONS
    // ==========================================================================
    
    /**
     * Set a new path to follow.
     * Path should be an array of Vector3 waypoints in WORLD coordinates.
     */
    setPath: (path) => {
      if (!path || path.length === 0) {
        get().stopMovement();
        return;
      }
      
      mutableState.path = path;
      mutableState.pathIndex = 0;
      mutableState.destination = path[path.length - 1].clone();
      
      if (import.meta.env.DEV) {
        console.log('[worldStore] setPath called with', path.length, 'waypoints');
        console.log('[worldStore] First waypoint:', path[0]);
        console.log('[worldStore] Destination:', mutableState.destination);
      }
      
      // Start moving
      set({ isMoving: true, hasDestination: true });
    },
    
    /**
     * Stop all movement and clear path.
     */
    stopMovement: () => {
      mutableState.path = [];
      mutableState.pathIndex = 0;
      mutableState.moveDirection.set(0, 0, 0);
      mutableState.destination = null;
      
      if (get().isMoving || get().hasDestination) {
        set({ isMoving: false, hasDestination: false });
      }
    },
    
    /**
     * Reset world position to origin.
     * Called when starting a new game to ensure player starts at (0,0,0).
     */
    resetWorldPosition: () => {
      // Reset all position state
      mutableState.currentOffset.set(0, 0, 0);
      mutableState.targetOffset.set(0, 0, 0);
      mutableState.moveDirection.set(0, 0, 0);
      // Default facing: toward negative Z (standard forward direction)
      mutableState.facingDirection.set(0, 0, -1);
      mutableState.path = [];
      mutableState.pathIndex = 0;
      mutableState.destination = null;
      
      set({ isMoving: false, hasDestination: false });
      
      if (import.meta.env.DEV) {
        console.log('[worldStore] World position reset to origin (0,0,0)');
      }
    },
    
    /**
     * Update path following each frame.
     * Called from animation loop.
     * 
     * IMPORTANT: This mutates mutableState directly to avoid re-renders.
     * Uses targetOffset for calculations to prevent jitter from lerp.
     */
    updatePathFollowing: (deltaTime) => {
      const { isMoving, moveSpeed } = get();
      
      if (!isMoving || mutableState.path.length === 0) return;
      
      // Get current waypoint
      const waypoint = mutableState.path[mutableState.pathIndex];
      if (!waypoint) {
        get().stopMovement();
        return;
      }
      
      // Calculate player's intended world position from TARGET offset (not current)
      // This prevents jitter from the lerp interpolation
      const playerWorldPos = new THREE.Vector3(
        -mutableState.targetOffset.x,
        0,
        -mutableState.targetOffset.z
      );
      
      // Direction to waypoint
      const toWaypoint = new THREE.Vector3().subVectors(waypoint, playerWorldPos);
      toWaypoint.y = 0; // Keep on XZ plane
      
      const distanceToWaypoint = toWaypoint.length();
      
      // Check if we've reached the waypoint
      const isLastWaypoint = mutableState.pathIndex >= mutableState.path.length - 1;
      const threshold = isLastWaypoint ? ARRIVAL_THRESHOLD : WAYPOINT_THRESHOLD;
      
      if (distanceToWaypoint < threshold) {
        if (isLastWaypoint) {
          // Reached final destination
          get().stopMovement();
          return;
        } else {
          // Move to next waypoint
          mutableState.pathIndex++;
          return;
        }
      }
      
      // Normalize direction
      toWaypoint.normalize();
      
      // Update facing direction (for character rotation)
      mutableState.facingDirection.copy(toWaypoint);
      mutableState.moveDirection.copy(toWaypoint);
      
      // Calculate movement delta
      const moveDistance = Math.min(moveSpeed * deltaTime, distanceToWaypoint);
      const dx = toWaypoint.x * moveDistance;
      const dz = toWaypoint.z * moveDistance;
      
      // Move target offset (world moves opposite to player intent)
      mutableState.targetOffset.x -= dx;
      mutableState.targetOffset.z -= dz;
    },
    
    /**
     * Teleport to specific world position (instant, no pathfinding).
     */
    teleportTo: (x, y, z) => {
      get().stopMovement();
      mutableState.targetOffset.set(-x, -y, -z);
      mutableState.currentOffset.set(-x, -y, -z);
    },
    
    /**
     * Reset world to origin.
     */
    resetWorld: () => {
      mutableState.targetOffset.set(0, 0, 0);
      mutableState.currentOffset.set(0, 0, 0);
      mutableState.moveDirection.set(0, 0, 0);
      mutableState.facingDirection.set(0, 0, -1);
      mutableState.path = [];
      mutableState.pathIndex = 0;
      mutableState.destination = null;
      set({ isMoving: false, hasDestination: false });
    },
    
    /**
     * Set movement speed.
     */
    setMoveSpeed: (speed) => {
      set({ moveSpeed: speed });
    },
    
    /**
     * Set smoothing factor.
     */
    setSmoothing: (smoothing) => {
      set({ smoothing: Math.max(0.01, Math.min(1, smoothing)) });
    },
  }))
);

// =============================================================================
// SELECTORS - For React components that need to subscribe to state
// =============================================================================

export const useIsMoving = () => useWorldStore((state) => state.isMoving);
export const useMoveSpeed = () => useWorldStore((state) => state.moveSpeed);
export const useSmoothing = () => useWorldStore((state) => state.smoothing);
export const useHasDestination = () => useWorldStore((state) => state.hasDestination);

// =============================================================================
// DIRECT ACCESS - For animation loops (useFrame)
// =============================================================================

// Get mutable state directly (no React involvement)
export const getWorldMutable = () => mutableState;

// Get player's current world position (inverse of offset)
export const getPlayerWorldPosition = () => new THREE.Vector3(
  -mutableState.currentOffset.x,
  -mutableState.currentOffset.y,
  -mutableState.currentOffset.z
);

// Get facing direction for character rotation
export const getFacingDirection = () => mutableState.facingDirection;

// Get destination for click indicator
export const getDestination = () => mutableState.destination;

// Get current store values (no React involvement)
export const getWorldConfig = () => ({
  smoothing: useWorldStore.getState().smoothing,
  isMoving: useWorldStore.getState().isMoving,
  moveSpeed: useWorldStore.getState().moveSpeed,
});

// Get actions (stable references)
export const getWorldActions = () => ({
  setPath: useWorldStore.getState().setPath,
  stopMovement: useWorldStore.getState().stopMovement,
  updatePathFollowing: useWorldStore.getState().updatePathFollowing,
  teleportTo: useWorldStore.getState().teleportTo,
  resetWorld: useWorldStore.getState().resetWorld,
  setMoveSpeed: useWorldStore.getState().setMoveSpeed,
  setSmoothing: useWorldStore.getState().setSmoothing,
});

// Export raw store for direct access
export default useWorldStore;
