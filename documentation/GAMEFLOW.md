# Game Flow

## Overview

This document describes the game session lifecycle: starting new games, loading saved games, and class switching.

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

- Click "New Game" button
- Call `startNewGame()` action

### Behavior

1. **Clear ALL localStorage** - All game-related keys are removed
2. **Reset to default class** - Wizard (or specified starting class)
3. **Load default loadout** - From class JSON config
4. **Reset resources** - Health/mana to max
5. **Clear buffs** - No active buffs
6. **Clear achievements** - Empty set
7. **Reset pixies** - Default collected pixies only

### Debug Logging

```
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
// App.jsx ClassSwitcher
const handleNewGame = useCallback(() => {
  startNewGame();      // Clears storage, resets state
  setClassId('wizard'); // Syncs UI context
}, [startNewGame, setClassId]);
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
