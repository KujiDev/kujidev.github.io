# Game Flow

## Overview

This document describes the game session lifecycle: screen navigation, starting new games, loading saved games, and character creation.

## Screen Flow

```
┌─────────────────┐     New Game      ┌────────────────────────┐     Confirm      ┌─────────────┐
│  LoadingScreen  │ ────────────────► │ CharacterCreationScreen │ ──────────────► │  GameScene  │
└─────────────────┘                   └────────────────────────┘                  └─────────────┘
         │                                                                               ▲
         │                              Continue                                         │
         └───────────────────────────────────────────────────────────────────────────────┘
```

### Flow States (App.jsx)

| State | Description |
|-------|-------------|
| `LOADING` | Initial state. Shows loading progress, then New Game / Continue buttons |
| `CHARACTER_CREATION` | Class selection screen for new games |
| `GAME` | Main game scene with player, UI, world |

### Navigation Rules

- **New Game** → Always goes through CharacterCreationScreen
- **Continue** → Skips CharacterCreationScreen, loads saved game directly
- **No in-game class switching** - ClassSwitcher removed in Phase 19
- **No in-game new game button** - Must go through LoadingScreen

---

## CharacterCreationScreen

### Purpose

- Single authority for initializing a new game
- Player selects class from available options (data-driven from class config)
- On confirm: `startNewGame(classId)` is called, then navigates to GameScene

### R3F Campfire Scene (Phase 20)

The character creation screen features a 3D campfire scene with class models:

```
┌─────────────────────────────────────────────────────────────┐
│                    Choose Your Class                         │
│                                                              │
│     ┌──────────┐            🔥            ┌──────────┐      │
│     │  Wizard  │        Campfire          │  Cleric  │      │
│     │  Panel   │                          │  Panel   │      │
│     └──────────┘                          └──────────┘      │
│         🧙                                    🧎             │
│      (model)                               (model)           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Selected Class: Wizard                              │   │
│  │  Master of arcane devastation...                     │   │
│  │  HP: 100 | MP: 100 | HP/s: 2 | MP/s: 5               │   │
│  │  [caster] [ranged] [elemental] [glass_cannon]        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    [ Begin Adventure ]                       │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| `CharacterSelectionScene` | R3F Canvas with Town, models, panels |
| `ClassPreviewModel` | Displays class model in idle animation |
| `CharacterPanel3D` | Floating HTML panel with class info |

### Data-Driven Model Placement

```json
// In class.json
"characterSelection": {
  "position": [-2.5, 0, -1.5],
  "rotation": 0.4,
  "panelOffset": [0, 2.5, 0]
}
```

### Interaction

- **Click model or panel** → Selects that class
- **Hover model** → Gold glow effect (matches game UI)
- **Selected model** → Bronze highlight + gentle float animation
- **Click empty space** → No effect (selection stays)

### Stability (Phase 21)

- **Suspense boundaries** around each model for graceful loading
- **Error handling** for missing animations (falls back to first available)
- **CSS variables** from game theme for consistent styling
- **Safe async loading** prevents white screens

### Debug Logging

```
[DEBUG][CharacterCreation] Loaded class: wizard animations: [IDLE, CAST_SECONDARY, CAST_PRIMARY, RUN, DEATH]
[DEBUG][CharacterCreation] selectedClass=wizard
[DEBUG][CharacterCreation] selectedClass=wizard, className=Wizard, defaultLoadout={...}
```

---

## State Persistence

### What is Persisted (localStorage)

| Key | Description |
|-----|-------------|
| `player_active_class` | Currently selected class ID |
| `player_slotmap_{classId}` | Slot assignments per class |
| `player_pixies` | Collected pixie IDs |
| `player_achievements` | Unlocked achievement IDs |

### What is NOT Persisted

- Current health/mana (restored to max on reload)
- Active buffs (ephemeral, expire on session end)
- Casting state (reset to idle)
- Target selection

---

## New Game Flow

### Trigger

1. Click "New Game" in LoadingScreen
2. Select class in CharacterCreationScreen
3. Click "Begin Adventure"

### Behavior

1. **Navigate to CharacterCreationScreen**
2. **Player selects class** from data-driven list
3. **startNewGame(classId) is called:**
   - Clear ALL localStorage
   - Reset to selected class
   - Load default loadout from class JSON config
   - Reset resources to max
   - Clear buffs
   - Clear achievements
   - Reset pixies to defaults
4. **Navigate to GameScene**

### Debug Logging

```
[LOADING SCREEN] New Game selected - navigating to Character Creation
[CHARACTER CREATION] Selected class: wizard
[GAME FLOW] Character created with class: wizard
[NEW GAME] ============================================
[NEW GAME] Starting class: wizard
[NEW GAME] Fresh loadout slots: 8
[NEW GAME] Allowed skills: 8
[NEW GAME] Allowed actions: 12
[NEW GAME] Pixies reset to: verdant, azure
[NEW GAME] Achievements cleared
[NEW GAME] ============================================
```

### Code Path

```javascript
// CharacterCreationScreen/index.jsx
const handleConfirm = useCallback(() => {
  if (!selectedClassId) return;
  startNewGame(selectedClassId);  // Clears storage, resets state to selected class
  onComplete(selectedClassId);    // Navigate to GameScene
}, [selectedClassId, startNewGame, onComplete]);
```

---

## Load Game Flow

### Trigger

- Call `loadSavedGame(saveData)` action

### Behavior

1. **Clear ALL localStorage** - Prevents merge conflicts
2. **Validate save data** - Must have `activeClassId`
3. **Restore class loadouts** - All classes' slot maps
4. **Restore pixies** - Collected pixie IDs
5. **Restore achievements** - Unlocked achievement IDs
6. **Restore resources** - Health/mana (optional, defaults to max)
7. **Reset buffs** - Buffs don't persist across sessions
8. **Rebuild allowed actions** - From class config, not save

### Save Data Format

```javascript
{
  activeClassId: 'wizard',
  classLoadouts: {
    wizard: { slot_1: 'ice_shard', slot_2: 'meteor', ... },
    cleric: { slot_1: 'heal', slot_2: 'smite', ... }
  },
  collectedPixies: ['verdant', 'azure', 'violet'],
  unlockedAchievements: ['first_cast', 'potion_master'],
  health: 85,
  mana: 42
}
```

### Debug Logging

```
[LOAD GAME] ============================================
[LOAD GAME] Active class: wizard
[LOAD GAME] Loaded slots: 8
[LOAD GAME] Pixies: 3
[LOAD GAME] Achievements: 2
[LOAD GAME] ============================================
```

---

## Class Switch Flow

### Trigger

- Click class button
- Call `setActiveClass(classId)` action

### Behavior

1. **Save current class loadout** - Persists to localStorage
2. **Load new class loadout** - From localStorage or defaults
3. **Rebuild allowed actions** - From class config
4. **Reset casting state** - Prevents ghost abilities

### Debug Logging

```
[CLASS SWITCH] wizard → cleric
[LOADOUT] Loaded 8 slots
[ALLOWED] 6 skills, 10 total actions
```

---

## Critical Invariants

### New Game Guarantees

- ✅ No old skills appear in loadout
- ✅ No old pixies in equipped slots
- ✅ No old consumables visible
- ✅ No old achievements unlocked
- ✅ Resources at max
- ✅ No active buffs

### Load Game Guarantees

- ✅ Complete overwrite, no merge
- ✅ All class loadouts restored
- ✅ Active class correctly selected
- ✅ Allowed actions from config (not save)

### Never Merge

The system NEVER merges old state with new state:

```javascript
// BAD: This would cause state leaks
const newState = { ...oldState, ...loadedState };

// GOOD: Complete replacement
set({
  activeClassId: classId,
  slotMap: freshSlotMap,
  // ... all fields explicitly set
});
```

---

## Console API

### Start New Game

```javascript
window.DEBUG_CONTEXT.startNewGame();
// Or with specific starting class:
window.DEBUG_CONTEXT.startNewGame('cleric');
```

### Export Save Data

```javascript
const save = window.DEBUG_CONTEXT.exportSaveData();
console.log(JSON.stringify(save, null, 2));
```

### Load Save Data

```javascript
const save = { activeClassId: 'wizard', ... };
window.DEBUG_CONTEXT.loadSavedGame(save);
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Layer separation
- [State Management](./ARCHITECTURE.md#state-management) - State sets
- [Debugging](./DEBUGGING.md) - Debug panel and console
