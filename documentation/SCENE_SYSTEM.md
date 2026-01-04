# Scene Transition System

## Overview

The Scene Transition System provides production-grade scene management for the ARPG game. It ensures:

- **Only ONE scene is active at a time**
- **Proper lifecycle management** (preload → enter → active → exit → dispose)
- **Input isolation** during transitions (no click leaks)
- **Smooth fade transitions** between scenes
- **Asset preloading** before scene activation
- **Proper cleanup** of resources on scene exit

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           App.jsx                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                       SceneManager                               │ │
│  │  ┌─────────────┐  ┌────────────────────┐  ┌─────────────────┐  │ │
│  │  │   Scene     │  │      Scene         │  │     Scene       │  │ │
│  │  │  LOADING    │  │ CHARACTER_SELECTION│  │     GAME        │  │ │
│  │  │             │  │                    │  │                 │  │ │
│  │  │ LoadingScr  │  │ CharacterCreation  │  │ Canvas + HUD    │  │ │
│  │  └─────────────┘  └────────────────────┘  └─────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │                  TransitionOverlay                          ││ │
│  │  │  - Fade to/from black                                       ││ │
│  │  │  - Loading spinner                                          ││ │
│  │  │  - Blocks all input during transition                       ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          sceneStore.js                                │
│  - currentScene: 'loading' | 'characterSelection' | 'game'          │
│  - currentSceneState: 'idle' | 'preloaded' | 'entering' | 'active'  │
│                        | 'exiting' | 'disposed'                       │
│  - isTransitioning: boolean                                          │
│  - inputBlocked: boolean                                             │
│  - overlayOpacity: 0-1                                               │
│  - cleanupCallbacks: Map<sceneId, Function[]>                        │
└──────────────────────────────────────────────────────────────────────┘
```

## Scene Lifecycle

```
                    ┌─────────────┐
                    │    IDLE     │
                    │ (not loaded)│
                    └──────┬──────┘
                           │ markPreloaded()
                           ▼
                    ┌─────────────┐
                    │  PRELOADED  │
                    │(assets ready)│
                    └──────┬──────┘
                           │ transitionTo()
                           ▼
                    ┌─────────────┐
          ┌────────│  ENTERING   │
          │        │ (fading in) │
          │        └──────┬──────┘
          │               │ fade complete
          │               ▼
          │        ┌─────────────┐
          │        │   ACTIVE    │◄──── Input accepted here ONLY
          │        │ (rendering) │
          │        └──────┬──────┘
          │               │ transitionTo(other)
          │               ▼
          │        ┌─────────────┐
          │        │   EXITING   │
          │        │(fading out) │
          │        └──────┬──────┘
          │               │ cleanup callbacks run
          │               ▼
          │        ┌─────────────┐
          └───────▶│  DISPOSED   │
                   │ (cleaned up)│
                   └─────────────┘
```

## Core Components

### 1. sceneStore.js

Central Zustand store for scene state.

```jsx
import useSceneStore, { SCENES, useSceneTransition } from '@/stores/sceneStore';

// Get current scene
const currentScene = useSceneStore((s) => s.currentScene);

// Transition to a new scene
const { transitionTo } = useSceneTransition();
transitionTo(SCENES.GAME);

// Check if input is allowed
const canAcceptInput = useSceneStore((s) => s.canAcceptInput());
```

### 2. SceneManager + Scene Components

```jsx
import SceneManager, { Scene } from '@/components/SceneManager';

<SceneManager>
  <Scene id={SCENES.LOADING}>
    <LoadingScreen />
  </Scene>
  <Scene id={SCENES.CHARACTER_SELECTION}>
    <CharacterCreationScreen />
  </Scene>
  <Scene id={SCENES.GAME}>
    <GameScene />
  </Scene>
</SceneManager>
```

### 3. TransitionOverlay

Automatically handled by SceneManager. Shows:
- Fade to black during transition
- Optional loading spinner
- Blocks all pointer events

## Input Gating

All input handlers MUST check if input is allowed:

```jsx
// In click handlers
const handleClick = () => {
  if (!useSceneStore.getState().canAcceptInput()) {
    return; // Blocked during transition
  }
  // Handle click...
};

// Using the hook
const { inputBlocked, canAcceptInput } = useInputGate();
```

Input is automatically blocked:
- During `isTransitioning: true`
- When `inputBlocked: true`
- When scene state is not `ACTIVE`

## Asset Preloading

Preload assets before a scene becomes active:

```jsx
import { useScenePreload, preloadModels, preloadTextures } from '@/utils/preloader';

function GameScene() {
  useScenePreload(SCENES.GAME, async () => {
    await preloadModels(['/models/town.glb', '/models/wizard.glb']);
    await preloadTextures(['/textures/ground.jpg']);
  });
  
  // Scene content...
}
```

## Scene Cleanup

Register cleanup callbacks for when a scene exits:

```jsx
import { useCleanupRegistry, useOnSceneExit } from '@/utils/cleanup';

function GameScene() {
  // Option 1: Full cleanup registry
  const cleanup = useCleanupRegistry(SCENES.GAME);
  
  useEffect(() => {
    const geometry = new THREE.BoxGeometry();
    cleanup.addGeometry(geometry);
    
    const timer = setTimeout(() => {}, 1000);
    cleanup.addTimer(timer);
    
    return () => cleanup.cleanup();
  }, [cleanup]);
  
  // Option 2: Simple callback
  useOnSceneExit(SCENES.GAME, () => {
    // Clean up resources...
  });
}
```

## Adding a New Scene

1. **Add scene ID to sceneStore.js:**
```jsx
export const SCENES = {
  LOADING: 'loading',
  CHARACTER_SELECTION: 'characterSelection',
  GAME: 'game',
  INVENTORY: 'inventory',  // ← New scene
};
```

2. **Create scene component:**
```jsx
// src/components/InventoryScene/index.jsx
function InventoryScene() {
  const { transitionTo } = useSceneTransition();
  
  // Preload assets
  useScenePreload(SCENES.INVENTORY, async () => {
    await preloadImages(['/icons/item-1.png']);
  });
  
  // Register cleanup
  useOnSceneExit(SCENES.INVENTORY, () => {
    console.log('Inventory scene exiting');
  });
  
  return (
    <div className="inventory">
      <button onClick={() => transitionTo(SCENES.GAME)}>
        Back to Game
      </button>
    </div>
  );
}
```

3. **Add to SceneManager:**
```jsx
<SceneManager>
  {/* existing scenes... */}
  <Scene id={SCENES.INVENTORY}>
    <InventoryScene />
  </Scene>
</SceneManager>
```

## Transition Configuration

Adjust timing in sceneStore.js:

```jsx
const TRANSITION_CONFIG = {
  fadeOutDuration: 400,   // ms - fade to black
  fadeInDuration: 400,    // ms - fade from black  
  holdDuration: 100,      // ms - hold on black
};
```

## Debug Logging

In development mode, the system logs:
- `[Scene] transition <from> → <to>`
- `[Scene] exit <scene>`
- `[Scene] dispose <scene>`
- `[Scene] enter <scene>`
- `[Scene] active <scene>`
- `[INPUT] BLOCKED (scene transitioning)`
- `[GroundPlane] Click ignored (scene transitioning)`

## Best Practices

1. **Always check canAcceptInput()** before handling user input
2. **Use transitionTo()** instead of directly setting state
3. **Register cleanup callbacks** for any resources you create
4. **Preload heavy assets** before transitioning to a scene
5. **Don't store scene-specific state globally** - it should be disposed with the scene
6. **Test transitions** by rapidly clicking between scenes

## Files

| File | Purpose |
|------|---------|
| `src/stores/sceneStore.js` | Central scene state and transitions |
| `src/components/SceneManager/index.jsx` | React component for scene rendering |
| `src/components/TransitionOverlay/index.jsx` | Fade overlay during transitions |
| `src/utils/preloader.js` | Asset preloading utilities |
| `src/utils/cleanup.js` | Resource cleanup utilities |
