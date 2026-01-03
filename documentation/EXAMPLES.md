# Canonical Examples

This document contains **working examples** for adding new content to the ARPG system.
All examples use real IDs and the current system architecture.

---

## Table of Contents

1. [Adding a Class](#adding-a-class)
2. [Adding a Skill](#adding-a-skill)
3. [Adding a Status Buff Applied by a Skill](#adding-a-status-buff-applied-by-a-skill)
4. [Adding a Pixie (Passive)](#adding-a-pixie-passive)

---

## Adding a Class

### Overview

Classes define:
- Base stats
- Allowed skills
- Default loadout (slot assignments)
- Model and animations
- Default pixies

### Files Involved

| File | Purpose |
|------|---------|
| `/src/data/classes/<id>.json` | Class definition |
| `/src/engine/loader.js` | Import and register |

### Working Example: Wizard Class

**File:** `/src/data/classes/wizard.json`

```json
{
  "$schema": "../schemas/class.schema.json",
  "id": "wizard",
  "name": "Wizard",
  "description": "A master of arcane arts who commands devastating elemental magic.",
  
  "model": {
    "path": "/models/Wizard-transformed.glb",
    "scale": 1,
    "position": [0, 0, 0]
  },
  
  "ui": {
    "icon": null,
    "color": "#9070c0",
    "portrait": null
  },
  
  "baseStats": {
    "maxHealth": 100,
    "maxMana": 100,
    "healthRegen": 2,
    "manaRegen": 5,
    "moveSpeed": 1.0,
    "armor": 0,
    "magicResist": 10,
    "spellPower": 15,
    "attackPower": 5,
    "critChance": 0.05
  },
  
  "allowedElements": ["ice", "fire", "arcane", "mana"],
  "primaryElement": "arcane",
  
  "allowedSkills": [
    "ice_shard",
    "meteor",
    "arcane_rush",
    "mana_body",
    "arcane_bolt",
    "arcane_blast",
    "health_potion",
    "mana_biscuit"
  ],
  
  "defaultLoadout": {
    "slot_1": "ice_shard",
    "slot_2": "meteor",
    "slot_3": "arcane_rush",
    "slot_4": "mana_body",
    "slot_lmb": "arcane_bolt",
    "slot_rmb": "arcane_blast",
    "slot_consumable_1": "health_potion",
    "slot_consumable_2": "mana_biscuit",
    "slot_pixie_1": "azure"
  },
  
  "allowedPixies": null,
  "defaultPixies": ["azure"],
  "collectablePixies": ["verdant", "azure", "violet", "crimson"],
  
  "stateAnimations": {
    "idle": "IDLE",
    "casting": "CAST_SECONDARY",
    "attacking": "CAST_PRIMARY",
    "moving": "RUN",
    "dead": "DEATH"
  },
  
  "tags": ["caster", "ranged", "elemental", "glass_cannon"]
}
```

### How UI Maps to Class

1. **Slot Map** reads `defaultLoadout` to assign skills to UI slots
2. **PixieOrbit** component renders pixies from `defaultPixies`
3. **Wizard Model** loads from `model.path`
4. **Base Stats** initialize player state via `gameStore.js`

---

## Adding a Skill

### Overview

Skills define:
- Type (attack, cast, channel, buff, consumable)
- Costs (mana, health, manaPerSecond)
- Effects (damage, buff application, etc.)
- UI metadata (icon, keybind)

### Files Involved

| File | Purpose |
|------|---------|
| `/src/data/skills/skills.json` | Skill definitions array |
| `/src/engine/actions.js` | Skill ID mapping and icon registration |
| `/src/assets/icons/<name>.svg` | Icon asset |

### Working Example: Ice Shard (Attack)

**File:** `/src/data/skills/skills.json` (add to array)

```json
{
  "$schema": "../schemas/skill.schema.json",
  "id": "ice_shard",
  "label": "Ice Shard",
  "description": "Hurl a freezing shard of ice at your target, dealing frost damage.",
  "type": "attack",
  "element": "ice",
  "animation": "CAST_PRIMARY",
  "costs": {
    "mana": 15
  },
  "effects": {
    "damage": { "base": 25, "element": "ice" }
  },
  "restrictions": {
    "classes": ["wizard"]
  },
  "ui": {
    "icon": "ice-shard.svg",
    "defaultKey": "KeyQ"
  },
  "tags": ["projectile", "single_target", "frost"]
}
```

### How It Gets Equipped to a Slot

1. **JSON skill ID** (`ice_shard`) → **Engine maps to action ID** (`skill_1`)
2. **Slot Map** assigns `skill_1` to `slot_1`
3. **UI component** calls `getActionObjectForSlot('slot_1')` → gets full action with icon
4. **Input system** triggers `handleInput('skill_1', true/false)` on keypress

### Icon Registration

**File:** `/src/engine/actions.js`

```javascript
// Import the icon
import iceShardIcon from '@/assets/icons/ice-shard.svg';

// Add to ICON_MAP
const ICON_MAP = {
  'ice-shard.svg': iceShardIcon,
  // ... other icons
};

// Map semantic ID to action ID
const SKILL_TO_ACTION_ID = {
  'ice_shard': 'skill_1',
  // ... other mappings
};
```

### Working Example: Arcane Rush (Channel)

Channeled skills drain mana per second while held.

```json
{
  "$schema": "../schemas/skill.schema.json",
  "id": "arcane_rush",
  "label": "Arcane Rush",
  "description": "Channel arcane power to dash forward at high speed. Drains mana while active.",
  "type": "channel",
  "element": "arcane",
  "animation": "CAST_CHANNEL",
  "costs": {
    "manaPerSecond": 15
  },
  "effects": {
    "movement": { "speedMultiplier": 2.5 }
  },
  "restrictions": {
    "classes": ["wizard"]
  },
  "ui": {
    "icon": "arcane-rush.svg",
    "defaultKey": "KeyE"
  },
  "tags": ["movement", "channel", "escape"]
}
```

The `manaPerSecond` cost makes this a channel ability. The game checks `isChannelAction(action)` to determine behavior.

---

## Adding a Status Buff Applied by a Skill

### Overview

Status effects (buffs/debuffs) are defined separately from skills.
Skills reference statuses by ID in their effects.

### Files Involved

| File | Purpose |
|------|---------|
| `/src/data/statuses/statuses.json` | Status definitions |
| `/src/data/skills/skills.json` | Skill with buff reference |

### Working Example: Mana Body Buff

#### Step 1: Define the Status

**File:** `/src/data/statuses/statuses.json`

```json
{
  "$schema": "../schemas/status.schema.json",
  "id": "mana_body",
  "name": "Mana Body",
  "description": "Your body is infused with pure mana, greatly increasing mana regeneration.",
  "type": "buff",
  "duration": 30,
  "stacking": {
    "rule": "refresh",
    "maxStacks": 1
  },
  "effects": {
    "manaRegen": 10
  },
  "visual": {
    "icon": "mana-body.svg",
    "particleEffect": "mana_aura"
  },
  "tags": ["mana", "self_buff"]
}
```

#### Step 2: Create the Skill That Applies It

**File:** `/src/data/skills/skills.json`

```json
{
  "$schema": "../schemas/skill.schema.json",
  "id": "mana_body",
  "label": "Mana Body",
  "description": "Sacrifice your life force to infuse your body with pure mana.",
  "type": "buff",
  "element": "mana",
  "animation": "CAST_BUFF",
  "costs": {
    "health": 25
  },
  "effects": {
    "buff": {
      "id": "mana_body",
      "duration": 30
    }
  },
  "restrictions": {
    "classes": ["wizard"]
  },
  "ui": {
    "icon": "mana-body.svg",
    "defaultKey": "KeyR"
  },
  "tags": ["self_buff", "mana", "sacrifice"]
}
```

### How the Buff Is Applied

1. Player uses `mana_body` skill
2. `gameStore.addBuff()` is called with the buff definition
3. Buff appears in player's `buffs` array
4. **BuffBar** component renders the active buff
5. **gameStore tick** applies `manaRegen` bonus each tick
6. After 30 seconds, buff expires and is removed

### Duration and Stack Rules

| Rule | Behavior |
|------|----------|
| `refresh` | Reapplying resets duration, no stacking |
| `stack` | Multiple applications add stacks up to `maxStacks` |
| `extend` | Reapplying adds to duration |

---

## Adding a Pixie (Passive)

### Overview

Pixies are passive entities that provide permanent buffs while equipped.
They orbit the player visually and participate in the buff system.

### Files Involved

| File | Purpose |
|------|---------|
| `/src/data/pixes/pixes.json` | Pixie definitions |
| `/src/engine/loader.js` | Icon registration |
| `/src/hooks/useSlotMap.jsx` | Default slot assignment |
| `/src/data/classes/<class>.json` | Class default pixies |

### Working Example: Azure Wisp

**File:** `/src/data/pixes/pixes.json`

```json
{
  "$schema": "../schemas/pixie.schema.json",
  "id": "azure",
  "name": "Azure Wisp",
  "description": "A mystical wisp that restores magical energy.",
  "element": "mana",
  "buff": {
    "type": "manaRegen",
    "value": 4
  },
  "visual": {
    "color": "#40a0ff",
    "glowColor": "#2080ff",
    "icon": "pixie-azure.svg"
  },
  "restrictions": {
    "classes": null
  },
  "tags": ["mana", "arcane", "passive"]
}
```

### How Pixies Modify Stats

The `buff.type` maps to a stat modifier:

| Type | Effect |
|------|--------|
| `healthRegen` | Adds to health regeneration per tick |
| `manaRegen` | Adds to mana regeneration per tick |
| `maxHealth` | Increases maximum health |
| `maxMana` | Increases maximum mana |

### Attaching to a Character

#### Option 1: Class Default

**File:** `/src/data/classes/wizard.json`

```json
{
  "defaultPixies": ["azure"],
  "defaultLoadout": {
    "slot_pixie_1": "azure"
  }
}
```

#### Option 2: Slot Configuration

**File:** `/src/hooks/useSlotMap.jsx`

```javascript
export const PIXIE_SLOTS = [
  { id: 'slot_pixie_1', defaultAction: 'azure', position: 8, slotType: 'pixie' },
  { id: 'slot_pixie_2', defaultAction: null, position: 9, slotType: 'pixie' },
  { id: 'slot_pixie_3', defaultAction: null, position: 10, slotType: 'pixie' },
];
```

### How Pixies Participate in the System

1. **PixieOrbit** component reads equipped pixies from slot map
2. **PIXIES config** provides visual properties (color, glow)
3. **aggregatePixieBuffs()** calculates total stat bonuses
4. **gameStore tick** applies bonuses to regeneration
5. **BuffBar** shows equipped pixies in the passive section

### Icon Registration

**File:** `/src/engine/loader.js`

```javascript
import pixieAzureIcon from '@/assets/icons/pixie-azure.svg';

const ICON_MAP = {
  'pixie-azure.svg': pixieAzureIcon,
  // ... other icons
};
```

---

## System Flow Summary

```
JSON Data
    ↓
Engine Loader (resolves icons, validates)
    ↓
Actions Bridge (transforms to runtime format)
    ↓
Slot Map (assigns to UI positions)
    ↓
UI Components (render, handle input)
    ↓
Game Store (execute, apply effects)
```

### Key Principles

1. **JSON is the source of truth** - All entity definitions live in `/src/data/`
2. **Engine interprets, never defines** - Logic lives in stores and hooks
3. **Slots are containers** - They hold action IDs, not actions
4. **Icons are resolved at load time** - Mapped in ICON_MAP
5. **IDs are semantic** - Use `ice_shard`, not `skill_1`
