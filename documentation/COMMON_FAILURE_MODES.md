# Common Failure Modes

This document describes common errors and how to fix them.

---

## Data Loading Errors

### "Unknown skill: xxx"

**Symptom:** Console error when trying to use a skill.

**Cause:** Skill ID doesn't exist in registry.

**Fix:**
1. Check spelling of skill ID
2. Ensure skill is defined in `/data/skills/skills.json`
3. Verify loader imports the skills file

```javascript
// Check if skill exists
import { getSkillById } from '@/engine/loader';
console.log(getSkillById('ice_shard')); // Should not be undefined
```

---

### "Cannot read properties of undefined (reading 'costs')"

**Symptom:** Error when casting skill.

**Cause:** Skill lookup returned undefined.

**Fix:**
1. Verify skill ID matches exactly (case-sensitive)
2. Check that `loadAll()` was called at startup
3. Look for typos in class's `allowedSkills` array

---

### "Icon failed to load: xxx.png"

**Symptom:** Missing skill icon, broken image.

**Cause:** Icon not in ICON_MAP or asset not found.

**Fix:**
1. Add icon to `/src/assets/icons/`
2. Add entry to ICON_MAP in `loader.js`:

```javascript
const ICON_MAP = {
  'myIcon.png': () => import('@/assets/icons/myIcon.png'),
};
```

---

## Graph Evaluation Errors

### "Unknown graph: xxx"

**Symptom:** Graph evaluation fails.

**Cause:** Graph ID not found in registry.

**Fix:**
1. Check graph ID spelling
2. Ensure graph is defined in `/data/graphs/graphs.json`
3. Verify graph has valid structure

---

### "Node xxx has no value"

**Symptom:** Graph evaluation returns NaN or undefined.

**Cause:** Node dependency not evaluated or missing input.

**Fix:**
1. Check edge connections - is the node connected?
2. Verify input values are provided:

```javascript
// All required inputs must be passed
evaluateGraph('my_graph', {
  baseDamage: 100,  // Don't forget any inputs!
  level: 10,
});
```

---

### "Circular dependency detected in graph"

**Symptom:** Graph validation fails.

**Cause:** Node A depends on Node B which depends on Node A.

**Fix:**
1. Review graph edges
2. Break the cycle by reordering nodes
3. Use a separate graph for independent calculation

---

### "Unknown node type: xxx"

**Symptom:** Graph evaluation fails on specific node.

**Cause:** Node type not implemented in evaluator.

**Fix:**
1. Check for typos in node type
2. Valid types: `input`, `output`, `constant`, `math`, `condition`, `branch`, `stat_read`, `stat_write`, `effect`, `modifier`, `random`, `clamp`, `lerp`, `event_listener`

---

## Schema Validation Errors

### "id must be lowercase letters and underscores only"

**Symptom:** Validation warning at load time.

**Cause:** ID contains invalid characters.

**Fix:**
```json
// ❌ Wrong
{ "id": "Ice-Shard" }
{ "id": "iceShard" }
{ "id": "ice shard" }

// ✅ Correct
{ "id": "ice_shard" }
```

---

### "xxx is required"

**Symptom:** Validation error listing missing field.

**Cause:** Required field not present in JSON.

**Fix:** Add the missing field. Check schema for required fields:

```json
// Skill requires: id, label, type, animation
{
  "id": "my_skill",
  "label": "My Skill",
  "type": "cast",
  "animation": "attacking"
}
```

---

### "type must be one of: xxx"

**Symptom:** Validation error for enum field.

**Cause:** Invalid enum value.

**Fix:**
```json
// ❌ Wrong
{ "type": "Cast" }
{ "type": "spell" }

// ✅ Correct - must be exact enum value
{ "type": "cast" }
```

---

## Animation Errors

### "Animation clip not found: xxx"

**Symptom:** Character T-poses or animation doesn't play.

**Cause:** Animation clip name doesn't match model's clips.

**Fix:**
1. Check model's available animations:
```javascript
// In browser console with model loaded
console.log(mixer._actions.map(a => a._clip.name));
```
2. Update animation mapping in `/data/animations/animations.json`

---

### "Cannot read properties of undefined (reading 'clips')"

**Symptom:** Error when getting animation.

**Cause:** Model has no animation mapping.

**Fix:** Add mapping for the model:
```json
{
  "modelId": "my_model",
  "clips": {
    "idle": "Idle_Anim",
    "run": "Run_Anim"
  }
}
```

---

## State Management Errors

### "Maximum update depth exceeded"

**Symptom:** React error, browser freezes.

**Cause:** Infinite state update loop.

**Fix:**
1. Check for state updates in render phase
2. Ensure useEffect has proper dependencies
3. Don't call state setters unconditionally

---

### "State updates on unmounted component"

**Symptom:** Console warning after navigating.

**Cause:** Async operation updates state after unmount.

**Fix:**
```javascript
useEffect(() => {
  let cancelled = false;
  
  loadData().then(data => {
    if (!cancelled) {
      setState(data);
    }
  });
  
  return () => { cancelled = true; };
}, []);
```

---

## Build Errors

### "Failed to resolve import '@/data/xxx'"

**Symptom:** Vite build fails.

**Cause:** File path doesn't exist.

**Fix:**
1. Check file exists at specified path
2. Verify jsconfig.json has correct path aliases
3. Check for typos in import statement

---

### "JSON parse error"

**Symptom:** Build fails with JSON syntax error.

**Cause:** Invalid JSON syntax.

**Fix:**
1. Use JSON validator (VS Code shows errors)
2. Common issues:
   - Trailing commas
   - Unquoted keys
   - Single quotes instead of double
   - Missing commas between items

```json
// ❌ Wrong
{
  id: "test",       // Unquoted key
  'name': "Test",   // Single quotes
  "value": 10,      // Trailing comma
}

// ✅ Correct
{
  "id": "test",
  "name": "Test",
  "value": 10
}
```

---

## Runtime Performance Issues

### Slow graph evaluation

**Symptom:** Frame drops when using skills.

**Cause:** Complex graphs being evaluated every frame.

**Fix:**
1. Cache graph results when inputs haven't changed
2. Simplify graph structure
3. Pre-calculate static values

---

### Large registry memory usage

**Symptom:** High memory consumption.

**Cause:** Keeping resolved data that could be lazy-loaded.

**Fix:**
1. Lazy-load rarely-used data
2. Don't duplicate data between registries
3. Clear unused data on scene change

---

## Debugging Tips

### Log all loaded data

```javascript
import { getAllSkills, getAllClasses } from '@/engine/loader';

console.log('Skills:', getAllSkills());
console.log('Classes:', getAllClasses());
```

### Validate specific entity

```javascript
import { validateSkill } from '@/engine/validator';

const skill = { id: 'test', label: 'Test' };
console.log(validateSkill(skill));
// ['type is required', 'animation is required']
```

### Test graph evaluation

```javascript
import { evaluateGraph } from '@/engine/graph';

const result = evaluateGraph('spell_damage_scaling', {
  baseDamage: 100,
  intelligence: 50,
}, {});

console.log('Graph result:', result);
```

### Check registry contents

```javascript
import { getRegistries } from '@/engine/loader';

const registries = getRegistries();
console.log('Registry sizes:');
for (const [name, registry] of Object.entries(registries)) {
  console.log(`  ${name}: ${registry.size} entries`);
}
```
