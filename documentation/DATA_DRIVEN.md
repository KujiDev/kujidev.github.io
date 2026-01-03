# Data-Driven Architecture

## Core Principle

**Data flows in ONE direction: JSON → Logic → State → UI**

React has ZERO authority. It renders what it's told.

---

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                    │
│                         /src/data/ (JSON only)                            │
│                                                                           │
│   classes/           skills/           pixies/          statuses/         │
│   ├─ wizard.json     └─ skills.json    └─ pixies.json   └─ statuses.json  │
│   └─ cleric.json                                                          │
│                                                                           │
│   • IDs only                                                              │
│   • No imports from React                                                 │
│   • No logic                                                              │
│   • No JSX                                                                │
│   • This is the GAME DEFINITION                                          │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ imported by
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              ENGINE LAYER                                  │
│                           /src/engine/ (loaders)                          │
│                                                                           │
│   loader.js          classes.js         actions.js        panels.js       │
│                                                                           │
│   • Loads JSON at startup                                                 │
│   • Resolves asset references (icons → URLs)                              │
│   • Builds registries (Maps)                                              │
│   • Provides accessors: getSkillById(), getClassById()                   │
│   • NO GAME RULES - just data access                                     │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ consumed by
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              GAME LAYER                                    │
│                        /src/game/ (pure logic)                            │
│                                                                           │
│   classInstance.js    loadout.js       validation.js     execution.js    │
│   entities.js                                                             │
│                                                                           │
│   • PURE FUNCTIONS: data in → data out                                   │
│   • Framework-agnostic (no React, no Zustand)                            │
│   • Deterministic                                                         │
│   • Testable without UI                                                   │
│   • THIS IS WHERE GAME RULES LIVE                                        │
│                                                                           │
│   Key responsibilities:                                                   │
│   ├─ createClassInstance(classId) → ClassInstance                        │
│   ├─ validateSkillExecution(skillId, class, resources) → result          │
│   ├─ assignToSlot(loadout, slotId, actionId, class) → new loadout       │
│   ├─ resolveSkillsForClass(class, context) → render-ready props          │
│   └─ executeSkill(skillId, class, state) → state changes                 │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ called by
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              STATE LAYER                                   │
│                       /src/stores/ (Zustand)                              │
│                                                                           │
│   gameStore.js                                                            │
│                                                                           │
│   • THIN ADAPTER only                                                     │
│   • Holds snapshots of logic output                                       │
│   • Forwards intents to game layer                                        │
│   • NEVER invents state                                                   │
│   • NEVER filters or interprets                                           │
│                                                                           │
│   Pattern:                                                                │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  dispatch(assignSkill({ classId, slotId, skillId }))           │    │
│   │            │                                                    │    │
│   │            ▼                                                    │    │
│   │  const result = game.assignToSlot(loadout, slotId, skillId);   │    │
│   │            │                                                    │    │
│   │            ▼                                                    │    │
│   │  if (result.success) set({ slotMap: result.loadout });         │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ exposed via hooks
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              HOOK LAYER                                    │
│                        /src/hooks/ (adapters)                             │
│                                                                           │
│   useGame.js          useClassContent.js        useDragDrop.jsx          │
│                                                                           │
│   • THIN ADAPTERS between Zustand and React                              │
│   • Call game layer for resolution                                        │
│   • Return pre-resolved, render-ready props                              │
│   • NO domain logic                                                       │
│                                                                           │
│   Pattern:                                                                │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  export function useClassSkills() {                             │    │
│   │    const { classId } = useCurrentClass();                       │    │
│   │    const { slotMap } = useSlotMap();                            │    │
│   │                                                                 │    │
│   │    return useMemo(() => {                                       │    │
│   │      const classInstance = createClassInstance(classId);        │    │
│   │      return resolveSkillsForClass(classInstance, { slotMap });  │    │
│   │    }, [classId, slotMap]);                                      │    │
│   │  }                                                              │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ consumed by
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              REACT LAYER                                   │
│                       /src/components/ (renderers)                        │
│                                                                           │
│   SkillBar/           SpellBook/          Pixies/         CastingBar/    │
│                                                                           │
│   • RENDERER ONLY                                                         │
│   • Receives IDs + pre-resolved props                                    │
│   • Maps data → JSX                                                       │
│   • Handles visuals (shaders, animations, effects)                       │
│   • Forwards input events                                                 │
│   • NEVER interprets, filters, or decides                                │
│                                                                           │
│   Pattern:                                                                │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  function SkillCard({ id, label, icon, element, isAssigned }) { │    │
│   │    return (                                                     │    │
│   │      <div className={isAssigned ? 'assigned' : ''}>            │    │
│   │        <img src={icon} alt={label} />                          │    │
│   │        <span style={{ color: element?.primaryColor }}>        │    │
│   │          {label}                                                │    │
│   │        </span>                                                  │    │
│   │      </div>                                                     │    │
│   │    );                                                           │    │
│   │  }                                                              │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Why React Has Zero Authority

### The Test

> If you delete React, the game rules must still exist.

The game layer (`/src/game/`) contains:
- What a class instance is
- How loadouts work
- Validation rules
- Execution logic

None of this requires React. You could:
- Run it in Node.js
- Test it with Jest
- Build a CLI version
- Port to a different UI framework

React is just the current rendering choice.

---

## Forbidden Patterns

### ❌ React Defining Concepts

```jsx
// FORBIDDEN: React knows what skill types are
const SKILL_TYPES = {
  INSTANT: 'instant',
  CHANNEL: 'channel',
  TOGGLE: 'toggle',
};
```

This belongs in `/src/game/` or `/src/data/`.

### ❌ React Filtering Data

```jsx
// FORBIDDEN: React doing domain filtering
const iceSkills = skills.filter(s => s.element === 'ice');
```

This belongs in the game layer. Hook returns pre-filtered list.

### ❌ React Validating

```jsx
// FORBIDDEN: React deciding validity
if (currentMana < skill.manaCost) {
  return <DisabledButton />;
}
```

Game layer provides `isAffordable` prop.

---

## Required Patterns

### ✅ Pre-Resolved Props

```jsx
// REQUIRED: Component receives fully resolved data
function SkillCard({
  id,           // ID for actions
  label,        // Display name
  icon,         // Resolved icon URL
  element,      // { id, name, primaryColor, secondaryColor }
  costs,        // { mana, health, manaPerSecond }
  isAssigned,   // Boolean
  isAffordable, // Boolean
  dragData,     // Pre-packaged drag object
}) {
  // Component just renders, no interpretation
}
```

### ✅ Hook Does Resolution

```jsx
// REQUIRED: Hook calls game layer
export function useClassSkills() {
  const { classId } = useCurrentClass();
  const classInstance = createClassInstance(classId);
  return resolveSkillsForClass(classInstance, context);
}
```

### ✅ Component Registry

```jsx
// REQUIRED: React doesn't decide what to render
const Component = registry.get(entity.type);
return <Component {...entity.resolvedProps} />;
```

---

## File Location Guide

| Concept | Location | Contains |
|---------|----------|----------|
| Class definitions | `/src/data/classes/*.json` | IDs, stats, allowed skills |
| Skill definitions | `/src/data/skills/*.json` | IDs, costs, effects |
| Class instance logic | `/src/game/classInstance.js` | Pure creation/query functions |
| Loadout logic | `/src/game/loadout.js` | Pure assign/validate functions |
| Entity resolution | `/src/game/entities.js` | Pure resolve-for-render functions |
| State storage | `/src/stores/gameStore.js` | Zustand store, thin adapter |
| Hook adapters | `/src/hooks/useClassContent.js` | Thin adapters, call game layer |
| UI rendering | `/src/components/*` | JSX only, no logic |
