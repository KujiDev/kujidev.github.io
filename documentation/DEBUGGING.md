# Debugging Guide

## Overview

This project includes development-only debugging tools to help diagnose state issues, data flow problems, and class/action resolution.

## Debug Panel

### Enabling

The debug panel is **development-only** and automatically available when running with `npm run dev`.

### Toggle

- Press **`` ` ``** (backtick) or **F12** to toggle visibility
- Or call `window.toggleDebugPanel()` in the console

### Sections

| Section | Description |
|---------|-------------|
| **Class & State** | Current class ID, player state, active action, cast progress |
| **Resources** | Health/mana values, active buff count |
| **Allowed Actions** | Sets of skills (for execution) and actions (for slot assignment) |
| **Slot Map** | Current slot → action ID mapping |
| **Equipped Pixies** | List of equipped pixie IDs |
| **Class Content** | Counts of resolved skills, pixies, consumables |

---

## Console API

### window.DEBUG_CONTEXT

Exposes current state snapshot in the browser console:

```javascript
// Access current state
window.DEBUG_CONTEXT.activeClassId    // 'wizard'
window.DEBUG_CONTEXT.playerState      // 'idle', 'casting', etc.
window.DEBUG_CONTEXT.slotMap          // { slot_1: 'ice_shard', ... }
window.DEBUG_CONTEXT.allowedSkills    // ['ice_shard', 'meteor', ...]
window.DEBUG_CONTEXT.allowedActions   // includes skills + pixies

// Access resolved content
window.DEBUG_CONTEXT.skills           // Resolved skill objects for render
window.DEBUG_CONTEXT.pixies           // Resolved pixie objects
window.DEBUG_CONTEXT.consumables      // Resolved consumable objects

// Helpers
window.DEBUG_CONTEXT.getAction('ice_shard')  // Get action by ID
window.DEBUG_CONTEXT.getStore()              // Get raw Zustand store state

// Game session actions
window.DEBUG_CONTEXT.startNewGame()          // Reset all state to defaults
window.DEBUG_CONTEXT.startNewGame('cleric')  // Start as specific class
window.DEBUG_CONTEXT.exportSaveData()        // Export current state for saving
window.DEBUG_CONTEXT.loadSavedGame(saveData) // Load a saved game
```

### window.toggleDebugPanel()

Toggle debug panel visibility programmatically:

```javascript
window.toggleDebugPanel();
```

---

## Development Logging

The codebase uses `import.meta.env.DEV` guards for development-only logging.

### Key Log Locations

| File | Log Topic |
|------|-----------|
| `gameStore.js` | Class switches, skill execution, slot assignment, new game, load game |
| `useClassContent.js` | Content resolution timing |
| `engine/loader.js` | Asset resolution issues |
| `engine/actions.js` | Missing icon warnings |

### Enabling More Logs

Add logs with the pattern:

```javascript
if (import.meta.env.DEV) {
  console.log('[COMPONENT_NAME]', data);
}
```

---

## Common Debugging Scenarios

### 1. Skill Not Appearing in Menu

**Check:**
1. Is the skill ID in the class's `allowedSkills` array?
   ```javascript
   window.DEBUG_CONTEXT.allowedSkills
   ```
2. Is the skill defined in `src/data/skills/skills.json`?
3. Does the skill have a valid icon path?

### 2. Pixie Won't Equip

**Check:**
1. Is the pixie ID in the class's `collectablePixies` array?
   ```javascript
   window.DEBUG_CONTEXT.allowedActions.includes('pixie_id')
   ```
2. Is the slot correct? (Must be `slot_pixie_1`, `slot_pixie_2`, or `slot_pixie_3`)
3. Check console for guard rejection:
   ```
   [SLOT ASSIGN REJECTED] Action not allowed for this class: pixie_id
   ```

### 3. Element Color Not Showing

**Check:**
1. Is the skill's `element` field set in JSON?
2. Is `element.primaryColor` being passed as a prop?
   ```javascript
   window.DEBUG_CONTEXT.skills.find(s => s.id === 'skill_id')?.element
   ```

### 4. Class Switch Not Working

**Check:**
1. Console for class switch log:
   ```
   [CLASS SWITCH] wizard → cleric
   [LOADOUT] Loaded N slots
   [ALLOWED] X skills, Y total actions
   ```
2. Check slotMap after switch:
   ```javascript
   window.DEBUG_CONTEXT.slotMap
   ```

### 5. Buff Not Displaying

**Check:**
1. Is the buff in the active buffs array?
   ```javascript
   window.DEBUG_CONTEXT.getStore().buffs
   ```
2. Does the buff ID exist in `BUFF_DISPLAY_INFO`?
   ```javascript
   import { BUFF_DISPLAY_INFO } from '@/game/entities';
   BUFF_DISPLAY_INFO['buff_id']
   ```

---

## Validation

### allowedSkills vs allowedActions

| Set | Purpose | Contents |
|-----|---------|----------|
| `allowedSkills` | Execution guard - can this action be executed? | Skills + Consumables |
| `allowedActions` | Slot guard - can this action be assigned to a slot? | Skills + Consumables + Pixies |

The split exists because:
- Skills/consumables are "executed" (cast, used)
- Pixies are "equipped" (passive, always active when in slot)
- Both need class-scoped validation for slot assignment

---

## Architecture Invariants

When debugging, verify these invariants hold:

1. **Class-scoped content**: `useClassContent()` should only return entities for the active class
2. **Resolved props**: Components should receive pre-resolved props, not raw data
3. **Single source of truth**: All state should come from `gameStore`, not local component state
4. **Execution guards**: All skill execution should be validated by `allowedSkills`
5. **Slot guards**: All slot assignment should be validated by `allowedActions`

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - Layer separation
- [React Boundaries](./REACT_BOUNDARIES.md) - What React can/cannot do
- [Runtime Flow](./RUNTIME_FLOW.md) - Action execution paths
