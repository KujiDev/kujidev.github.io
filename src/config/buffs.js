/**
 * =============================================================================
 * BUFF SYSTEM
 * =============================================================================
 * 
 * Defines buff types, stacking rules, and effect calculations.
 * Buffs are applied by actions (skills, consumables, pixies).
 */

// =============================================================================
// BUFF EFFECT TYPES
// =============================================================================

/**
 * All possible buff effect types.
 * Used as keys in buff definitions and for calculating totals.
 */
export const BUFF_EFFECTS = {
  MANA_REGEN: 'manaRegen',       // Flat mana/sec bonus
  HEALTH_REGEN: 'healthRegen',   // Flat health/sec bonus
  MAX_MANA: 'maxMana',           // Flat max mana bonus
  MAX_HEALTH: 'maxHealth',       // Flat max health bonus
};

// =============================================================================
// BUFF STACKING RULES
// =============================================================================

/**
 * How buffs with the same ID stack:
 * - REFRESH: New buff replaces old, refreshing duration (default)
 * - STACK: Multiple instances stack (not implemented yet)
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
 * 
 * @param {object} buffDef - Buff definition from action config
 * @returns {object} Runtime buff with expiration
 */
export const createBuffInstance = (buffDef) => {
  if (!buffDef) return null;
  
  const now = Date.now();
  return {
    id: buffDef.id,
    name: buffDef.name,
    icon: buffDef.icon,
    duration: buffDef.duration,
    expiresAt: now + (buffDef.duration * 1000),
    // Copy all effect values
    manaRegen: buffDef.manaRegenBonus || 0,
    healthRegen: buffDef.healthRegenBonus || 0,
    maxMana: buffDef.maxMana || 0,
    maxHealth: buffDef.maxHealth || 0,
    // Stacking rule (default: refresh)
    stackRule: buffDef.stackRule || STACK_RULES.REFRESH,
  };
};

// =============================================================================
// BUFF CALCULATIONS
// =============================================================================

/**
 * Calculate total buff effects from an array of active buffs.
 * Filters out expired buffs automatically.
 * 
 * @param {Array} buffs - Array of runtime buff instances
 * @returns {object} Totals for each effect type
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
 * 
 * @param {Array} currentBuffs - Current buff array
 * @param {object} newBuff - New buff instance to apply
 * @returns {Array} Updated buff array
 */
export const applyBuffToArray = (currentBuffs, newBuff) => {
  if (!newBuff) return currentBuffs;
  
  const existingIndex = currentBuffs.findIndex(b => b.id === newBuff.id);
  
  if (existingIndex === -1) {
    // New buff, just add it
    return [...currentBuffs, newBuff];
  }
  
  const existing = currentBuffs[existingIndex];
  
  switch (newBuff.stackRule) {
    case STACK_RULES.NONE:
      // Don't apply if already active
      return currentBuffs;
      
    case STACK_RULES.STACK:
      // Add as separate instance (future: implement stack limit)
      return [...currentBuffs, newBuff];
      
    case STACK_RULES.REFRESH:
    default:
      // Replace existing with new (refreshes duration)
      const updated = [...currentBuffs];
      updated[existingIndex] = newBuff;
      return updated;
  }
};

/**
 * Remove expired buffs from array.
 * 
 * @param {Array} buffs - Current buff array
 * @returns {Array} Filtered array with only active buffs
 */
export const removeExpiredBuffs = (buffs) => {
  const now = Date.now();
  return buffs.filter(b => b.expiresAt > now);
};
