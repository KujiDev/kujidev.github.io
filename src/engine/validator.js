/**
 * =============================================================================
 * DATA VALIDATOR - Schema Validation for Game Data
 * =============================================================================
 * 
 * Validates JSON data against schemas at load time.
 * Catches data errors early and provides helpful error messages.
 * 
 * ARCHITECTURE:
 * =============
 * - Validation runs at data load time
 * - Uses JSON Schema (draft-07) semantics
 * - Returns arrays of validation errors
 * - Does NOT modify data
 * 
 * USAGE:
 * ======
 * import { validateClass, validateSkill, validateAll } from '@/engine/validator';
 * 
 * const errors = validateClass(classData);
 * if (errors.length > 0) {
 *   console.error('Validation failed:', errors);
 * }
 */

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a value is a valid ID (lowercase letters and underscores only).
 */
function isValidId(value) {
  return typeof value === 'string' && /^[a-z_]+$/.test(value);
}

/**
 * Check if a value is a valid hex color.
 */
function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * Check required fields exist.
 */
function checkRequired(data, required, path = '') {
  const errors = [];
  
  for (const field of required) {
    if (!(field in data) || data[field] === undefined) {
      errors.push(`${path}${field} is required`);
    }
  }
  
  return errors;
}

/**
 * Check field types.
 */
function checkType(value, expectedType, path) {
  const errors = [];
  
  if (expectedType === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
    }
  } else if (expectedType === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path} must be an object`);
    }
  } else if (typeof value !== expectedType) {
    errors.push(`${path} must be a ${expectedType}`);
  }
  
  return errors;
}

// =============================================================================
// ENTITY VALIDATORS
// =============================================================================

/**
 * Validate a class definition.
 */
export function validateClass(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'name', 'baseStats', 'allowedSkills', 'defaultLoadout', 'stateAnimations']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Name
  if (data.name && typeof data.name !== 'string') {
    errors.push('name must be a string');
  }
  
  // baseStats
  if (data.baseStats) {
    if (typeof data.baseStats !== 'object') {
      errors.push('baseStats must be an object');
    } else {
      if (typeof data.baseStats.maxHealth !== 'number' || data.baseStats.maxHealth < 1) {
        errors.push('baseStats.maxHealth must be a positive number');
      }
      if (typeof data.baseStats.maxMana !== 'number' || data.baseStats.maxMana < 0) {
        errors.push('baseStats.maxMana must be a non-negative number');
      }
    }
  }
  
  // allowedSkills
  if (data.allowedSkills && !Array.isArray(data.allowedSkills)) {
    errors.push('allowedSkills must be an array');
  }
  
  // defaultLoadout
  if (data.defaultLoadout && typeof data.defaultLoadout !== 'object') {
    errors.push('defaultLoadout must be an object');
  }
  
  // stateAnimations
  if (data.stateAnimations) {
    if (typeof data.stateAnimations !== 'object') {
      errors.push('stateAnimations must be an object');
    } else {
      if (!data.stateAnimations.idle) {
        errors.push('stateAnimations.idle is required');
      }
      if (!data.stateAnimations.moving) {
        errors.push('stateAnimations.moving is required');
      }
    }
  }
  
  // UI color
  if (data.ui?.color && !isValidHexColor(data.ui.color)) {
    errors.push('ui.color must be a valid hex color (#RRGGBB)');
  }
  
  return errors;
}

/**
 * Validate a skill definition.
 */
export function validateSkill(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'label', 'type', 'animation']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Type enum
  const validTypes = ['cast', 'attack', 'channel', 'buff', 'consumable'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }
  
  // Animation
  if (data.animation && typeof data.animation !== 'string') {
    errors.push('animation must be a string');
  }
  
  // Costs
  if (data.costs) {
    if (typeof data.costs !== 'object') {
      errors.push('costs must be an object');
    } else {
      for (const [key, value] of Object.entries(data.costs)) {
        if (typeof value !== 'number' || value < 0) {
          errors.push(`costs.${key} must be a non-negative number`);
        }
      }
    }
  }
  
  // Cast time
  if (data.castTime !== undefined && (typeof data.castTime !== 'number' || data.castTime < 0)) {
    errors.push('castTime must be a non-negative number');
  }
  
  // Cooldown
  if (data.cooldown !== undefined && (typeof data.cooldown !== 'number' || data.cooldown < 0)) {
    errors.push('cooldown must be a non-negative number');
  }
  
  return errors;
}

/**
 * Validate a status effect definition.
 */
export function validateStatus(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'name', 'type', 'effects']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Type enum
  const validTypes = ['buff', 'debuff'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }
  
  // Duration
  if (data.duration !== null && data.duration !== undefined) {
    if (typeof data.duration !== 'number' || data.duration < 0) {
      errors.push('duration must be a non-negative number or null');
    }
  }
  
  // Stacking rules
  if (data.stacking) {
    const validRules = ['refresh', 'stack', 'none', 'extend'];
    if (data.stacking.rule && !validRules.includes(data.stacking.rule)) {
      errors.push(`stacking.rule must be one of: ${validRules.join(', ')}`);
    }
  }
  
  return errors;
}

/**
 * Validate a pixie definition.
 */
export function validatePixie(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'name', 'buff']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Buff
  if (data.buff) {
    if (typeof data.buff !== 'object') {
      errors.push('buff must be an object');
    } else {
      if (!data.buff.type) {
        errors.push('buff.type is required');
      }
      if (typeof data.buff.value !== 'number') {
        errors.push('buff.value must be a number');
      }
    }
  }
  
  // Visual color
  if (data.visual?.color && !isValidHexColor(data.visual.color)) {
    errors.push('visual.color must be a valid hex color (#RRGGBB)');
  }
  
  return errors;
}

/**
 * Validate an achievement definition.
 */
export function validateAchievement(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'name', 'description', 'condition']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Condition
  if (data.condition) {
    if (typeof data.condition !== 'object') {
      errors.push('condition must be an object');
    } else if (!data.condition.type) {
      errors.push('condition.type is required');
    }
  }
  
  // Rarity enum
  const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  if (data.rarity && !validRarities.includes(data.rarity)) {
    errors.push(`rarity must be one of: ${validRarities.join(', ')}`);
  }
  
  return errors;
}

/**
 * Validate a stat definition.
 */
export function validateStat(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'name', 'category']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Category enum
  const validCategories = ['base', 'derived', 'resource', 'combat', 'utility'];
  if (data.category && !validCategories.includes(data.category)) {
    errors.push(`category must be one of: ${validCategories.join(', ')}`);
  }
  
  // Type enum
  const validTypes = ['flat', 'percent', 'multiplier'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }
  
  return errors;
}

/**
 * Validate an animation mapping.
 */
export function validateAnimation(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['modelId', 'clips']));
  
  // modelId format
  if (data.modelId && !isValidId(data.modelId)) {
    errors.push('modelId must be lowercase letters and underscores only');
  }
  
  // Clips
  if (data.clips && typeof data.clips !== 'object') {
    errors.push('clips must be an object');
  }
  
  return errors;
}

/**
 * Validate a graph definition.
 */
export function validateGraph(data) {
  const errors = [];
  
  // Required fields
  errors.push(...checkRequired(data, ['id', 'type', 'nodes', 'edges']));
  
  // ID format
  if (data.id && !isValidId(data.id)) {
    errors.push('id must be lowercase letters and underscores only');
  }
  
  // Nodes
  if (data.nodes) {
    if (!Array.isArray(data.nodes)) {
      errors.push('nodes must be an array');
    } else {
      const nodeIds = new Set();
      
      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];
        
        if (!node.id) {
          errors.push(`nodes[${i}].id is required`);
        } else if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node ID: ${node.id}`);
        } else {
          nodeIds.add(node.id);
        }
        
        if (!node.type) {
          errors.push(`nodes[${i}].type is required`);
        }
      }
    }
  }
  
  // Edges
  if (data.edges) {
    if (!Array.isArray(data.edges)) {
      errors.push('edges must be an array');
    } else {
      for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i];
        
        if (!edge.from) {
          errors.push(`edges[${i}].from is required`);
        }
        if (!edge.to) {
          errors.push(`edges[${i}].to is required`);
        }
      }
    }
  }
  
  return errors;
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

/**
 * Validate all loaded data.
 * Returns a summary of all validation errors.
 */
export function validateAll(registries) {
  const results = {
    valid: true,
    errors: {},
  };
  
  // Validate each registry
  const validators = {
    classes: validateClass,
    skills: validateSkill,
    statuses: validateStatus,
    pixes: validatePixie,
    achievements: validateAchievement,
    stats: validateStat,
    animations: validateAnimation,
    graphs: validateGraph,
  };
  
  for (const [registryName, validator] of Object.entries(validators)) {
    const registry = registries[registryName];
    if (!registry) continue;
    
    const items = registry instanceof Map ? Array.from(registry.values()) : Object.values(registry);
    
    for (const item of items) {
      const errors = validator(item);
      
      if (errors.length > 0) {
        results.valid = false;
        results.errors[`${registryName}/${item.id}`] = errors;
      }
    }
  }
  
  return results;
}
