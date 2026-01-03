# Runtime Flow

This document describes how actions flow through the system at runtime.

## Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───▶│   React     │───▶│   Zustand   │───▶│   Engine    │
│   Input     │    │   Handler   │    │   Action    │    │   Lookup    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
                                   ┌─────────────┐
                                   │   Graph     │
                                   │   Evaluate  │
                                   └─────────────┘
                                            │
                                            ▼
                                   ┌─────────────┐
                                   │   State     │
                                   │   Update    │
                                   └─────────────┘
```

## Skill Execution Flow

### 1. User Input

Player clicks skill button or presses hotkey.

```jsx
// SkillBar/index.jsx
<SlotButton onClick={() => handleSlotClick(slotNumber)}>
```

### 2. React Handler

Handler validates input and calls Zustand action.

```jsx
const handleSlotClick = (slot) => {
  if (!canUseSkill(slot)) return;
  useGameStore.getState().castSkill(slot);
};
```

### 3. Zustand Action

Action reads skill data from engine.

```javascript
// gameStore.js
castSkill: (slot) => {
  const skillId = get().loadout[slot];
  if (!skillId) return;
  
  // Get skill definition from engine
  const skill = getSkillById(skillId);
  if (!skill) {
    console.error(`Unknown skill: ${skillId}`);
    return;
  }
  
  // Check costs
  const { mana, health } = get();
  if (skill.costs?.mana && mana < skill.costs.mana) return;
  if (skill.costs?.health && health < skill.costs.health) return;
  
  // Deduct costs
  set((state) => ({
    mana: state.mana - (skill.costs?.mana || 0),
    health: state.health - (skill.costs?.health || 0),
  }));
  
  // Start cast
  set({ isCasting: true, currentSkill: skillId });
  // ...
}
```

### 4. Engine Lookup

Engine returns frozen skill data.

```javascript
// engine/loader.js
export function getSkillById(id) {
  return REGISTRIES.skills.get(id);
}
```

### 5. Graph Evaluation (if needed)

For damage/scaling calculations.

```javascript
// If skill has a damage formula using graphs
if (skill.effects) {
  for (const effect of skill.effects) {
    if (effect.formula?.graph) {
      const result = evaluateGraph(effect.formula.graph, {
        baseDamage: effect.amount,
        ...get().stats,
      }, context);
      // Use result.damage
    }
  }
}
```

### 6. State Update

Final state changes applied.

```javascript
set((state) => ({
  isCasting: false,
  currentSkill: null,
  cooldowns: {
    ...state.cooldowns,
    [skillId]: skill.cooldown,
  },
}));
```

## Status Effect Application

### 1. Effect Trigger

Skill or event triggers status application.

```javascript
applyStatus: (statusId, targetId) => {
  const status = getStatusById(statusId);
  if (!status) return;
  
  const existing = get().activeStatuses.find(s => s.id === statusId);
  
  // Handle stacking rules
  if (existing) {
    switch (status.stacking.rule) {
      case 'refresh':
        // Reset duration
        set((state) => ({
          activeStatuses: state.activeStatuses.map(s =>
            s.id === statusId ? { ...s, remainingTime: status.duration } : s
          ),
        }));
        return;
        
      case 'stack':
        if (existing.stacks < status.stacking.maxStacks) {
          // Add stack
          set((state) => ({
            activeStatuses: state.activeStatuses.map(s =>
              s.id === statusId ? { ...s, stacks: s.stacks + 1 } : s
            ),
          }));
        }
        return;
        
      case 'none':
        return; // Do nothing
        
      case 'extend':
        // Add duration
        set((state) => ({
          activeStatuses: state.activeStatuses.map(s =>
            s.id === statusId
              ? { ...s, remainingTime: s.remainingTime + status.duration }
              : s
          ),
        }));
        return;
    }
  }
  
  // Apply new status
  set((state) => ({
    activeStatuses: [
      ...state.activeStatuses,
      {
        id: statusId,
        remainingTime: status.duration,
        stacks: 1,
        appliedAt: Date.now(),
      },
    ],
  }));
}
```

### 2. Status Tick

Frame update processes active statuses.

```javascript
tickStatuses: (deltaTime) => {
  const { activeStatuses } = get();
  
  for (const status of activeStatuses) {
    const definition = getStatusById(status.id);
    
    // Check for tick effects
    if (definition.tickRate) {
      status.tickTimer = (status.tickTimer || 0) + deltaTime;
      
      if (status.tickTimer >= definition.tickRate) {
        status.tickTimer = 0;
        // Apply tick effects
        for (const effect of definition.effects) {
          applyEffect(effect, status.stacks);
        }
      }
    }
    
    // Decrease remaining time
    if (status.remainingTime !== null) {
      status.remainingTime -= deltaTime;
    }
  }
  
  // Remove expired statuses
  set((state) => ({
    activeStatuses: state.activeStatuses.filter(
      s => s.remainingTime === null || s.remainingTime > 0
    ),
  }));
}
```

## Animation Flow

### 1. Animation Request

State change triggers animation.

```javascript
// When skill is cast
set({ currentAnimation: skill.animation });
```

### 2. Animation Resolution

Component resolves semantic name to clip.

```jsx
// Wizard.jsx
const getAnimationClip = (semanticName) => {
  const mapping = getAnimationMapping(classId);
  return mapping.clips[semanticName] || semanticName;
};

const clipName = getAnimationClip(currentAnimation);
```

### 3. Three.js Playback

Animation mixer plays clip.

```javascript
const action = mixer.clipAction(clips[clipName]);
action.reset().play();
```

## Achievement Tracking

### 1. Event Emission

Game events are tracked.

```javascript
// When damage is dealt
emitEvent('damage_dealt', { amount: damage, target: targetId });

// When enemy dies
emitEvent('enemy_killed', { enemyType: type });
```

### 2. Achievement Check

Achievements with matching conditions are evaluated.

```javascript
checkAchievements: (event, data) => {
  const achievements = getAllAchievements();
  
  for (const achievement of achievements) {
    if (get().unlockedAchievements.includes(achievement.id)) continue;
    
    if (evaluateCondition(achievement.condition, event, data, get())) {
      // Unlock achievement
      set((state) => ({
        unlockedAchievements: [...state.unlockedAchievements, achievement.id],
      }));
      
      // Show notification
      showAchievementUnlock(achievement);
    }
  }
}
```

### 3. Condition Evaluation

Conditions are evaluated based on type.

```javascript
function evaluateCondition(condition, event, data, state) {
  switch (condition.type) {
    case 'event':
      if (event !== condition.eventName) return false;
      if (condition.count) {
        return (state.eventCounts[event] || 0) >= condition.count;
      }
      return true;
      
    case 'threshold':
      const value = state[condition.stat];
      switch (condition.operator) {
        case 'gte': return value >= condition.value;
        case 'lte': return value <= condition.value;
        case 'eq': return value === condition.value;
      }
      return false;
      
    case 'compound':
      const results = condition.conditions.map(c =>
        evaluateCondition(c, event, data, state)
      );
      return condition.operator === 'and'
        ? results.every(Boolean)
        : results.some(Boolean);
  }
}
```

## Stat Calculation Flow

### 1. Base Stats

Loaded from class definition.

```javascript
const classData = getClassById(playerClass);
let stats = { ...classData.baseStats };
```

### 2. Equipment Modifiers

(Future) Equipment adds modifiers.

```javascript
for (const item of equipment) {
  for (const mod of item.modifiers) {
    applyModifier(stats, mod);
  }
}
```

### 3. Passive Effects

Pixie buffs applied.

```javascript
const pixie = getPixieById(activePixie);
if (pixie?.buff) {
  applyModifier(stats, pixie.buff);
}
```

### 4. Status Effects

Active buffs/debuffs applied.

```javascript
for (const status of activeStatuses) {
  const definition = getStatusById(status.id);
  for (const effect of definition.effects) {
    if (effect.type === 'stat_modifier') {
      applyModifier(stats, effect, status.stacks);
    }
  }
}
```

### 5. Derived Stats

Calculated from base stats.

```javascript
const statDefinitions = getAllStats();

for (const stat of statDefinitions) {
  if (stat.formula && stat.dependencies) {
    stats[stat.id] = evaluateFormula(stat.formula, stats);
  }
}
```

### 6. Clamping

Values constrained to valid ranges.

```javascript
for (const stat of statDefinitions) {
  if (stat.min !== undefined) {
    stats[stat.id] = Math.max(stats[stat.id], stat.min);
  }
  if (stat.max !== undefined) {
    stats[stat.id] = Math.min(stats[stat.id], stat.max);
  }
}
```

## Cooldown Management

### 1. Cooldown Start

When skill is used.

```javascript
set((state) => ({
  cooldowns: {
    ...state.cooldowns,
    [skillId]: skill.cooldown,
  },
}));
```

### 2. Cooldown Tick

Frame update decreases cooldowns.

```javascript
tickCooldowns: (deltaTime) => {
  set((state) => {
    const newCooldowns = {};
    
    for (const [skillId, remaining] of Object.entries(state.cooldowns)) {
      const newRemaining = remaining - deltaTime;
      if (newRemaining > 0) {
        newCooldowns[skillId] = newRemaining;
      }
    }
    
    return { cooldowns: newCooldowns };
  });
}
```

### 3. Cooldown Check

Before skill use.

```javascript
const isOnCooldown = (skillId) => {
  return (get().cooldowns[skillId] || 0) > 0;
};
```
