/**
 * =============================================================================
 * CLASS INSTANCE - Player Class State
 * =============================================================================
 * 
 * A ClassInstance represents the current state of a player's class.
 * It is immutable - every change returns a new instance.
 * 
 * NO REACT. NO ZUSTAND. PURE LOGIC.
 */

import { getClassById, getAllowedSkillsForClass, getDefaultLoadoutForClass } from '@/engine/classes';

/**
 * Create a new class instance.
 * 
 * @param {string} classId - The class ID (e.g., 'wizard', 'cleric')
 * @returns {ClassInstance} A frozen class instance
 */
export function createClassInstance(classId) {
  const classData = getClassById(classId);
  if (!classData) {
    throw new Error(`Unknown class: ${classId}`);
  }
  
  const allowedSkills = new Set(getAllowedSkillsForClass(classId));
  const defaultLoadout = getDefaultLoadoutForClass(classId);
  
  return Object.freeze({
    id: classId,
    name: classData.name,
    allowedSkills,
    defaultLoadout,
    // UI metadata - passed through, not interpreted
    ui: classData.ui || {},
    model: classData.model || {},
    stateAnimations: classData.stateAnimations || {},
    panels: classData.panels || {},
  });
}

/**
 * Check if a class owns a skill.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @param {string} skillId - The skill ID to check
 * @returns {boolean} True if the class owns the skill
 */
export function classOwnsSkill(classInstance, skillId) {
  return classInstance.allowedSkills.has(skillId);
}

/**
 * Get all skill IDs owned by a class.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @returns {string[]} Array of skill IDs
 */
export function getOwnedSkillIds(classInstance) {
  return Array.from(classInstance.allowedSkills);
}

/**
 * Check if two class instances are the same class.
 * 
 * @param {ClassInstance} a - First instance
 * @param {ClassInstance} b - Second instance
 * @returns {boolean} True if same class
 */
export function isSameClass(a, b) {
  return a?.id === b?.id;
}
