# Class-Scoped Loadout System

## Overview

The loadout (slotMap) is **class-scoped**, meaning each class has its own independent loadout that persists separately. When switching classes, the entire loadout is swapped atomically.

## Key Principles

1. **No Global Loadout** - There is no shared loadout between classes
2. **Data is the Single Source of Truth** - The gameStore owns the loadout, not the UI
3. **Execution Guard** - Skills are validated at execution time, not just render time
4. **No UI Cleanup Hacks** - The UI renders what the data says, period

---

## Storage Keys

Each class stores its loadout under a unique localStorage key:

```javascript
// Storage key format
`player_slotmap_${classId}`  // e.g., "player_slotmap_wizard"

// Active class storage
"player_active_class"  // e.g., "wizard"
```

---

## State Shape

```javascript
// In gameStore.js
{
  activeClassId: 'wizard',           // Current class
  slotMap: { slot_1: 'ice_shard', ... },  // Class-specific loadout
  allowedSkills: Set(['ice_shard', 'meteor', ...]),  // Skills owned by current class
}
```

---

## Class Switch Flow

When the user clicks a class button, this sequence executes:

```
1. ClassSwitcher.handleClassSwitch(classId)
   │
   ├─► setActiveClass(classId)     // gameStore action - AUTHORITY
   │   │
   │   ├─► saveSlotMapForClass(currentClassId, currentSlotMap)
   │   │     // Persists current loadout to "player_slotmap_wizard"
   │   │
   │   ├─► loadSlotMapForClass(classId)
   │   │     // Loads new loadout from "player_slotmap_cleric"
   │   │     // Falls back to class JSON default if empty
   │   │
   │   ├─► getAllowedSkillsForClass(classId)
   │   │     // Reads skills array from class JSON
   │   │
   │   └─► set({ activeClassId, slotMap, allowedSkills, ... })
   │         // Atomic state update - UI re-renders from this
   │
   └─► setClassId(classId)         // ClassContext - UI only
         // Updates model, visual theme, etc.
```

---

## Execution Guard

Even if a bug somehow put a wrong skill in the slotMap, the execution guard blocks it:

```javascript
// In handleInput (gameStore.js)
const skillId = action._skillId || action.id;
if (!state.allowedSkills.has(skillId)) {
  console.error(`[GUARD] Skill execution blocked: "${skillId}" not owned by ${state.activeClassId}`);
  return; // HARD BLOCK
}
```

---

## Slot Assignment Rules

When assigning a skill to a slot:

1. **Ownership Check** - Only skills in `allowedSkills` can be assigned
2. **Slot Type Check** - Skills go to SKILL_SLOTS, consumables to CONSUMABLE_SLOTS
3. **Duplicate Check** - Same skill cannot be in multiple slots
4. **Persistence** - Changes are saved to class-specific localStorage immediately

```javascript
// assignToSlot validates before assigning
assignToSlot: (slotId, actionId) => {
  const { slotMap, activeClassId, allowedSkills } = get();
  
  const action = getActionById(actionId);
  const skillId = action._skillId || action.id;
  
  // Block if not owned by current class
  if (!allowedSkills.has(skillId)) {
    console.warn(`Cannot assign ${skillId} - not owned by ${activeClassId}`);
    return;
  }
  
  // ... rest of assignment logic
  saveSlotMapForClass(activeClassId, updated);
}
```

---

## Default Loadout

Each class defines its default loadout in JSON:

```json
// wizard.json
{
  "id": "wizard",
  "loadout": {
    "default": {
      "slot_1": "ice_shard",
      "slot_2": "meteor"
    }
  }
}
```

On first load (no localStorage), the engine reads this default and persists it.

---

## Debugging

In development mode, class switches log detailed info:

```
[CLASS SWITCH] wizard → cleric
[LOADOUT] Loaded 2 slots
[ALLOWED] 3 skills available
```

Blocked executions log errors:

```
[GUARD] Skill execution blocked: "ice_shard" not owned by cleric
```

---

## Files Involved

| File | Role |
|------|------|
| `gameStore.js` | State owner, class switch logic |
| `useGame.js` | Component hooks (useActiveClass, useSlotMap) |
| `engine/classes.js` | Class JSON accessors |
| `config/classes/*.json` | Class definitions with skills and defaults |
| `App.jsx` | ClassSwitcher component |

---

## Invariants

1. **slotMap only contains skills from activeClassId**
2. **Switching class rebinds ALL class-scoped state**
3. **Execution is always validated by allowedSkills**
4. **Each class's loadout persists independently**
5. **setActiveClass is the ONLY entry point for class switching**
