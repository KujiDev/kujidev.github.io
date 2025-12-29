/**
 * Single source of truth for all player actions.
 * This file defines the mapping between:
 * - Input names (for KeyboardControls)
 * - FSM actions (for state transitions)
 * - UI display (labels, icons)
 */

import iceShardIcon from '@/assets/icons/ice-shard.svg';
import meteorIcon from '@/assets/icons/meteor.svg';
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';
import manaBodyIcon from '@/assets/icons/mana-body.svg';

export const ACTIONS = {
  SKILL_1: {
    id: 'skill_1',
    label: 'Ice Shard',
    defaultKey: 'KeyQ',
    fsmAction: 'ATTACK',
    displayKey: 'Q',
    icon: iceShardIcon,
    manaCost: 15,
  },
  SKILL_2: {
    id: 'skill_2', 
    label: 'Meteor',
    defaultKey: 'KeyW',
    fsmAction: 'CAST',
    displayKey: 'W',
    icon: meteorIcon,
    manaCost: 35,
  },
  SKILL_3: {
    id: 'skill_3',
    label: 'Arcane Rush',
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
  // SKILL_5: {
  //   id: 'skill_5',
  //   label: 'Dash',
  //   defaultKey: 'ShiftLeft',
  //   fsmAction: 'MOVE',
  //   displayKey: 'Shift',
  //   manaCost: 10,
  // },
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
