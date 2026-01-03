# Data Model Reference

This document describes all entity types in the data-driven ARPG framework.

## Entity Types Overview

| Entity | File Location | Description |
|--------|--------------|-------------|
| Class | `/data/classes/*.json` | Playable character classes |
| Skill | `/data/skills/*.json` | Active abilities |
| Status | `/data/statuses/*.json` | Buffs and debuffs |
| Pixie | `/data/pixes/*.json` | Passive companions |
| Achievement | `/data/achievements/*.json` | Unlockable achievements |
| Stat | `/data/stats/*.json` | Stat definitions |
| Animation | `/data/animations/*.json` | Animation mappings |
| Graph | `/data/graphs/*.json` | Computation graphs |

---

## Class Definition

Classes define playable character archetypes.

### Schema

```json
{
  "id": "string (lowercase_snake_case)",
  "name": "string (display name)",
  "description": "string (optional)",
  "model": "string (model filename)",
  "baseStats": {
    "maxHealth": "number (>= 1)",
    "maxMana": "number (>= 0)",
    "manaRegen": "number",
    "strength": "number",
    "intelligence": "number",
    "agility": "number",
    "armor": "number",
    "moveSpeed": "number"
  },
  "allowedSkills": ["skill_id", "..."],
  "defaultLoadout": {
    "1": "skill_id or null",
    "2": "skill_id or null",
    ...
  },
  "stateAnimations": {
    "idle": "animation_name",
    "moving": "animation_name"
  },
  "ui": {
    "color": "#RRGGBB"
  }
}
```

### Example

```json
{
  "id": "wizard",
  "name": "Wizard",
  "description": "Master of arcane magic",
  "model": "wizard.glb",
  "baseStats": {
    "maxHealth": 100,
    "maxMana": 100,
    "manaRegen": 1,
    "strength": 8,
    "intelligence": 20,
    "agility": 10,
    "armor": 5,
    "moveSpeed": 3.0
  },
  "allowedSkills": ["ice_shard", "meteor", "arcane_bolt"],
  "defaultLoadout": {
    "1": "ice_shard",
    "2": "meteor",
    "3": "mana_body"
  },
  "stateAnimations": {
    "idle": "standing",
    "moving": "running"
  },
  "ui": {
    "color": "#4a90d9"
  }
}
```

---

## Skill Definition

Skills are active abilities that players can use.

### Schema

```json
{
  "id": "string",
  "label": "string (display name)",
  "description": "string (optional)",
  "type": "cast | attack | channel | buff | consumable",
  "icon": "string (icon filename)",
  "animation": "string (animation key)",
  "costs": {
    "mana": "number (optional)",
    "health": "number (optional)"
  },
  "castTime": "number (seconds, 0 = instant)",
  "cooldown": "number (seconds)",
  "effects": [
    {
      "type": "effect_type",
      "target": "self | target | area",
      "...effect-specific fields"
    }
  ],
  "requirements": {
    "level": "number (optional)",
    "class": ["class_id", "..."] (optional)
  }
}
```

### Skill Types

| Type | Description |
|------|-------------|
| `cast` | Spell with cast time |
| `attack` | Instant melee/ranged attack |
| `channel` | Continuous effect while held |
| `buff` | Self or ally enhancement |
| `consumable` | Stackable item (potions, etc.) |

### Example

```json
{
  "id": "ice_shard",
  "label": "Ice Shard",
  "description": "Launch a shard of ice at your target",
  "type": "cast",
  "icon": "iceShard.png",
  "animation": "attacking",
  "costs": { "mana": 12 },
  "castTime": 0.4,
  "cooldown": 0,
  "effects": [
    {
      "type": "damage",
      "target": "target",
      "amount": 25,
      "damageType": "frost"
    }
  ]
}
```

---

## Status Effect Definition

Status effects represent buffs and debuffs applied to entities.

### Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string (optional)",
  "type": "buff | debuff",
  "icon": "string (optional)",
  "duration": "number (seconds) | null (permanent)",
  "tickRate": "number (seconds, optional)",
  "stacking": {
    "rule": "refresh | stack | none | extend",
    "maxStacks": "number (optional)"
  },
  "effects": [
    {
      "type": "effect_type",
      "...effect-specific fields"
    }
  ]
}
```

### Stacking Rules

| Rule | Behavior |
|------|----------|
| `refresh` | Reapply resets duration |
| `stack` | Multiple stacks accumulate |
| `none` | Cannot reapply while active |
| `extend` | Adds duration to existing |

### Example

```json
{
  "id": "mana_body",
  "name": "Mana Body",
  "description": "Damage converted to mana cost",
  "type": "buff",
  "icon": "manaBody.png",
  "duration": null,
  "tickRate": null,
  "stacking": { "rule": "none" },
  "effects": [
    {
      "type": "damage_redirect",
      "from": "health",
      "to": "mana",
      "percent": 100
    }
  ]
}
```

---

## Pixie Definition

Pixies are passive companions that provide stat bonuses.

### Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string (optional)",
  "buff": {
    "type": "stat_id",
    "value": "number",
    "operation": "add | multiply | set (optional)"
  },
  "visual": {
    "color": "#RRGGBB",
    "size": "number (optional)"
  }
}
```

### Example

```json
{
  "id": "azure",
  "name": "Azure Pixie",
  "description": "Increases mana pool",
  "buff": {
    "type": "maxMana",
    "value": 20,
    "operation": "add"
  },
  "visual": {
    "color": "#4a90d9",
    "size": 0.6
  }
}
```

---

## Achievement Definition

Achievements track player progress and milestones.

### Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "icon": "string (optional)",
  "rarity": "common | uncommon | rare | epic | legendary",
  "condition": {
    "type": "event | threshold | compound",
    "...condition-specific fields"
  },
  "hidden": "boolean (optional)"
}
```

### Condition Types

| Type | Fields | Description |
|------|--------|-------------|
| `event` | `eventName` | Triggered by specific event |
| `threshold` | `stat`, `operator`, `value` | Stat reaches threshold |
| `compound` | `operator`, `conditions[]` | AND/OR of conditions |

### Example

```json
{
  "id": "first_blood",
  "name": "First Blood",
  "description": "Defeat your first enemy",
  "rarity": "common",
  "condition": {
    "type": "event",
    "eventName": "enemy_killed",
    "count": 1
  }
}
```

---

## Stat Definition

Stats define character attributes and their relationships.

### Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string (optional)",
  "category": "base | derived | resource | combat | utility",
  "type": "flat | percent | multiplier",
  "default": "number",
  "min": "number (optional)",
  "max": "number (optional)",
  "dependencies": ["stat_id", "..."],
  "formula": "string (optional, JavaScript expression)"
}
```

### Example

```json
{
  "id": "damage_reduction",
  "name": "Damage Reduction",
  "category": "derived",
  "type": "percent",
  "default": 0,
  "min": 0,
  "max": 75,
  "dependencies": ["armor"],
  "formula": "armor / (armor + 100) * 100"
}
```

---

## Animation Mapping

Animation mappings connect semantic animation names to model-specific clips.

### Schema

```json
{
  "modelId": "string",
  "clips": {
    "semantic_name": "clip_name",
    "...": "..."
  }
}
```

### Example

```json
{
  "modelId": "wizard",
  "clips": {
    "idle": "standing",
    "run": "running",
    "cast_01": "attacking",
    "cast_02": "attacking_02"
  }
}
```

---

## Graph Definition

Graphs define computation flows for damage, costs, and other calculations.

See [Graph System](./GRAPH_SYSTEM.md) for complete documentation.

### Schema

```json
{
  "id": "string",
  "type": "scaling | modifier | conditional | event",
  "description": "string (optional)",
  "inputs": {
    "input_name": { "type": "number | boolean | string" }
  },
  "nodes": [
    {
      "id": "string",
      "type": "node_type",
      "...node-specific fields"
    }
  ],
  "edges": [
    { "from": "node_id", "to": "node_id", "...optional fields" }
  ]
}
```

### Example

```json
{
  "id": "spell_damage_scaling",
  "type": "scaling",
  "inputs": {
    "baseDamage": { "type": "number" },
    "intelligence": { "type": "number" }
  },
  "nodes": [
    { "id": "base", "type": "input", "inputName": "baseDamage" },
    { "id": "int", "type": "input", "inputName": "intelligence" },
    { "id": "scale", "type": "constant", "value": 0.02 },
    { "id": "bonus", "type": "math", "op": "multiply", "inputs": ["int", "scale"] },
    { "id": "final", "type": "math", "op": "add", "inputs": ["base", "bonus"] },
    { "id": "out", "type": "output", "input": "final" }
  ],
  "edges": [
    { "from": "base", "to": "final" },
    { "from": "int", "to": "bonus" },
    { "from": "scale", "to": "bonus" },
    { "from": "bonus", "to": "final" },
    { "from": "final", "to": "out" }
  ]
}
```
