# Graph System

The graph system provides a node-based computation engine for damage scaling, stat calculations, conditional logic, and more. Graphs are defined in JSON and evaluated at runtime.

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      GRAPH DEFINITION                         │
│                     (JSON in /data/graphs/)                   │
│                                                              │
│   ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐               │
│   │input│────▶│ math│────▶│clamp│────▶│output│              │
│   └─────┘     └─────┘     └─────┘     └─────┘               │
│                  ▲                                           │
│   ┌─────┐        │                                          │
│   │const│────────┘                                          │
│   └─────┘                                                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    evaluateGraph()
                            │
                            ▼
                      { result: 42 }
```

## Graph Structure

Every graph has:

- **id** – Unique identifier
- **type** – Purpose category (`scaling`, `modifier`, `conditional`, `event`)
- **inputs** – Expected input parameters
- **nodes** – Array of computation nodes
- **edges** – Connections between nodes

```json
{
  "id": "my_graph",
  "type": "scaling",
  "inputs": {
    "baseDamage": { "type": "number" },
    "level": { "type": "number" }
  },
  "nodes": [...],
  "edges": [...]
}
```

## Node Types

### Input/Output Nodes

#### `input`
Reads a value from the graph inputs.

```json
{
  "id": "base",
  "type": "input",
  "inputName": "baseDamage"
}
```

#### `output`
Marks the final output of the graph.

```json
{
  "id": "out",
  "type": "output",
  "outputName": "damage"
}
```

#### `constant`
Provides a fixed value.

```json
{
  "id": "scale",
  "type": "constant",
  "value": 1.5
}
```

### Stat Nodes

#### `stat_read`
Reads a stat from the game context.

```json
{
  "id": "get_int",
  "type": "stat_read",
  "stat": "intelligence"
}
```

#### `stat_write`
Modifies a stat (used in modifier graphs).

```json
{
  "id": "set_dmg",
  "type": "stat_write",
  "stat": "damage",
  "value": "final_value_node"
}
```

### Math Nodes

#### `math`
Performs mathematical operations.

```json
{
  "id": "calc",
  "type": "math",
  "op": "add",          // add, subtract, multiply, divide, pow, sqrt, abs, min, max
  "inputs": ["a", "b"]  // Node IDs to use as operands
}
```

**Operations:**
| Op | Description | Inputs |
|---|---|---|
| `add` | a + b | 2 |
| `subtract` | a - b | 2 |
| `multiply` | a * b | 2 |
| `divide` | a / b | 2 |
| `pow` | a ^ b | 2 |
| `sqrt` | √a | 1 |
| `abs` | \|a\| | 1 |
| `min` | min(a, b, ...) | 2+ |
| `max` | max(a, b, ...) | 2+ |

#### `clamp`
Constrains a value to a range.

```json
{
  "id": "clamp_result",
  "type": "clamp",
  "input": "value_node",
  "min": 0,
  "max": 100
}
```

#### `lerp`
Linear interpolation.

```json
{
  "id": "lerp_result",
  "type": "lerp",
  "a": "start_node",
  "b": "end_node",
  "t": "factor_node"
}
```

#### `random`
Generates a random value.

```json
{
  "id": "rand",
  "type": "random",
  "min": 0.9,
  "max": 1.1
}
```

### Logic Nodes

#### `condition`
Evaluates a boolean condition.

```json
{
  "id": "is_crit",
  "type": "condition",
  "op": "greater",      // equals, not_equals, greater, less, gte, lte, and, or, not
  "left": "roll_node",
  "right": "crit_chance_node"
}
```

**Operators:**
| Op | Description |
|---|---|
| `equals` | a === b |
| `not_equals` | a !== b |
| `greater` | a > b |
| `less` | a < b |
| `gte` | a >= b |
| `lte` | a <= b |
| `and` | a && b |
| `or` | a \|\| b |
| `not` | !a |

#### `branch`
Conditional branching (if/else).

```json
{
  "id": "result",
  "type": "branch",
  "condition": "is_crit_node",
  "true": "crit_damage_node",
  "false": "normal_damage_node"
}
```

### Effect Nodes

#### `effect`
Triggers a game effect.

```json
{
  "id": "apply_burn",
  "type": "effect",
  "effectType": "apply_status",
  "status": "burning",
  "duration": 5
}
```

#### `event_listener`
Reacts to game events.

```json
{
  "id": "on_hit",
  "type": "event_listener",
  "event": "on_damage_dealt"
}
```

#### `modifier`
Applies a modifier to a value.

```json
{
  "id": "bonus",
  "type": "modifier",
  "modType": "percent",   // flat, percent, multiplier
  "value": 0.25
}
```

## Edges

Edges define data flow between nodes.

```json
{
  "from": "source_node_id",
  "to": "target_node_id",
  "slot": "input_slot_name"  // Optional, for nodes with multiple inputs
}
```

## Evaluation

Graphs are evaluated using topological sort:

1. Collect all nodes with no dependencies
2. Evaluate them in order
3. Pass values to dependent nodes
4. Repeat until output node is reached

```javascript
import { evaluateGraph } from '@/engine/graph';

const result = evaluateGraph('spell_damage_scaling', {
  baseDamage: 100,
  intelligence: 50
}, gameContext);

console.log(result); // { damage: 200 }
```

## Context Object

The context object provides access to game state:

```javascript
const context = {
  stats: {
    intelligence: 50,
    strength: 20,
    // ...
  },
  player: {
    level: 10,
    class: 'wizard'
  },
  target: {
    // Target entity data
  }
};
```

## Example: Critical Hit Damage

```json
{
  "id": "critical_damage",
  "type": "conditional",
  "inputs": {
    "baseDamage": { "type": "number" },
    "critChance": { "type": "number" },
    "critMultiplier": { "type": "number" }
  },
  "nodes": [
    { "id": "base", "type": "input", "inputName": "baseDamage" },
    { "id": "chance", "type": "input", "inputName": "critChance" },
    { "id": "mult", "type": "input", "inputName": "critMultiplier" },
    
    { "id": "roll", "type": "random", "min": 0, "max": 100 },
    { "id": "is_crit", "type": "condition", "op": "less", "left": "roll", "right": "chance" },
    
    { "id": "crit_dmg", "type": "math", "op": "multiply", "inputs": ["base", "mult"] },
    
    { "id": "final", "type": "branch", "condition": "is_crit", "true": "crit_dmg", "false": "base" },
    
    { "id": "out", "type": "output", "outputName": "damage" }
  ],
  "edges": [
    { "from": "base", "to": "crit_dmg" },
    { "from": "mult", "to": "crit_dmg" },
    { "from": "roll", "to": "is_crit" },
    { "from": "chance", "to": "is_crit" },
    { "from": "is_crit", "to": "final" },
    { "from": "crit_dmg", "to": "final" },
    { "from": "base", "to": "final" },
    { "from": "final", "to": "out" }
  ]
}
```

## Validation

Graphs are validated at load time:

```javascript
import { validateGraph } from '@/engine/graph';

const errors = validateGraph(graphData);
if (errors.length > 0) {
  console.error('Graph validation failed:', errors);
}
```

Validation checks:
- All required fields present
- Node IDs are unique
- Edge references exist
- No circular dependencies
- Input/output types match

## Best Practices

1. **Use descriptive node IDs** – `spell_int_bonus` not `n1`
2. **Document complex graphs** – Add `description` field
3. **Keep graphs focused** – One calculation per graph
4. **Reuse via composition** – Reference other graphs as inputs
5. **Test with edge cases** – Zero values, negative numbers, max values
