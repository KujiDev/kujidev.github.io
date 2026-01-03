/**
 * =============================================================================
 * CLASS SYSTEM - Player Class Configuration
 * =============================================================================
 * 
 * Loads and provides access to class definitions.
 * Classes define player stats, skills, animations, and visual configuration.
 * 
 * ARCHITECTURE:
 * =============
 * - Class definitions live in JSON (src/data/classes/)
 * - This module loads and normalizes them
 * - The Player component uses this to configure itself
 * - NO CLASS-SPECIFIC LOGIC - just data access
 */

import wizardData from '@/data/classes/wizard.json';
import clericData from '@/data/classes/cleric.json';
import { getSkills, getConsumables, getPixies, getActionIdForSkill } from '@/engine/actions';

// =============================================================================
// CLASS REGISTRY
// =============================================================================

let CLASSES_CACHE = null;
let CLASSES_BY_ID = null;

/**
 * Build the class registry from JSON data.
 */
function buildClasses() {
  if (CLASSES_CACHE) return CLASSES_CACHE;
  
  // Collect all class data files
  const allClassData = [
    wizardData,
    clericData,
  ];
  
  CLASSES_CACHE = allClassData.map(cls => ({
    ...cls,
    // Normalize any class-specific properties here
  }));
  
  // Build ID lookup
  CLASSES_BY_ID = {};
  for (const cls of CLASSES_CACHE) {
    CLASSES_BY_ID[cls.id] = cls;
  }
  
  return CLASSES_CACHE;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get all available classes.
 */
export function getClasses() {
  return buildClasses();
}

/**
 * Get a class by ID.
 */
export function getClassById(classId) {
  if (!CLASSES_BY_ID) buildClasses();
  return CLASSES_BY_ID[classId] || null;
}

/**
 * Get the default class for new players.
 */
export function getDefaultClass() {
  return getClassById('wizard');
}

/**
 * Get available class IDs.
 */
export function getClassIds() {
  return getClasses().map(c => c.id);
}

/**
 * Get allowed skills for a class.
 */
export function getAllowedSkillsForClass(classId) {
  const cls = getClassById(classId);
  return cls?.allowedSkills || [];
}

/**
 * Get collectable pixies for a class.
 */
export function getCollectablePixiesForClass(classId) {
  const cls = getClassById(classId);
  return cls?.collectablePixies || [];
}

/**
 * Get ALL allowed actions for a class (skills + consumables + pixies).
 * This is used for slot assignment validation.
 * 
 * IMPORTANT: Returns runtime action IDs (e.g., 'skill_1', 'potion', 'azure')
 * NOT semantic skill IDs from JSON (e.g., 'ice_shard', 'health_potion')
 */
export function getAllAllowedActionsForClass(classId) {
  const cls = getClassById(classId);
  const skills = cls?.allowedSkills || [];
  const pixies = cls?.collectablePixies || [];
  
  // Translate skill IDs to action IDs (pixie IDs don't need translation)
  const actionIds = skills.map(skillId => getActionIdForSkill(skillId));
  
  const result = [...actionIds, ...pixies];
  
  if (import.meta.env.DEV) {
    console.log(`[DEBUG][Classes] getAllAllowedActionsForClass("${classId}"):`, {
      skills,
      actionIds,
      pixies,
      result,
    });
  }
  
  return result;
}

/**
 * Get default loadout for a class.
 */
export function getDefaultLoadoutForClass(classId) {
  const cls = getClassById(classId);
  return cls?.defaultLoadout || {};
}

/**
 * Get base stats for a class.
 */
export function getBaseStatsForClass(classId) {
  const cls = getClassById(classId);
  return cls?.baseStats || {
    maxHealth: 100,
    maxMana: 100,
    healthRegen: 1,
    manaRegen: 1,
    moveSpeed: 1.0,
  };
}

/**
 * Get animation mapping for a class.
 * Maps game states to animation names.
 */
export function getAnimationsForClass(classId) {
  const cls = getClassById(classId);
  return cls?.stateAnimations || {
    idle: 'IDLE',
    casting: 'CAST_SECONDARY',
    attacking: 'CAST_PRIMARY',
    moving: 'RUN',
    dead: 'DEATH',
  };
}

/**
 * Get model configuration for a class.
 */
export function getModelConfigForClass(classId) {
  const cls = getClassById(classId);
  return cls?.model || {
    path: '/models/Wizard-transformed.glb',
    scale: 1,
    position: [0, 0, 0],
  };
}

// =============================================================================
// CLASS-SCOPED CONTENT GETTERS
// =============================================================================

/**
 * Get skills available to a specific class.
 * Only returns skills listed in the class's allowedSkills array.
 * 
 * NOTE: We use _skillId (original JSON ID) for filtering because the action
 * system may map skill IDs to legacy action IDs (e.g., ice_shard -> skill_1).
 * Class configs use the semantic JSON IDs.
 */
export function getScopedSkillsForClass(classId) {
  const allowedIds = getAllowedSkillsForClass(classId);
  if (!allowedIds.length) return [];
  
  const allowedSet = new Set(allowedIds);
  // Filter by _skillId (original JSON ID) or id (for unmapped skills)
  return getSkills().filter(skill => 
    allowedSet.has(skill._skillId) || allowedSet.has(skill.id)
  );
}

/**
 * Get consumables available to a specific class.
 * Only returns consumables listed in the class's allowedSkills array.
 */
export function getScopedConsumablesForClass(classId) {
  const allowedIds = getAllowedSkillsForClass(classId);
  if (!allowedIds.length) return [];
  
  const allowedSet = new Set(allowedIds);
  // Filter by _skillId (original JSON ID) or id (for unmapped consumables)
  return getConsumables().filter(consumable => 
    allowedSet.has(consumable._skillId) || allowedSet.has(consumable.id)
  );
}

/**
 * Get pixies available to a specific class.
 * Only returns pixies listed in the class's collectablePixies array.
 */
export function getScopedPixiesForClass(classId) {
  const cls = getClassById(classId);
  const collectableIds = cls?.collectablePixies || [];
  if (!collectableIds.length) return [];
  
  const collectableSet = new Set(collectableIds);
  return getPixies().filter(pixie => collectableSet.has(pixie.id));
}
