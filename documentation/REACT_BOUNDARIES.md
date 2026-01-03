# React Boundaries

## Core Principle

**React is a RENDERER, not an authority.**

If you delete React, the game rules must still exist.
If that's not true → React is doing too much.

---

## What React CAN Do

### ✅ ALLOWED

1. **Render based on IDs and props**
   ```jsx
   // GOOD: Receives pre-resolved props, just renders
   function SkillCard({ id, label, icon, element, costs, isAssigned }) {
     return (
       <div className={isAssigned ? 'assigned' : ''}>
         <img src={icon} alt={label} />
         <span style={{ color: element?.primaryColor }}>{label}</span>
       </div>
     );
   }
   ```

2. **Map config → component**
   ```jsx
   // GOOD: Uses registry to look up component
   const Component = registry.get(entityType);
   return <Component {...resolvedProps} />;
   ```

3. **Handle visuals (UI, shaders, animations)**
   ```jsx
   // GOOD: Visual timing and effects
   useFrame((_, delta) => {
     opacity.current = lerp(opacity.current, targetOpacity, delta * 5);
   });
   ```

4. **Forward input events to logic layer**
   ```jsx
   // GOOD: Forwards intent, doesn't decide validity
   const handleClick = () => dispatch({ type: 'CAST_SKILL', skillId: props.id });
   ```

---

## What React MUST NOT Do

### ❌ FORBIDDEN

1. **Define domain concepts**
   ```jsx
   // BAD: React defining what a "skill" is
   const SKILL_TYPES = { INSTANT: 'instant', CHANNEL: 'channel' };
   
   // BAD: React knowing class identity
   if (classId === 'wizard') { ... }
   ```

2. **Contain game rules**
   ```jsx
   // BAD: React deciding if action is valid
   if (skill.manaCost > currentMana) {
     return <DisabledButton />;
   }
   
   // GOOD: React receives `isAffordable` prop from logic layer
   if (!props.isAffordable) {
     return <DisabledButton />;
   }
   ```

3. **Decide ownership or validity**
   ```jsx
   // BAD: React filtering skills
   const mySkills = allSkills.filter(s => s.classId === classId);
   
   // GOOD: Hook returns already-filtered, resolved list
   const { skills } = useClassContent(); // Pre-resolved
   ```

4. **Perform filtering or business logic**
   ```jsx
   // BAD: Component doing domain filtering
   const iceSkills = skills.filter(s => s.element === 'ice');
   
   // GOOD: Receive filtered list from hook/game layer
   const iceSkills = useFilteredSkills('ice'); // Logic in game layer
   ```

5. **Store authoritative state**
   ```jsx
   // BAD: Component holding canonical data
   const [loadout, setLoadout] = useState(DEFAULT_LOADOUT);
   
   // GOOD: Component reads from central store
   const { slotMap } = useSlotMap();
   ```

---

## Violation Examples

### ❌ VIOLATION: Domain Logic in JSX

```jsx
// BAD: React knows what elements mean
function SpellCard({ skill }) {
  const color = skill.element === 'ice' ? '#40a0ff' 
              : skill.element === 'fire' ? '#ff6040'
              : '#a89878';
  ...
}
```

### ✅ CORRECT: Pre-Resolved Props

```jsx
// GOOD: React receives resolved color
function SpellCard({ label, icon, element }) {
  return (
    <div style={{ color: element?.primaryColor || '#a89878' }}>
      {label}
    </div>
  );
}
```

### ❌ VIOLATION: Import from config/actions

```jsx
// BAD: Component importing domain data
import { getSkills, ELEMENTS } from '@/config/actions';

function SpellBook() {
  const skills = getSkills(); // React fetching raw data
  ...
}
```

### ✅ CORRECT: Use Hook

```jsx
// GOOD: Hook provides resolved data
import { useClassSkills } from '@/hooks/useClassContent';

function SpellBook() {
  const skills = useClassSkills(); // Already resolved for render
  ...
}
```

---

## Architecture Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER (JSON)                        │
│              Pure definitions, no logic                      │
│                                                              │
│   classes.json, skills.json, pixies.json, etc.              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     GAME LAYER (Pure JS)                     │
│         Framework-agnostic, testable without React          │
│                                                              │
│   classInstance.js, loadout.js, validation.js, execution.js │
│   entities.js (resolves data for render)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     STATE LAYER (Zustand)                    │
│         Thin adapter: stores snapshots, forwards intents    │
│                                                              │
│   gameStore.js                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     REACT LAYER (Components)                 │
│         RENDERER ONLY: receives props, outputs JSX          │
│                                                              │
│   Components receive IDs + pre-resolved visual props        │
│   Components NEVER interpret, filter, or decide             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing the Boundary

Ask yourself:

1. **Can I unit test the game logic without React?**
   - If yes → correct separation
   - If no → logic is in React

2. **If I remove React, does the game still have rules?**
   - If yes → correct separation
   - If no → React is defining the game

3. **Does the component know what a "skill" is?**
   - If yes → violation
   - If no → correct (it just renders props)

---

## Migration Checklist

When refactoring a component:

- [ ] Remove imports from `@/config/actions`
- [ ] Remove imports from `@/engine/classes` (unless in hook)
- [ ] Replace `getSkills()` with `useClassSkills()`
- [ ] Replace filtering logic with pre-resolved props
- [ ] Replace `if (skill.type === ...)` with `if (props.isXxx)`
- [ ] Move any `ELEMENTS` usage to game layer
- [ ] Ensure component only spreads received props
