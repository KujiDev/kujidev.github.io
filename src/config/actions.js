/**
 * =============================================================================
 * ACTION SYSTEM - SINGLE SOURCE OF TRUTH
 * =============================================================================
 * 
 * Every player action is defined here. This includes:
 * - Skills (cast/channel abilities)
 * - Attacks (basic/special attacks)
 * - Consumables (potions, food)
 * 
 * Actions define WHAT happens. The game store handles HOW it happens.
 * Components only render - they never define gameplay logic.
 * 
 * Action Flow:
 * 1. Input triggers action ID (keyboard/mouse/UI)
 * 2. Store validates action (cost check, state transition)
 * 3. Store applies costs and starts state transition
 * 4. Animation plays
 * 5. On completion, store applies effects (buffs, mana gain)
 */

import { ELEMENTS } from './elements';
import { FSM_ACTIONS } from './stats';

// =============================================================================
// ICON IMPORTS
// =============================================================================

import iceShardIcon from '@/assets/icons/ice-shard.svg';
import meteorIcon from '@/assets/icons/meteor.svg';
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';
import manaBodyIcon from '@/assets/icons/mana-body.svg';
import arcaneBoltIcon from '@/assets/icons/arcane-bolt.svg';
import arcaneBlastIcon from '@/assets/icons/arcane-blast.svg';
import healthPotionIcon from '@/assets/icons/health-potion.svg';
import foodIcon from '@/assets/icons/food.svg';

// =============================================================================
// ACTION TYPE CATEGORIES
// =============================================================================

export const ACTION_TYPES = {
  CAST: 'Cast',           // Spell with cast time
  ATTACK: 'Attack',       // Basic attack
  CHANNEL: 'Channel',     // Channeled ability (mana drain)
  BUFF: 'Buff',           // Self-buff ability
  CONSUMABLE: 'Consumable', // Instant use item
};

// =============================================================================
// ACTION REGISTRY
// =============================================================================

/**
 * Master action registry.
 * 
 * Each action has:
 * - id: Unique identifier (used everywhere)
 * - label: Display name
 * - description: Tooltip text
 * - type: Category (Cast, Attack, Channel, Buff, Consumable)
 * - element: Visual element type (ice, fire, arcane, etc.)
 * - fsmAction: State machine action to trigger
 * - icon: SVG icon
 * 
 * Costs (optional):
 * - manaCost: Upfront mana cost
 * - healthCost: Upfront health cost
 * - manaPerSecond: Continuous mana drain (channels)
 * 
 * Effects (optional):
 * - manaGain: Mana restored on hit
 * - buff: Buff to apply on completion
 * 
 * UI (optional):
 * - defaultKey: Default keybinding
 * - displayKey: Key label for UI
 */
export const ACTIONS = {
  // =========================================================================
  // SKILLS (Slot 1-4)
  // =========================================================================
  
  skill_1: {
    id: 'skill_1',
    label: 'Ice Shard',
    description: 'Hurl a freezing shard of ice at your target, dealing frost damage.',
    type: ACTION_TYPES.ATTACK,
    element: 'ice',
    fsmAction: FSM_ACTIONS.ATTACK,
    icon: iceShardIcon,
    manaCost: 15,
    defaultKey: 'KeyQ',
    displayKey: 'Q',
  },
  
  skill_2: {
    id: 'skill_2',
    label: 'Meteor',
    description: 'Conjure a blazing meteor from the sky, crashing down with explosive fire damage.',
    type: ACTION_TYPES.CAST,
    element: 'fire',
    fsmAction: FSM_ACTIONS.CAST,
    icon: meteorIcon,
    manaCost: 35,
    defaultKey: 'KeyW',
    displayKey: 'W',
  },
  
  skill_3: {
    id: 'skill_3',
    label: 'Arcane Rush',
    description: 'Channel arcane power to dash forward at high speed. Drains mana while active.',
    type: ACTION_TYPES.CHANNEL,
    element: 'arcane',
    fsmAction: FSM_ACTIONS.MOVE,
    icon: arcaneRushIcon,
    manaCost: 0,           // No upfront cost
    manaPerSecond: 15,     // Drains mana while active
    defaultKey: 'KeyE',
    displayKey: 'E',
  },
  
  skill_4: {
    id: 'skill_4',
    label: 'Mana Body',
    description: 'Sacrifice your life force to infuse your body with pure mana, greatly increasing mana regeneration.',
    type: ACTION_TYPES.BUFF,
    element: 'mana',
    fsmAction: FSM_ACTIONS.CAST,
    icon: manaBodyIcon,
    manaCost: 0,
    healthCost: 25,        // Costs health instead of mana
    defaultKey: 'KeyR',
    displayKey: 'R',
    buff: {
      id: 'mana_body',
      name: 'Mana Body',
      icon: manaBodyIcon,
      duration: 30,
      manaRegenBonus: 10,
    },
  },
  
  // =========================================================================
  // MOUSE ATTACKS
  // =========================================================================
  
  primary_attack: {
    id: 'primary_attack',
    label: 'Arcane Bolt',
    description: 'Launch a bolt of arcane energy at your target, restoring mana on hit.',
    type: ACTION_TYPES.ATTACK,
    element: 'arcane',
    fsmAction: FSM_ACTIONS.ATTACK,
    icon: arcaneBoltIcon,
    manaCost: 0,
    manaGain: 8,           // Restores mana on hit
    defaultKey: 'MouseLeft',
    displayKey: 'LMB',
  },
  
  secondary_attack: {
    id: 'secondary_attack',
    label: 'Arcane Blast',
    description: 'Channel a powerful blast of arcane energy at your target.',
    type: ACTION_TYPES.CAST,
    element: 'arcane',
    fsmAction: FSM_ACTIONS.CAST,
    icon: arcaneBlastIcon,
    manaCost: 20,
    defaultKey: 'MouseRight',
    displayKey: 'RMB',
  },
  
  // =========================================================================
  // CONSUMABLES
  // =========================================================================
  
  potion: {
    id: 'potion',
    label: 'Health Potion',
    description: 'Drink a restorative potion that heals you over time.',
    type: ACTION_TYPES.CONSUMABLE,
    element: 'healing',
    fsmAction: FSM_ACTIONS.INSTANT,
    icon: healthPotionIcon,
    manaCost: 0,
    defaultKey: 'KeyD',
    displayKey: 'D',
    buff: {
      id: 'health_potion',
      name: 'Regeneration',
      icon: healthPotionIcon,
      duration: 10,
      healthRegenBonus: 8,
    },
  },
  
  food: {
    id: 'food',
    label: 'Mana Biscuit',
    description: 'Eat an enchanted biscuit that restores mana over time.',
    type: ACTION_TYPES.CONSUMABLE,
    element: 'mana',
    fsmAction: FSM_ACTIONS.INSTANT,
    icon: foodIcon,
    manaCost: 0,
    defaultKey: 'KeyF',
    displayKey: 'F',
    buff: {
      id: 'food_buff',
      name: 'Mana Infused',
      icon: foodIcon,
      duration: 15,
      manaRegenBonus: 5,
    },
  },
};

// =============================================================================
// ACTION LOOKUP (O(1) access)
// =============================================================================

// Pre-built lookup tables for hot-path access
const ACTION_BY_ID = new Map(Object.values(ACTIONS).map(a => [a.id, a]));
const FSM_BY_ID = new Map(Object.values(ACTIONS).map(a => [a.id, a.fsmAction]));
const ELEMENT_BY_ID = new Map(Object.values(ACTIONS).map(a => [a.id, a.element ? ELEMENTS[a.element] : null]));

/**
 * Get action by ID - O(1)
 */
export const getActionById = (actionId) => ACTION_BY_ID.get(actionId) || null;

/**
 * Get FSM action type for an action ID - O(1)
 */
export const getFsmAction = (actionId) => FSM_BY_ID.get(actionId) || null;

/**
 * Get element data for an action - O(1)
 */
export const getElementForAction = (actionId) => ELEMENT_BY_ID.get(actionId) || null;

// =============================================================================
// ACTION FILTERS
// =============================================================================

/**
 * Get all skill actions (non-consumables)
 */
export const getSkills = () => 
  Object.values(ACTIONS).filter(a => a.type !== ACTION_TYPES.CONSUMABLE);

export const getSpells = getSkills;

/**
 * Get all consumable actions
 */
export const getConsumables = () => 
  Object.values(ACTIONS).filter(a => a.type === ACTION_TYPES.CONSUMABLE);

/**
 * Get the drag type for an action - determines which slots it can be dropped into
 */
export const getDragType = (action) => {
  if (!action) return null;
  if (action.dragType) return action.dragType;
  return action.type === ACTION_TYPES.CONSUMABLE ? 'consumable' : 'skill';
};

// =============================================================================
// ACTION VALIDATION
// =============================================================================

/**
 * Check if player can afford an action's costs
 * 
 * @param {object} action - Action config
 * @param {number} currentMana - Current mana
 * @param {number} currentHealth - Current health
 * @returns {boolean}
 */
export const canAffordAction = (action, currentMana, currentHealth) => {
  if (!action) return false;
  
  const manaCost = action.manaCost ?? 0;
  const healthCost = action.healthCost ?? 0;
  const manaPerSecond = action.manaPerSecond ?? 0;
  
  // For channel abilities, need at least 1 mana to start
  const requiredMana = manaCost > 0 ? manaCost : manaPerSecond > 0 ? 1 : 0;
  
  const hasEnoughMana = currentMana >= requiredMana;
  const hasEnoughHealth = healthCost > 0 ? currentHealth > healthCost : true;
  
  return hasEnoughMana && hasEnoughHealth;
};

/**
 * Check if an action is a channel (has mana drain)
 */
export const isChannelAction = (action) => (action?.manaPerSecond ?? 0) > 0;

/**
 * Check if an action can recast (attack/cast types only)
 */
export const canRecastAction = (action) => {
  const fsmAction = action?.fsmAction;
  return fsmAction === FSM_ACTIONS.CAST || fsmAction === FSM_ACTIONS.ATTACK;
};

// Re-export ELEMENTS for convenience
export { ELEMENTS } from './elements';
