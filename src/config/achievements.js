/**
 * =============================================================================
 * ACHIEVEMENTS SYSTEM
 * =============================================================================
 * 
 * Defines all achievements and their unlock conditions.
 */

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

export const ACHIEVEMENTS = {
  first_cast: {
    id: 'first_cast',
    name: 'Apprentice Mage',
    description: 'Cast your first spell',
    icon: '✨',
    rarity: 'common',
  },
  potion_master: {
    id: 'potion_master',
    name: 'Potion Master',
    description: 'Use a health potion to restore your vitality',
    icon: '🧪',
    rarity: 'common',
  },
  first_pixie: {
    id: 'first_pixie',
    name: 'Fairy Friend',
    description: 'Equip your first pixie companion',
    icon: '🧚',
    rarity: 'uncommon',
  },
  pixie_trio: {
    id: 'pixie_trio',
    name: 'Pixie Parade',
    description: 'Equip three pixies at once',
    icon: '✨',
    rarity: 'rare',
  },
};

// =============================================================================
// RARITY COLORS
// =============================================================================

export const RARITY_COLORS = {
  common: { primary: '#9d9d9d', glow: 'rgba(157, 157, 157, 0.5)' },
  uncommon: { primary: '#1eff00', glow: 'rgba(30, 255, 0, 0.5)' },
  rare: { primary: '#0070dd', glow: 'rgba(0, 112, 221, 0.5)' },
  epic: { primary: '#a335ee', glow: 'rgba(163, 53, 238, 0.5)' },
  legendary: { primary: '#ff8000', glow: 'rgba(255, 128, 0, 0.6)' },
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get achievement by ID
 */
export const getAchievementById = (id) => ACHIEVEMENTS[id] || null;

/**
 * Get all achievements as array
 */
export const getAllAchievementDefs = () => Object.values(ACHIEVEMENTS);
