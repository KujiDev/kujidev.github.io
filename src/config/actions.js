/**
 * Single source of truth for all player actions.
 * This file defines the mapping between:
 * - Input names (for KeyboardControls)
 * - FSM actions (for state transitions)
 * - UI display (labels, icons)
 */

export const ACTIONS = {
  SKILL_1: {
    id: 'skill_1',
    label: 'Attack',
    defaultKey: 'KeyQ',
    fsmAction: 'ATTACK',
    displayKey: 'Q',
  },
  SKILL_2: {
    id: 'skill_2', 
    label: 'Cast',
    defaultKey: 'KeyW',
    fsmAction: 'CAST',
    displayKey: 'W',
  },
  SKILL_3: {
    id: 'skill_3',
    label: 'Move',
    defaultKey: 'KeyE',
    fsmAction: 'MOVE',
    displayKey: 'E',
  },
  SKILL_4: {
    id: 'skill_4',
    label: 'Special',
    defaultKey: 'KeyR',
    fsmAction: 'ATTACK',
    displayKey: 'R',
  },
  SKILL_5: {
    id: 'skill_5',
    label: 'Dash',
    defaultKey: 'ShiftLeft',
    fsmAction: 'MOVE',
    displayKey: 'Shift',
  },
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
