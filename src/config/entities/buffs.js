/**
 * =============================================================================
 * BUFF SYSTEM - CANONICAL SOURCE
 * =============================================================================
 * 
 * Defines buff types, stacking rules, and effect calculations.
 * Buffs are applied by actions (skills, consumables, pixies).
 * 
 * This is the SINGLE SOURCE OF TRUTH for all buff data and logic.
 * Do not define buff-related logic elsewhere.
 */

// =============================================================================
// BUFF EFFECT TYPES
// =============================================================================

/**
 * All possible buff effect types.
 * Used as keys in buff definitions and for calculating totals.
 */
export const BUFF_EFFECTS = {
  MANA_REGEN: 'manaRegen',
  HEALTH_REGEN: 'healthRegen',
  MAX_MANA: 'maxMana',
  MAX_HEALTH: 'maxHealth',
};

// =============================================================================
// BUFF STACKING RULES
// =============================================================================

/**
 * How buffs with the same ID stack:
 * - REFRESH: New buff replaces old, refreshing duration (default)
 * - STACK: Multiple instances stack
 * - NONE: Second buff is ignored if first is active
 */
export const STACK_RULES = {
  REFRESH: 'refresh',
  STACK: 'stack',
  NONE: 'none',
};

// =============================================================================
// BUFF CREATION
// =============================================================================

/**
 * Create a runtime buff instance from a buff definition.
 * This is called when an action applies a buff.
 */
export const createBuffInstance = (buffDef) => {
  if (!buffDef) {
    console.error('[Buff] Attempted to create buff from null definition');
    return null;
  }
  
  const now = Date.now();
  return {
    id: buffDef.id,
    name: buffDef.name,
    icon: buffDef.icon,
    duration: buffDef.duration,
    expiresAt: now + (buffDef.duration * 1000),
    manaRegen: buffDef.manaRegenBonus || 0,
    healthRegen: buffDef.healthRegenBonus || 0,
    maxMana: buffDef.maxMana || 0,
    maxHealth: buffDef.maxHealth || 0,
    stackRule: buffDef.stackRule || STACK_RULES.REFRESH,
  };
};

// =============================================================================
// BUFF CALCULATIONS
// =============================================================================

/**
 * Calculate total buff effects from an array of active buffs.
 * Filters out expired buffs automatically.
 */
export const calculateBuffTotals = (buffs) => {
  const now = Date.now();
  const totals = {
    manaRegen: 0,
    healthRegen: 0,
    maxMana: 0,
    maxHealth: 0,
  };
  
  for (let i = 0; i < buffs.length; i++) {
    const buff = buffs[i];
    if (buff.expiresAt > now) {
      totals.manaRegen += buff.manaRegen || 0;
      totals.healthRegen += buff.healthRegen || 0;
      totals.maxMana += buff.maxMana || 0;
      totals.maxHealth += buff.maxHealth || 0;
    }
  }
  
  return totals;
};

/**
 * Apply a new buff to the buff array, respecting stacking rules.
 */
export const applyBuffToArray = (currentBuffs, newBuff) => {
  if (!newBuff) return currentBuffs;
  
  const existingIndex = currentBuffs.findIndex(b => b.id === newBuff.id);
  
  if (existingIndex === -1) {
    return [...currentBuffs, newBuff];
  }
  
  switch (newBuff.stackRule) {
    case STACK_RULES.NONE:
      return currentBuffs;
      
    case STACK_RULES.STACK:
      return [...currentBuffs, newBuff];
      
    case STACK_RULES.REFRESH:
    default:
      const updated = [...currentBuffs];
      updated[existingIndex] = newBuff;
      return updated;
  }
};

/**
 * Remove expired buffs from array.
 */
export const removeExpiredBuffs = (buffs) => {
  const now = Date.now();
  return buffs.filter(b => b.expiresAt > now);
};
