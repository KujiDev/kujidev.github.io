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

/**
 * Element color palette - unified across UI and 3D
 * Each element has:
 * - primary: Main color for UI elements, casting circles
 * - secondary: Lighter accent for highlights, trails
 * - glow: Emissive color for 3D materials (staff glow, particles)
 * - dark: Deep shadow tone for UI depth
 */
export const ELEMENTS = {
  ice: {
    id: 'ice',
    name: 'Ice',
    primary: '#5ba4d0',    // Cool cyan-blue
    secondary: '#8ed3f7',  // Light ice highlight
    glow: '#5ba4d0',
    dark: '#1a3a4a',
  },
  fire: {
    id: 'fire',
    name: 'Fire',
    primary: '#e85a30',    // Warm orange-red
    secondary: '#ffa040',  // Hot yellow-orange highlight
    glow: '#ff6b35',
    dark: '#4a1a10',
  },
  arcane: {
    id: 'arcane',
    name: 'Arcane',
    primary: '#9070c0',    // Rich purple - matches icon colors
    secondary: '#c0a8e8',  // Light lavender highlight
    glow: '#bb77ff',       // Matches ShieldEffect aura
    dark: '#2a1a3a',
  },
  mana: {
    id: 'mana',
    name: 'Mana',
    primary: '#4080ff',    // Deep blue
    secondary: '#80c0ff',  // Bright sky blue
    glow: '#60a0ff',
    dark: '#0d1a3a',
  },
  healing: {
    id: 'healing',
    name: 'Healing',
    primary: '#e85050',    // Warm red
    secondary: '#ff8080',  // Soft pink highlight
    glow: '#ff6b6b',
    dark: '#3a1010',
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
    label: 'Mana Biscuit',
    description: 'Eat an enchanted biscuit that restores mana over time.',
    type: 'Consumable',
    element: 'mana',
    defaultKey: 'KeyF',
    fsmAction: 'INSTANT',
    displayKey: 'F',
    icon: foodIcon,
    manaCost: 0,
    buff: {
      id: 'food_buff',
      name: 'Mana Infused',
      icon: foodIcon,
      duration: 15, // seconds
      manaRegenBonus: 5, // Additional mana per second
    },
  },
};

export const getElementForAction = (actionId) => {
  const action = Object.values(ACTIONS).find(a => a.id === actionId);
  if (!action?.element) return null;
  return ELEMENTS[action.element] || null;
};

export const getFsmAction = (inputId) => {
  const action = Object.values(ACTIONS).find(a => a.id === inputId);
  return action?.fsmAction || null;
};

export const getActionById = (inputId) => 
  Object.values(ACTIONS).find(a => a.id === inputId);

/**
 * Get the drag type for an action - determines which slots it can be dropped into
 * 'skill' can go into skill/mouse slots, 'consumable' can go into consumable slots
 */
export const getDragType = (action) => {
  if (!action) return null;
  return action.type === 'Consumable' ? 'consumable' : 'skill';
};

/**
 * Get all spell actions (non-consumables)
 */
export const getSpells = () => 
  Object.values(ACTIONS).filter(a => a.type !== 'Consumable');

/**
 * Get all consumable actions
 */
export const getConsumables = () => 
  Object.values(ACTIONS).filter(a => a.type === 'Consumable');

/**
 * Get consumables by sub-type (based on id pattern or buff type)
 */
export const getPotions = () => 
  Object.values(ACTIONS).filter(a => a.type === 'Consumable' && a.id.includes('potion'));

export const getFood = () => 
  Object.values(ACTIONS).filter(a => a.type === 'Consumable' && a.id.includes('food'));
