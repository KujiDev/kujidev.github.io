/**
 * =============================================================================
 * ACTIONS BRIDGE - JSON Data to Legacy Format
 * =============================================================================
 * 
 * This module bridges the new JSON-based data to the legacy action format
 * expected by the game code. It provides the same API as the old actions.js
 * but reads from the engine's loaded data.
 * 
 * This allows us to:
 * - Use JSON as the single source of truth
 * - Keep existing game code working without changes
 * - Gradually migrate to cleaner patterns
 */

import { getSkillById, getAllSkills, getStatusById } from './loader';
import { ELEMENTS } from '@/config/elements';
import { FSM_ACTIONS } from '@/config/stats';

// Icon imports (resolved at load time, mapped by filename)
import iceShardIcon from '@/assets/icons/ice-shard.svg';
import meteorIcon from '@/assets/icons/meteor.svg';
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';
import manaBodyIcon from '@/assets/icons/mana-body.svg';
import arcaneBoltIcon from '@/assets/icons/arcane-bolt.svg';
import arcaneBlastIcon from '@/assets/icons/arcane-blast.svg';
import healthPotionIcon from '@/assets/icons/health-potion.svg';
import foodIcon from '@/assets/icons/food.svg';

// =============================================================================
// ICON RESOLUTION
// =============================================================================

const ICON_MAP = {
  'ice-shard.svg': iceShardIcon,
  'meteor.svg': meteorIcon,
  'arcane-rush.svg': arcaneRushIcon,
  'mana-body.svg': manaBodyIcon,
  'arcane-bolt.svg': arcaneBoltIcon,
  'arcane-blast.svg': arcaneBlastIcon,
  'health-potion.svg': healthPotionIcon,
  'food.svg': foodIcon,
};

/**
 * Resolve icon - handles both string paths and already-resolved icons.
 * The loader may have already resolved the icon, in which case we return as-is.
 * 
 * NOTE: In Vite, imported SVGs become either:
 * - URL strings like "/src/assets/icons/foo.svg" (larger files)
 * - Data URIs like "data:image/svg+xml,..." (small inlined files)
 */
const resolveIcon = (iconPath) => {
  if (!iconPath) return null;
  // If it's already a resolved asset (URL path or data URI), return as-is
  if (typeof iconPath === 'string' && (
    iconPath.startsWith('/') || 
    iconPath.startsWith('data:') ||
    iconPath.includes('/assets/')
  )) {
    return iconPath;
  }
  // If it's not a string at all (e.g., an object), return as-is
  if (typeof iconPath !== 'string') return iconPath;
  // Otherwise, try to resolve from the map
  return ICON_MAP[iconPath] || null;
};

// =============================================================================
// TYPE MAPPING
// =============================================================================

/**
 * Map JSON skill types to FSM actions.
 */
const TYPE_TO_FSM = {
  'attack': FSM_ACTIONS.ATTACK,
  'cast': FSM_ACTIONS.CAST,
  'channel': FSM_ACTIONS.MOVE,
  'buff': FSM_ACTIONS.CAST,
  'consumable': FSM_ACTIONS.INSTANT,
};

/**
 * Map JSON skill types to legacy action types.
 */
export const ACTION_TYPES = {
  CAST: 'Cast',
  ATTACK: 'Attack',
  CHANNEL: 'Channel',
  BUFF: 'Buff',
  CONSUMABLE: 'Consumable',
};

const TYPE_TO_LEGACY = {
  'attack': ACTION_TYPES.ATTACK,
  'cast': ACTION_TYPES.CAST,
  'channel': ACTION_TYPES.CHANNEL,
  'buff': ACTION_TYPES.BUFF,
  'consumable': ACTION_TYPES.CONSUMABLE,
};

// =============================================================================
// SKILL ID MAPPING (JSON id -> legacy action id)
// =============================================================================

/**
 * Map JSON skill IDs to the legacy action IDs expected by the game.
 * The game uses slot-based IDs like "skill_1" while JSON uses semantic IDs.
 */
const SKILL_TO_ACTION_ID = {
  'ice_shard': 'skill_1',
  'meteor': 'skill_2',
  'arcane_rush': 'skill_3',
  'mana_body': 'skill_4',
  'arcane_bolt': 'primary_attack',
  'arcane_blast': 'secondary_attack',
  'health_potion': 'potion',
  'mana_biscuit': 'food',
};

const ACTION_TO_SKILL_ID = Object.fromEntries(
  Object.entries(SKILL_TO_ACTION_ID).map(([k, v]) => [v, k])
);

// =============================================================================
// ACTION TRANSFORMATION
// =============================================================================

/**
 * Transform a JSON skill into the legacy action format.
 */
function transformSkillToAction(skill) {
  if (!skill) return null;
  
  const actionId = SKILL_TO_ACTION_ID[skill.id] || skill.id;
  
  // Read icon from the skill object (already resolved by loader)
  const icon = resolveIcon(skill.ui?.icon);
  
  // ASSERTION: Icon should be resolved for all skills with icons defined
  if (import.meta.env.DEV && skill.ui?.icon !== undefined && !icon) {
    console.error(`[ACTIONS ASSERTION FAILED] Skill "${skill.id}" has ui.icon but resolution failed!`, {
      originalIcon: skill.ui.icon,
      resolvedIcon: icon,
    });
  }
  
  // Build buff object if skill applies a buff
  let buff = null;
  if (skill.effects?.buff) {
    const buffDef = getStatusById(skill.effects.buff.id);
    buff = {
      id: skill.effects.buff.id,
      name: buffDef?.name || skill.effects.buff.id,
      icon: resolveIcon(buffDef?.visual?.icon) || icon,
      duration: skill.effects.buff.duration || buffDef?.duration || 0,
      manaRegenBonus: buffDef?.effects?.manaRegen || 0,
      healthRegenBonus: buffDef?.effects?.healthRegen || 0,
    };
  }
  
  return {
    id: actionId,
    label: skill.label,
    description: skill.description,
    type: TYPE_TO_LEGACY[skill.type] || ACTION_TYPES.ATTACK,
    element: skill.element,
    fsmAction: TYPE_TO_FSM[skill.type] || FSM_ACTIONS.ATTACK,
    icon,
    
    // Costs - flatten from nested structure
    manaCost: skill.costs?.mana || 0,
    healthCost: skill.costs?.health || 0,
    manaPerSecond: skill.costs?.manaPerSecond || 0,
    
    // Effects
    manaGain: skill.effects?.manaGain || 0,
    buff,
    
    // UI
    defaultKey: skill.ui?.defaultKey || null,
    displayKey: formatDisplayKey(skill.ui?.defaultKey),
    
    // Original JSON ID for reference
    _skillId: skill.id,
  };
}

/**
 * Format a key code for display.
 */
function formatDisplayKey(keyCode) {
  if (!keyCode) return '';
  if (keyCode === 'MouseLeft') return 'LMB';
  if (keyCode === 'MouseRight') return 'RMB';
  return keyCode.replace('Key', '').replace('Digit', '');
}

// =============================================================================
// LAZY-LOADED ACTION REGISTRY
// =============================================================================

let ACTIONS_CACHE = null;
let ACTION_BY_ID = null;
let FSM_BY_ID = null;
let ELEMENT_BY_ID = null;

/**
 * Build the ACTIONS object from loaded JSON data.
 * Called lazily on first access.
 */
function buildActions() {
  if (ACTIONS_CACHE) return ACTIONS_CACHE;
  
  ACTIONS_CACHE = {};
  ACTION_BY_ID = new Map();
  FSM_BY_ID = new Map();
  ELEMENT_BY_ID = new Map();
  
  const skills = getAllSkills();
  
  for (const skill of skills) {
    const action = transformSkillToAction(skill);
    if (!action) continue;
    
    ACTIONS_CACHE[action.id] = action;
    ACTION_BY_ID.set(action.id, action);
    FSM_BY_ID.set(action.id, action.fsmAction);
    ELEMENT_BY_ID.set(action.id, action.element ? ELEMENTS[action.element] : null);
  }
  
  return ACTIONS_CACHE;
}

// =============================================================================
// PUBLIC API (matches legacy actions.js)
// =============================================================================

/**
 * Get the ACTIONS object.
 */
export function getActions() {
  return buildActions();
}

/**
 * Get action by ID - O(1)
 */
export function getActionById(actionId) {
  buildActions();
  return ACTION_BY_ID?.get(actionId) || null;
}

/**
 * Get FSM action type for an action ID - O(1)
 */
export function getFsmAction(actionId) {
  buildActions();
  return FSM_BY_ID?.get(actionId) || null;
}

/**
 * Get element data for an action - O(1)
 */
export function getElementForAction(actionId) {
  buildActions();
  return ELEMENT_BY_ID?.get(actionId) || null;
}

/**
 * Get all skill actions (non-consumables)
 */
export function getSkills() {
  const actions = buildActions();
  return Object.values(actions).filter(a => a.type !== ACTION_TYPES.CONSUMABLE);
}

export const getSpells = getSkills;

/**
 * Get all consumable actions
 */
export function getConsumables() {
  const actions = buildActions();
  return Object.values(actions).filter(a => a.type === ACTION_TYPES.CONSUMABLE);
}

/**
 * Get the drag type for an action.
 */
export function getDragType(action) {
  if (!action) return null;
  if (action.dragType) return action.dragType;
  return action.type === ACTION_TYPES.CONSUMABLE ? 'consumable' : 'skill';
}

/**
 * Check if player can afford an action's costs.
 */
export function canAffordAction(action, currentMana, currentHealth) {
  if (!action) return false;
  
  const manaCost = action.manaCost ?? 0;
  const healthCost = action.healthCost ?? 0;
  const manaPerSecond = action.manaPerSecond ?? 0;
  
  const requiredMana = manaCost > 0 ? manaCost : manaPerSecond > 0 ? 1 : 0;
  
  const hasEnoughMana = currentMana >= requiredMana;
  const hasEnoughHealth = healthCost > 0 ? currentHealth > healthCost : true;
  
  return hasEnoughMana && hasEnoughHealth;
}

/**
 * Check if an action is a channel (has mana drain).
 */
export function isChannelAction(action) {
  return (action?.manaPerSecond ?? 0) > 0;
}

/**
 * Check if an action can recast (attack/cast types only).
 */
export function canRecastAction(action) {
  const fsmAction = action?.fsmAction;
  return fsmAction === FSM_ACTIONS.CAST || fsmAction === FSM_ACTIONS.ATTACK;
}

/**
 * Check if an action ID matches a specific skill (by semantic ID).
 * Allows visual effect components to query by semantic name instead of slot ID.
 * 
 * @param {string} actionId - The runtime action ID (e.g., 'skill_1')
 * @param {string} skillId - The semantic skill ID (e.g., 'ice_shard')
 * @returns {boolean}
 */
export function isActionForSkill(actionId, skillId) {
  if (!actionId || !skillId) return false;
  // Direct match (semantic ID used as runtime ID)
  if (actionId === skillId) return true;
  // Check if the action's underlying skill matches
  const expectedActionId = SKILL_TO_ACTION_ID[skillId];
  return actionId === expectedActionId;
}

/**
 * Get the semantic skill ID for an action.
 * 
 * @param {string} actionId - The runtime action ID (e.g., 'skill_1')
 * @returns {string|null} The semantic skill ID (e.g., 'ice_shard')
 */
export function getSkillIdForAction(actionId) {
  if (!actionId) return null;
  return ACTION_TO_SKILL_ID[actionId] || actionId;
}

// Re-export ELEMENTS for convenience
export { ELEMENTS } from '@/config/elements';

// =============================================================================
// LEGACY COMPATIBILITY EXPORTS
// =============================================================================

/**
 * ACTIONS object - lazy proxy for legacy code that accesses ACTIONS directly.
 */
export const ACTIONS = new Proxy({}, {
  get(target, prop) {
    return getActionById(prop);
  },
  ownKeys() {
    return Object.keys(buildActions());
  },
  getOwnPropertyDescriptor(target, prop) {
    const action = getActionById(prop);
    if (action) {
      return { enumerable: true, configurable: true, value: action };
    }
    return undefined;
  },
});
