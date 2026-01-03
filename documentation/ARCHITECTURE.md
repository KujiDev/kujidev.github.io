# Data-Driven ARPG Framework Architecture

## Overview

This project implements a **data-driven ARPG framework** where all game content is defined in JSON files and interpreted by a runtime engine. This architecture enables:

- **Zero-code content updates** – Add new classes, skills, or items without touching JavaScript
- **Single source of truth** – Each entity is defined once, referenced everywhere
- **Composable systems** – The same graph can power a skill, a passive, or a status effect
- **Easy balancing** – Adjust numbers in JSON, see results immediately

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION                           │
│              React Components, Three.js, CSS                │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ state changes
                            │
┌─────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                        │
│                    Zustand (gameStore.js)                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ reads frozen data
                            │
┌─────────────────────────────────────────────────────────────┐
│                      ENGINE LAYER                            │
│         loader.js │ graph.js │ validator.js                 │
│                                                             │
│   • Loads JSON at startup                                   │
│   • Resolves asset references                               │
│   • Provides accessors (getSkillById, getClassById, etc.)  │
│   • Evaluates computation graphs                            │
│   • Validates data against schemas                          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ imports JSON
                            │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│              /src/data/ – JSON Files                        │
│                                                             │
│   /classes/   – Class definitions (wizard.json, etc.)       │
│   /skills/    – Skill definitions (skills.json)             │
│   /statuses/  – Buff/debuff definitions                     │
│   /pixes/     – Passive companion definitions               │
│   /achievements/ – Achievement conditions                    │
│   /stats/     – Stat formulas and dependencies              │
│   /animations/– Model animation mappings                    │
│   /graphs/    – Computation graph definitions               │
│   /schemas/   – JSON Schema validation files                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### At Load Time

1. **loader.js** imports all JSON files via Vite
2. Each entity is processed:
   - Icon filenames resolved to asset URLs
   - References validated
   - Object frozen for immutability
3. Entities stored in registries (Maps)
4. **validator.js** runs validation (development only)

### At Runtime

1. **gameStore.js** reads from engine accessors
2. Skill execution reads skill data from registry
3. **graph.js** evaluates computation graphs for:
   - Damage scaling
   - Cost reductions
   - Stat calculations
   - Conditional effects

### State Changes

1. User input triggers action
2. gameStore reads skill definition from engine
3. Graph evaluates scaling/modifiers
4. State updated in Zustand
5. React components re-render

## Key Design Principles

### 1. Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| JSON Data | What things ARE (definitions) |
| Engine | How to interpret definitions |
| Store | Current state of the game |
| Components | Visual representation |

### 2. Immutability

All data from the engine is **frozen** (`Object.freeze`). This ensures:
- No accidental mutations
- Predictable behavior
- Easy debugging

### 3. Reference by ID

Entities reference each other by string IDs, not direct object references:

```json
{
  "id": "wizard",
  "allowedSkills": ["ice_shard", "meteor", "arcane_bolt"]
}
```

The engine resolves these at runtime.

### 4. Composition over Inheritance

Instead of class hierarchies, entities compose behaviors:

```json
{
  "id": "meteor",
  "behaviors": ["damage", "area_effect"],
  "effects": [
    { "type": "damage", "formula": { "graph": "spell_damage_scaling" } }
  ]
}
```

## File Organization

```
src/
├── data/
│   ├── schemas/          # JSON Schema definitions
│   │   ├── class.schema.json
│   │   ├── skill.schema.json
│   │   └── ...
│   ├── classes/
│   │   └── wizard.json
│   ├── skills/
│   │   └── skills.json
│   ├── statuses/
│   │   └── statuses.json
│   ├── pixes/
│   │   └── pixes.json
│   ├── achievements/
│   │   └── achievements.json
│   ├── stats/
│   │   └── stats.json
│   ├── animations/
│   │   └── animations.json
│   └── graphs/
│       └── graphs.json
│
├── engine/
│   ├── loader.js         # Data loading and accessors
│   ├── graph.js          # Computation graph runtime
│   └── validator.js      # Schema validation
│
└── store/
    └── gameStore.js      # Zustand state management
```

## Related Documentation

- [Data Model Reference](./DATA_MODEL.md) – Entity schemas and examples
- [Graph System](./GRAPH_SYSTEM.md) – Computation graph architecture
- [Runtime Flow](./RUNTIME_FLOW.md) – Action execution paths
- [Adding New Content](./ADDING_NEW_CONTENT.md) – How to add entities
- [Common Failure Modes](./COMMON_FAILURE_MODES.md) – Troubleshooting
