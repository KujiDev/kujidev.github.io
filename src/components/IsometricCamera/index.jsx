/**
 * =============================================================================
 * ISOMETRIC CAMERA - DIABLO-STYLE FIXED CAMERA
 * =============================================================================
 * 
 * A fixed isometric-style camera that:
 * - Always looks at the player (origin)
 * - Has NO user rotation (no orbiting)
 * - Has limited zoom range
 * - Provides smooth damping for ARPG feel
 * - Uses slight perspective (not true orthographic)
 * 
 * CAMERA BEHAVIOR:
 * ================
 * - Locked pitch (~60° from horizontal)
 * - Locked yaw (45° - classic isometric angle)
 * - No roll
 * - No user control except optional zoom
 * - Always targets (0, 0, 0) where player lives
 * 
 * WHY NOT CameraControls:
 * =======================
 * CameraControls is designed for orbit controls. Even when locked,
 * it fights against the fixed camera paradigm. This component provides
 * a simpler, purpose-built solution.
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================================
// CAMERA CONFIGURATION
// =============================================================================

const CAMERA_CONFIG = {
  // Isometric angle (45° is classic, but we use a slight offset for visual interest)
  azimuth: Math.PI / 4, // 45° rotation around Y axis
  
  // Polar angle (60° from vertical = 30° from horizontal)
  polar: Math.PI / 3, // ~60° from top
  
  // Distance from target (player at origin)
  distance: 18,
  
  // Zoom limits
  minDistance: 14,
  maxDistance: 24,
  
  // Smoothing for subtle camera lag (lower = more lag)
  smoothing: 0.08,
  
  // Target position (always origin - where player is)
  target: new THREE.Vector3(0, 0, 0),
};

// =============================================================================
// ISOMETRIC CAMERA COMPONENT
// =============================================================================

export default function IsometricCamera({ 
  distance = CAMERA_CONFIG.distance,
  azimuth = CAMERA_CONFIG.azimuth,
  polar = CAMERA_CONFIG.polar,
  smoothing = CAMERA_CONFIG.smoothing,
  enableZoom = false,
  minDistance = CAMERA_CONFIG.minDistance,
  maxDistance = CAMERA_CONFIG.maxDistance,
}) {
  const { camera, gl } = useThree();
  const currentDistance = useRef(distance);
  const targetDistance = useRef(distance);
  
  // Calculate camera position from spherical coordinates
  const calculateCameraPosition = (dist, azim, pol) => {
    const x = dist * Math.sin(pol) * Math.sin(azim);
    const y = dist * Math.cos(pol);
    const z = dist * Math.sin(pol) * Math.cos(azim);
    return new THREE.Vector3(x, y, z);
  };
  
  // Initial camera setup
  useEffect(() => {
    const pos = calculateCameraPosition(distance, azimuth, polar);
    camera.position.copy(pos);
    camera.lookAt(CAMERA_CONFIG.target);
    camera.updateProjectionMatrix();
  }, [camera, distance, azimuth, polar]);
  
  // Optional zoom with mouse wheel
  useEffect(() => {
    if (!enableZoom) return;
    
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const delta = e.deltaY * zoomSpeed * targetDistance.current;
      targetDistance.current = THREE.MathUtils.clamp(
        targetDistance.current + delta,
        minDistance,
        maxDistance
      );
    };
    
    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [enableZoom, gl, minDistance, maxDistance]);
  
  // Smooth camera updates
  useFrame((_, delta) => {
    // Smoothly interpolate distance (if zooming)
    if (enableZoom && Math.abs(currentDistance.current - targetDistance.current) > 0.01) {
      currentDistance.current = THREE.MathUtils.lerp(
        currentDistance.current,
        targetDistance.current,
        1 - Math.pow(smoothing, delta * 60)
      );
      
      const pos = calculateCameraPosition(currentDistance.current, azimuth, polar);
      camera.position.copy(pos);
    }
    
    // Always look at origin (player position)
    camera.lookAt(CAMERA_CONFIG.target);
  });
  
  return null; // Camera component doesn't render anything visible
}

// =============================================================================
// CAMERA PRESETS
// =============================================================================

export const CAMERA_PRESETS = {
  // Classic Diablo 2 style (higher angle, further away)
  diablo2: {
    distance: 22,
    azimuth: Math.PI / 4,
    polar: Math.PI / 3.5,
  },
  
  // Diablo 3 style (lower angle, closer)
  diablo3: {
    distance: 16,
    azimuth: Math.PI / 4,
    polar: Math.PI / 2.8,
  },
  
  // Path of Exile style (medium)
  poe: {
    distance: 18,
    azimuth: Math.PI / 4,
    polar: Math.PI / 3,
  },
  
  // Top-down (almost orthographic feel)
  topDown: {
    distance: 20,
    azimuth: Math.PI / 4,
    polar: Math.PI / 6,
  },
};
