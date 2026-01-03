/**
 * =============================================================================
 * PIXIE SYSTEM - CANONICAL SOURCE
 * =============================================================================
 * 
 * Pixies are passive companions that provide stat buffs when equipped.
 * 
 * This is the SINGLE SOURCE OF TRUTH for all pixie data.
 * Do not define pixie data elsewhere.
 */

import pixieVerdantIcon from '@/assets/icons/pixie-verdant.svg';
import pixieAzureIcon from '@/assets/icons/pixie-azure.svg';
import pixieVioletIcon from '@/assets/icons/pixie-violet.svg';
import pixieCrimsonIcon from '@/assets/icons/pixie-crimson.svg';

// =============================================================================
// PIXIE DEFINITIONS
// =============================================================================

export const PIXIES = {
  verdant: {
    id: 'verdant',
    name: 'Verdant Sprite',
    description: 'A gentle forest spirit that mends wounds over time.',
    element: 'nature',
    color: '#40ff80',
    glowColor: '#20ff60',
    icon: pixieVerdantIcon,
    dragType: 'pixie',
    buff: {
      type: 'healthRegen',
      value: 3,
    },
  },
  azure: {
    id: 'azure',
    name: 'Azure Wisp',
    description: 'A mystical wisp that restores magical energy.',
    element: 'mana',
    color: '#40a0ff',
    glowColor: '#2080ff',
    icon: pixieAzureIcon,
    dragType: 'pixie',
    buff: {
      type: 'manaRegen',
      value: 4,
    },
  },
  violet: {
    id: 'violet',
    name: 'Violet Shimmer',
    description: 'An arcane spirit that expands your mana pool.',
    element: 'arcane',
    color: '#a040ff',
    glowColor: '#8020ff',
    icon: pixieVioletIcon,
    dragType: 'pixie',
    buff: {
      type: 'maxMana',
      value: 25,
    },
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Ember',
    description: 'A fiery sprite that bolsters your vitality.',
    element: 'fire',
    color: '#ff6040',
    glowColor: '#ff4020',
    icon: pixieCrimsonIcon,
    dragType: 'pixie',
    buff: {
      type: 'maxHealth',
      value: 25,
    },
  },
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_EQUIPPED_PIXIES = 3;
export const DEFAULT_COLLECTED_PIXIES = ['verdant', 'azure', 'violet', 'crimson'];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Get pixie by ID
 */
export const getPixieById = (pixieId) => {
  const pixie = PIXIES[pixieId];
  if (!pixie) {
    console.error(`[Pixie] Unknown pixie ID: ${pixieId}`);
    return null;
  }
  return pixie;
};

/**
 * Get all pixies as array
 */
export const getAllPixies = () => Object.values(PIXIES);

/**
 * Get pixie IDs
 */
export const getPixieIds = () => Object.keys(PIXIES);

// =============================================================================
// RUNTIME HELPERS
// =============================================================================

/**
 * Calculate total buffs from equipped pixies
 */
export const calculatePixieBuffs = (equippedIds) => {
  const buffs = {
    healthRegen: 0,
    manaRegen: 0,
    maxHealth: 0,
    maxMana: 0,
  };
  
  for (const pixieId of equippedIds) {
    const pixie = PIXIES[pixieId];
    if (pixie?.buff) {
      buffs[pixie.buff.type] += pixie.buff.value;
    }
  }
  
  return buffs;
};

/**
 * Check if a pixie can be equipped (collection check)
 */
export const canEquipPixie = (pixieId, collectedIds) => {
  return PIXIES[pixieId] && collectedIds.includes(pixieId);
};
