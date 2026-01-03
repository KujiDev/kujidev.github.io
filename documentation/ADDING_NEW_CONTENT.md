# Adding New Content

This guide explains how to add new entities to the game without modifying code.

## Quick Reference

| Entity | File | Steps |
|--------|------|-------|
| Class | `/data/classes/<id>.json` | Create file, add to import |
| Skill | `/data/skills/skills.json` | Add to array |
| Status | `/data/statuses/statuses.json` | Add to array |
| Pixie | `/data/pixes/pixes.json` | Add to array |
| Achievement | `/data/achievements/achievements.json` | Add to array |
| Graph | `/data/graphs/graphs.json` | Add to array |

---

## Adding a New Class

### 1. Create the JSON file

Create `/src/data/classes/ranger.json`:

```json
{
  "id": "ranger",
  "name": "Ranger",
  "description": "Master of bow and nature magic",
  "model": "ranger.glb",
  "baseStats": {
    "maxHealth": 85,
    "maxMana": 60,
    "manaRegen": 0.5,
    "strength": 12,
    "intelligence": 12,
    "agility": 18,
    "armor": 8,
    "moveSpeed": 3.5
  },
  "allowedSkills": [
    "aimed_shot",
    "multishot",
    "disengage",
    "trap",
    "health_potion",
    "mana_biscuit"
  ],
  "defaultLoadout": {
    "1": "aimed_shot",
    "2": "multishot",
    "3": "trap",
    "4": null,
    "5": null,
    "6": null,
    "7": null,
    "8": null,
    "9": "health_potion",
    "0": "mana_biscuit"
  },
  "stateAnimations": {
    "idle": "idle",
    "moving": "run"
  },
  "ui": {
    "color": "#4d7c0f"
  }
}
```

### 2. Add to loader imports

Edit `/src/engine/loader.js`:

```javascript
// Add import at top
import rangerData from '@/data/classes/ranger.json';

// Add to loadClasses function
REGISTRIES.classes.set(rangerData.id, processClass(rangerData));
```

### 3. Add animation mapping (if model has unique clips)

Edit `/src/data/animations/animations.json`:

```json
{
  "modelId": "ranger",
  "clips": {
    "idle": "Idle",
    "run": "Run",
    "shoot": "Attack_Bow"
  }
}
```

---

## Adding a New Skill

### 1. Add icon asset

Place icon in `/src/assets/icons/aimedShot.png`

### 2. Register icon (if needed)

Edit `/src/engine/loader.js` ICON_MAP:

```javascript
const ICON_MAP = {
  // ...existing icons
  'aimedShot.png': () => import('@/assets/icons/aimedShot.png'),
};
```

### 3. Add skill definition

Edit `/src/data/skills/skills.json`:

```json
{
  "id": "aimed_shot",
  "label": "Aimed Shot",
  "description": "Carefully aimed shot that deals increased damage",
  "type": "cast",
  "icon": "aimedShot.png",
  "animation": "shoot",
  "costs": {
    "mana": 15
  },
  "castTime": 1.2,
  "cooldown": 4,
  "range": 30,
  "effects": [
    {
      "type": "damage",
      "target": "target",
      "amount": 50,
      "damageType": "physical",
      "formula": {
        "graph": "physical_damage_scaling"
      }
    }
  ],
  "requirements": {
    "class": ["ranger"]
  }
}
```

### 4. Add to class's allowedSkills

If the skill should be available to an existing class, add it to that class's `allowedSkills` array.

---

## Adding a New Status Effect

### 1. Add to statuses.json

Edit `/src/data/statuses/statuses.json`:

```json
{
  "id": "bleeding",
  "name": "Bleeding",
  "description": "Taking damage over time",
  "type": "debuff",
  "icon": "bleeding.png",
  "duration": 8,
  "tickRate": 2,
  "stacking": {
    "rule": "stack",
    "maxStacks": 5
  },
  "effects": [
    {
      "type": "damage_over_time",
      "damageType": "physical",
      "amount": 5,
      "scaling": "per_stack"
    }
  ]
}
```

---

## Adding a New Pixie

### 1. Add to pixes.json

Edit `/src/data/pixes/pixes.json`:

```json
{
  "id": "golden",
  "name": "Golden Pixie",
  "description": "Increases gold find",
  "buff": {
    "type": "goldFind",
    "value": 15,
    "operation": "add"
  },
  "visual": {
    "color": "#fbbf24",
    "size": 0.6
  }
}
```

---

## Adding a New Achievement

### 1. Add to achievements.json

Edit `/src/data/achievements/achievements.json`:

```json
{
  "id": "sharpshooter",
  "name": "Sharpshooter",
  "description": "Land 100 critical hits",
  "icon": "achievement_sharpshooter.png",
  "rarity": "rare",
  "condition": {
    "type": "threshold",
    "stat": "criticalHits",
    "operator": "gte",
    "value": 100
  },
  "hidden": false
}
```

### Compound Conditions

For complex unlock requirements:

```json
{
  "id": "ultimate_ranger",
  "name": "Ultimate Ranger",
  "description": "Master all ranger skills",
  "rarity": "legendary",
  "condition": {
    "type": "compound",
    "operator": "and",
    "conditions": [
      { "type": "threshold", "stat": "aimedShotUses", "operator": "gte", "value": 1000 },
      { "type": "threshold", "stat": "multishotUses", "operator": "gte", "value": 500 },
      { "type": "threshold", "stat": "trapKills", "operator": "gte", "value": 100 }
    ]
  }
}
```

---

## Adding a New Computation Graph

### 1. Add to graphs.json

Edit `/src/data/graphs/graphs.json`:

```json
{
  "id": "physical_damage_scaling",
  "type": "scaling",
  "description": "Scales physical damage with strength",
  "inputs": {
    "baseDamage": { "type": "number" },
    "strength": { "type": "number" }
  },
  "nodes": [
    { "id": "base", "type": "input", "inputName": "baseDamage" },
    { "id": "str", "type": "input", "inputName": "strength" },
    { "id": "scale", "type": "constant", "value": 0.03 },
    { "id": "bonus", "type": "math", "op": "multiply", "inputs": ["str", "scale"] },
    { "id": "final", "type": "math", "op": "add", "inputs": ["base", "bonus"] },
    { "id": "out", "type": "output", "outputName": "damage" }
  ],
  "edges": [
    { "from": "base", "to": "final" },
    { "from": "str", "to": "bonus" },
    { "from": "scale", "to": "bonus" },
    { "from": "bonus", "to": "final" },
    { "from": "final", "to": "out" }
  ]
}
```

---

## Adding a New Stat

### 1. Add to stats.json

Edit `/src/data/stats/stats.json`:

```json
{
  "id": "critical_chance",
  "name": "Critical Chance",
  "description": "Chance to deal critical damage",
  "category": "combat",
  "type": "percent",
  "default": 5,
  "min": 0,
  "max": 100,
  "dependencies": ["agility"],
  "formula": "5 + (agility * 0.2)"
}
```

---

## Validation

After adding content, the system validates it automatically at load time.

### Check for errors

Open browser console and look for validation warnings:

```
[DataLoader] Validation errors:
  skills/aimed_shot:
    - costs.mana must be a non-negative number
```

### Manual validation

```javascript
import { validateSkill } from '@/engine/validator';

const errors = validateSkill(myNewSkill);
if (errors.length > 0) {
  console.error('Invalid skill:', errors);
}
```

---

## Checklist

When adding new content:

- [ ] JSON follows correct schema
- [ ] ID is lowercase_snake_case
- [ ] Required fields are present
- [ ] References exist (skill IDs, graph IDs, etc.)
- [ ] Icons/assets are imported
- [ ] No duplicate IDs
- [ ] Build passes
- [ ] In-game test works
