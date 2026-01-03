/**
 * =============================================================================
 * VALIDATION - Game Rule Enforcement
 * =============================================================================
 * 
 * Pure validation functions for all game rules.
 * These functions return validation results, never throw.
 * 
 * NO REACT. NO ZUSTAND. PURE LOGIC.
 */

import { classOwnsSkill } from './classInstance';
import { getActionById, canAffordAction } from '@/engine/actions';

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string} [reason] - Human-readable reason for failure
 * @property {string} [code] - Machine-readable error code
 */

/**
 * Validate that a skill can be executed.
 * Checks ownership and resource costs.
 * 
 * @param {string} skillId - The skill ID to validate
 * @param {ClassInstance} classInstance - The class instance
 * @param {Object} resources - Current player resources { mana, health }
 * @returns {ValidationResult}
 */
export function validateSkillExecution(skillId, classInstance, resources) {
  // Check ownership
  if (!classOwnsSkill(classInstance, skillId)) {
    return {
      valid: false,
      reason: `Skill "${skillId}" not owned by ${classInstance.id}`,
      code: 'NOT_OWNED',
    };
  }
  
  // Get action data
  const action = getActionById(skillId);
  if (!action) {
    return {
      valid: false,
      reason: `Unknown skill: ${skillId}`,
      code: 'UNKNOWN_SKILL',
    };
  }
  
  // Check resource costs
  if (!canAffordAction(action, resources.mana, resources.health)) {
    return {
      valid: false,
      reason: `Cannot afford ${action.label}`,
      code: 'INSUFFICIENT_RESOURCES',
    };
  }
  
  return { valid: true };
}

/**
 * Validate a class switch.
 * 
 * @param {string} fromClassId - Current class ID
 * @param {string} toClassId - Target class ID
 * @param {string[]} availableClasses - List of available class IDs
 * @returns {ValidationResult}
 */
export function validateClassSwitch(fromClassId, toClassId, availableClasses) {
  if (fromClassId === toClassId) {
    return {
      valid: false,
      reason: 'Already playing as this class',
      code: 'SAME_CLASS',
    };
  }
  
  if (!availableClasses.includes(toClassId)) {
    return {
      valid: false,
      reason: `Class "${toClassId}" is not available`,
      code: 'CLASS_UNAVAILABLE',
    };
  }
  
  return { valid: true };
}

/**
 * Validate a buff application.
 * 
 * @param {Object} buff - The buff to apply
 * @param {Object[]} currentBuffs - Currently active buffs
 * @param {number} maxBuffs - Maximum number of buffs allowed
 * @returns {ValidationResult}
 */
export function validateBuffApplication(buff, currentBuffs, maxBuffs = 10) {
  if (!buff) {
    return {
      valid: false,
      reason: 'No buff provided',
      code: 'NO_BUFF',
    };
  }
  
  if (currentBuffs.length >= maxBuffs) {
    return {
      valid: false,
      reason: 'Maximum buffs reached',
      code: 'MAX_BUFFS',
    };
  }
  
  return { valid: true };
}
