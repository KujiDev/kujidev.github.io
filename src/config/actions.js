/**
 * =============================================================================
 * ACTION SYSTEM - BRIDGE TO ENGINE
 * =============================================================================
 * 
 * This file re-exports actions from the engine layer.
 * The engine loads action definitions from JSON data files.
 * 
 * This is a compatibility layer that maintains the same API as the old
 * hardcoded actions.js, but sources data from JSON.
 */

// Re-export everything from the engine's actions module
export {
  ACTIONS,
  ACTION_TYPES,
  getActionById,
  getFsmAction,
  getElementForAction,
  getSkills,
  getSpells,
  getConsumables,
  getDragType,
  canAffordAction,
  isChannelAction,
  canRecastAction,
  isActionForSkill,
  getSkillIdForAction,
  ELEMENTS,
} from '@/engine/actions';
