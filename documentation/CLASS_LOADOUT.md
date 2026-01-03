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
  slotMap: { slot_1: 'skill_1', ... },  // Class-specific loadout (uses action IDs)
  allowedSkills: Set(['ice_shard', 'meteor', ...]),  // Skills owned (semantic skill IDs)
  allowedActions: Set(['skill_1', 'skill_2', 'potion', 'azure', ...]),  // All equipable items (action IDs)
}
```

### ID Translation

The codebase uses two types of IDs:

1. **Semantic Skill IDs** (from JSON): `ice_shard`, `health_potion`, `meteor`
2. **Action IDs** (runtime): `skill_1`, `potion`, `skill_2`

Translation happens in `engine/actions.js`:
- `getActionIdForSkill(skillId)` → converts `health_potion` → `potion`
- `getSkillIdForAction(actionId)` → converts `potion` → `health_potion`

The `allowedActions` Set contains **action IDs** (post-translation) for slot assignment validation.
The `allowedSkills` Set contains **semantic skill IDs** for execution validation.

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

When assigning an item to a slot:

1. **Ownership Check** - Only items in `allowedActions` can be assigned (skills, consumables, pixies)
2. **Slot Type Check** - Skills go to SKILL_SLOTS, consumables to CONSUMABLE_SLOTS, pixies to PIXIE_SLOTS
3. **Swap on Duplicate** - Same item in different slot triggers a swap
4. **Persistence** - Changes are saved to class-specific localStorage immediately

```javascript
// assignToSlot validates before assigning
assignToSlot: (slotId, actionId) => {
  const { activeClassId, allowedActions } = get();
  
  // Block if not owned by current class
  if (!allowedActions.has(actionId)) {
    console.error(`[DEBUG][Equip] REJECTED: "${actionId}" not in allowedActions for ${activeClassId}`);
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
[DEBUG][ClassSwitch] wizard → cleric
[DEBUG][ClassSwitch] Loadout: {"slot_1":"skill_1",...}
[DEBUG][ClassSwitch] AllowedActions: ["skill_1","skill_2","potion","food","azure","verdant",...]
```

Equip attempts log:

```
[DEBUG][Equip] Attempt equip item="potion" into slot="slot_consumable_1" allowedActions=[...]
[DEBUG][Equip] ACCEPTED: "potion" → slot_consumable_1
```

Blocked equips log errors:

```
[DEBUG][Equip] REJECTED: "ice_shard" not in allowedActions for cleric
```

---

## Files Involved

| File | Role |
|------|------|
| `gameStore.js` | State owner, class switch logic, slot assignment guard |
| `useGame.js` | Component hooks (useActiveClass, useSlotMap) wrapping gameStore |
| `engine/classes.js` | Class JSON accessors, getAllAllowedActionsForClass |
| `engine/actions.js` | Action transformation, ID translation (getActionIdForSkill) |
| `config/slots.js` | Slot definitions, isDropCompatible |
| `data/classes/*.json` | Class definitions with skills and defaults |

> **Note:** `hooks/useSlotMap.jsx` is deprecated dead code - do not use. The `useSlotMap` hook is now in `useGame.js` and wraps gameStore.

---

## Invariants

1. **slotMap only contains action IDs from activeClassId's allowedActions**
2. **Switching class rebinds ALL class-scoped state**
3. **Slot assignment is validated by allowedActions (action IDs)**
4. **Execution is validated by allowedSkills (semantic skill IDs)**
5. **Each class's loadout persists independently**
6. **setActiveClass is the ONLY entry point for class switching**
7. **ID translation: semantic skill IDs → action IDs happens in getAllAllowedActionsForClass()**
