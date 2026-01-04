# 🎥 PHASE 25: DIABLO-STYLE CAMERA & WORLD SYSTEM

## Overview

This document describes the "world moves around player" paradigm with click-to-move pathfinding.

## Core Concept

> "The hero is the anchor point of reality — the world bends around them."

The player character is **always** at position `(0, 0, 0)`. All movement is an illusion created by moving the world in the opposite direction.

```
Traditional Approach:
  Player moves → Camera follows → World stationary
  
Diablo-Style Approach (this project):
  Click ground → A* path → World follows path → Player stays at origin → Camera fixed
```

## Architecture

### Component Hierarchy

```
<Canvas>
  ├── <ClickToMove>                       ← HANDLES GROUND CLICKS
  │   ├── Global lights (ambient, directional)
  │   ├── <Player position={[0,0,0]} />  ← ALWAYS AT ORIGIN
  │   ├── <WorldRoot>                     ← MOVES OPPOSITE TO INPUT
  │   │   ├── <Town />
  │   │   ├── <TrainingDummy />
  │   │   ├── <ClickIndicator />          ← SHOWS DESTINATION
  │   │   └── (all world objects)
  │   ├── <IsometricCamera />             ← FIXED, NO ROTATION
  │   └── <MovementSync />                ← PATH FOLLOWING
```

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/worldStore.js` | Zustand store for world offset & path state |
| `src/components/WorldRoot/index.jsx` | Group that moves world objects |
| `src/components/IsometricCamera/index.jsx` | Fixed isometric camera |
| `src/systems/MovementSystem.jsx` | Click-to-move & path following |
| `src/systems/Pathfinding.js` | A* algorithm implementation |

## Movement Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Mouse Click │ ──▶ │ ClickToMove  │ ──▶ │ Pathfinding     │
│ on Ground   │     │ (raycast)    │     │ (A* algorithm)  │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ worldStore      │
                                         │ (path, offset)  │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ WorldRoot       │
                                         │ (lerp position) │
                                         └─────────────────┘
```

1. **ClickToMove** detects left-click on ground
2. Raycasts to find world position of click
3. **Pathfinder.findPath()** calculates A* path from player to destination
4. Path stored in `worldStore.setPath(path)`
5. Each frame, `worldStore.updatePathFollowing(delta)` follows path
6. **WorldRoot** lerps toward `targetOffset` for smooth movement

## Camera Configuration

The camera is fixed at an isometric angle:

```javascript
{
  azimuth: Math.PI / 4,  // 45° rotation around Y
  polar: Math.PI / 3,    // 60° from vertical
  distance: 18,          // Fixed distance from origin
}
```

Camera behavior:
- ✅ Always looks at `(0, 0, 0)` (where player is)
- ✅ No user rotation (orbit disabled)
- ✅ Optional zoom with mouse wheel
- ✅ Smooth damping for ARPG feel
- ❌ No roll
- ❌ No free orbit

## World Store API

```javascript
import useWorldStore, { 
  getWorldMutable, 
  getPlayerWorldPosition,
  getDestination 
} from '@/stores/worldStore';

// Read player's world position
const playerPos = getPlayerWorldPosition();

// Get destination (for indicators)
const dest = getDestination();

// Direct mutable access (for animation loops)
const { targetOffset, path, pathIndex } = getWorldMutable();
```

### Actions

| Action | Description |
|--------|-------------|
| `setPath(path)` | Set path to follow (array of Vector3) |
| `stopMovement()` | Stop movement and clear path |
| `updatePathFollowing(delta)` | Follow path (called each frame) |
| `teleportTo(x, y, z)` | Instant world offset (no pathfinding) |
| `resetWorld()` | Return world to origin |

## A* Pathfinding

The pathfinding system is in `src/systems/Pathfinding.js`.

### Configuration

```javascript
const CONFIG = {
  cellSize: 0.5,        // Navigation grid resolution
  gridExtent: 50,       // Half-size of nav grid
  diagonalCost: 1.414,  // sqrt(2) for diagonal moves
  smoothPath: true,     // Apply Chaikin smoothing
};
```

### Usage

```javascript
import { pathfinder } from '@/systems/Pathfinding';

// Find path from A to B
const path = pathfinder.findPath(startX, startZ, goalX, goalZ);

// Add/remove obstacles
pathfinder.addObstacle(worldX, worldZ, radius);
pathfinder.removeObstacle(worldX, worldZ, radius);

// Future: Connect to Rapier physics
pathfinder.setRapierWorld(rapierWorld);
```

### Rapier Integration (Future)

The pathfinder is designed to integrate with `@react-three/rapier`:

```javascript
// When rapier is initialized:
import { useRapier } from '@react-three/rapier';

function PathfindingSetup() {
  const { world } = useRapier();
  
  useEffect(() => {
    pathfinder.setRapierWorld(world);
  }, [world]);
  
  return null;
}
```

When `useRapier` is true, the pathfinder will:
1. Cast rays to check walkability
2. Respect collider shapes for obstacles
3. Dynamically update based on physics world

## WorldRoot Context

Components inside WorldRoot can access utilities:

```javascript
import { useWorld } from '@/components/WorldRoot';

function MyComponent() {
  const world = useWorld();
  
  // Get current world offset
  const offset = world.getWorldOffset();
  
  // Convert positions
  const worldPos = world.localToWorld(localPos);
  const localPos = world.worldToLocal(worldPos);
}
```

## Targeting Considerations

Since the player is at origin and world moves:

1. **Mouse raycasting** hits WorldRoot children at their offset positions
2. **Skill ranges** are calculated from origin (player) to target
3. **Projectiles** spawn at origin and travel into world space

## Debug Overlay

In development mode, the `MovementDebugOverlay` shows:

```
🎮 CLICK-TO-MOVE DEBUG
Player (world): (5.23, -3.14)
Player (local): (0, 0) ✓
Destination: (10.00, 5.00)
Path: 3 / 12
Moving: ✓
Speed: 5 u/s
Click ground to move
```

## Why This Approach?

| Benefit | Explanation |
|---------|-------------|
| Clean targeting | Player is always at known position |
| Animation consistency | No interpolation between player positions |
| Deterministic logic | Player state is always predictable |
| Multiplayer sync | Only need to sync worldOffset, not player transform |
| Simpler camera | Always looks at origin |
| Replay system | Easy to record/replay worldOffset changes |

## Non-Goals

- ❌ Physics engine (simple bounds checking if needed)
- ❌ Player mesh movement
- ❌ Camera coupled to player position
- ❌ Free camera rotation

## Camera Presets

Available in `IsometricCamera`:

```javascript
import { CAMERA_PRESETS } from '@/components/IsometricCamera';

// Diablo 2 style (higher, further)
<IsometricCamera {...CAMERA_PRESETS.diablo2} />

// Diablo 3 style (lower, closer)
<IsometricCamera {...CAMERA_PRESETS.diablo3} />

// Path of Exile style
<IsometricCamera {...CAMERA_PRESETS.poe} />
```
