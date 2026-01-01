/**
 * Single source of truth for all player actions.
 * This file defines the mapping between:
 * - Input names (for KeyboardControls)
 * - FSM actions (for state transitions)
 * - UI display (labels, icons)
 * - Element types (for visual effects)
 */

import iceShardIcon from '@/assets/icons/ice-shard.svg';
import meteorIcon from '@/assets/icons/meteor.svg';
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';
import manaBodyIcon from '@/assets/icons/mana-body.svg';
import arcaneBoltIcon from '@/assets/icons/arcane-bolt.svg';
import arcaneBlastIcon from '@/assets/icons/arcane-blast.svg';
import healthPotionIcon from '@/assets/icons/health-potion.svg';
import foodIcon from '@/assets/icons/food.svg';

// Element definitions - colors for circles and staff glow
export const ELEMENTS = {
  ice: {
    id: 'ice',
    name: 'Ice',
    primary: '#4fc3f7',
    secondary: '#81d4fa',
    glow: '#4fc3f7',
  },
  fire: {
    id: 'fire',
    name: 'Fire',
    primary: '#ff6b35',
    secondary: '#ffa040',
    glow: '#ff6b35',
  },
  arcane: {
    id: 'arcane',
    name: 'Arcane',
    primary: '#da70d6',
    secondary: '#ee82ee',
    glow: '#da70d6',
  },
  mana: {
    id: 'mana',
    name: 'Mana',
    primary: '#60a0ff',
    secondary: '#a0d0ff',
    glow: '#60a0ff',
  },
  healing: {
    id: 'healing',
    name: 'Healing',
    primary: '#ff6b6b',
    secondary: '#ffaaaa',
    glow: '#ff6b6b',
  },
};

export const ACTIONS = {
  SKILL_1: {
    id: 'skill_1',
    label: 'Ice Shard',
    description: 'Hurl a freezing shard of ice at your target, dealing frost damage.',
    type: 'Cast',
    element: 'ice',
    defaultKey: 'KeyQ',
    fsmAction: 'ATTACK',
    displayKey: 'Q',
    icon: iceShardIcon,
    manaCost: 15,
  },
  SKILL_2: {
    id: 'skill_2', 
    label: 'Meteor',
    description: 'Conjure a blazing meteor from the sky, crashing down with explosive fire damage.',
    type: 'Cast',
    element: 'fire',
    defaultKey: 'KeyW',
    fsmAction: 'CAST',
    displayKey: 'W',
    icon: meteorIcon,
    manaCost: 35,
  },
  SKILL_3: {
    id: 'skill_3',
    label: 'Arcane Rush',
    description: 'Channel arcane power to dash forward at high speed. Drains mana while active.',
    type: 'Channel',
    element: 'arcane',
    defaultKey: 'KeyE',
    fsmAction: 'MOVE',
    displayKey: 'E',
    icon: arcaneRushIcon,
    manaCost: 0, // No upfront cost
    manaPerSecond: 15, // Drains mana while active
  },
  SKILL_4: {
    id: 'skill_4',
    label: 'Mana Body',
    description: 'Sacrifice your life force to infuse your body with pure mana, greatly increasing mana regeneration.',
    type: 'Buff',
    element: 'mana',
    defaultKey: 'KeyR',
    fsmAction: 'CAST',
    displayKey: 'R',
    icon: manaBodyIcon,
    healthCost: 25, // Costs health instead of mana
    manaCost: 0,
    buff: {
      id: 'mana_body',
      name: 'Mana Body',
      icon: manaBodyIcon,
      duration: 30, // seconds
      manaRegenBonus: 10, // Additional mana per second
    },
  },
  // Left-click ability - basic attack on target
  PRIMARY_ATTACK: {
    id: 'primary_attack',
    label: 'Arcane Bolt',
    description: 'Launch a bolt of arcane energy at your target, restoring mana on hit.',
    type: 'Attack',
    element: 'arcane',
    defaultKey: 'MouseLeft',
    fsmAction: 'ATTACK',
    displayKey: 'LMB',
    icon: arcaneBoltIcon,
    manaGain: 8,
    requiresTarget: true,
  },
  // Right-click ability - stronger attack on target
  SECONDARY_ATTACK: {
    id: 'secondary_attack',
    label: 'Arcane Blast',
    description: 'Channel a powerful blast of arcane energy at your target.',
    type: 'Cast',
    element: 'arcane',
    defaultKey: 'MouseRight',
    fsmAction: 'CAST',
    displayKey: 'RMB',
    icon: arcaneBlastIcon,
    manaCost: 20,
    requiresTarget: true,
  },
  // Consumable - health potion
  POTION: {
    id: 'potion',
    label: 'Health Potion',
    description: 'Drink a restorative potion that heals you over time.',
    type: 'Consumable',
    element: 'healing',
    defaultKey: 'KeyD',
    fsmAction: 'INSTANT', // Instant use, no cast time
    displayKey: 'D',
    icon: healthPotionIcon,
    manaCost: 0,
    buff: {
      id: 'health_potion',
      name: 'Regeneration',
      icon: healthPotionIcon,
      duration: 10, // seconds
      healthRegenBonus: 8, // Additional health per second
    },
  },
  // Consumable - food
  FOOD: {
    id: 'food',
    label: 'Roasted Meat',
    description: 'Eat a hearty meal that restores health over time.',
    type: 'Consumable',
    element: 'healing',
    defaultKey: 'KeyF',
    fsmAction: 'INSTANT',
    displayKey: 'F',
    icon: foodIcon,
    manaCost: 0,
    buff: {
      id: 'food_buff',
      name: 'Well Fed',
      icon: foodIcon,
      duration: 15, // seconds
      healthRegenBonus: 5, // Additional health per second
    },
  },
};

// Get element config for an action
export const getElementForAction = (actionId) => {
  const action = Object.values(ACTIONS).find(a => a.id === actionId);
  if (!action?.element) return null;
  return ELEMENTS[action.element] || null;
};

// Generate default keymap from actions
export const getDefaultKeyMap = () => 
  Object.values(ACTIONS).map(action => ({
    name: action.id,
    keys: [action.defaultKey],
  }));

// Get FSM action for an input
export const getFsmAction = (inputId) => {
  const action = Object.values(ACTIONS).find(a => a.id === inputId);
  return action?.fsmAction || null;
};

// Get action config by input ID
export const getActionById = (inputId) => 
  Object.values(ACTIONS).find(a => a.id === inputId);

// List of skill bar actions (for UI rendering)
export const SKILL_BAR_ACTIONS = [
  ACTIONS.SKILL_1,
  ACTIONS.SKILL_2,
  ACTIONS.SKILL_3,
  ACTIONS.SKILL_4,
];
