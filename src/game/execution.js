/**
 * =============================================================================
 * EXECUTION - Skill and Action Execution
 * =============================================================================
 * 
 * Pure functions for executing game actions.
 * These functions take current state and return new state.
 * 
 * NO REACT. NO ZUSTAND. PURE LOGIC.
 */

import { validateSkillExecution } from './validation';
import { getActionById } from '@/engine/actions';

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Whether execution succeeded
 * @property {Object} [stateChanges] - State changes to apply
 * @property {string} [error] - Error message if failed
 * @property {string} [errorCode] - Machine-readable error code
 */

/**
 * Execute a skill.
 * Returns the state changes to apply (does not mutate anything).
 * 
 * @param {string} skillId - The skill ID to execute
 * @param {ClassInstance} classInstance - The class instance
 * @param {Object} currentState - Current player state { mana, health, buffs }
 * @returns {ExecutionResult}
 */
export function executeSkill(skillId, classInstance, currentState) {
  // Validate first
  const validation = validateSkillExecution(skillId, classInstance, {
    mana: currentState.mana,
    health: currentState.health,
  });
  
  if (!validation.valid) {
    return {
      success: false,
      error: validation.reason,
      errorCode: validation.code,
    };
  }
  
  const action = getActionById(skillId);
  
  // Calculate state changes
  const stateChanges = {
    mana: currentState.mana - (action.manaCost || 0) + (action.manaGain || 0),
    health: currentState.health - (action.healthCost || 0),
  };
  
  // Add buff if skill grants one
  if (action.buff) {
    stateChanges.newBuff = {
      ...action.buff,
      sourceAction: skillId,
      appliedAt: Date.now(),
    };
  }
  
  return {
    success: true,
    stateChanges,
    action,
  };
}

/**
 * Calculate the result of a channeled skill tick.
 * 
 * @param {Object} action - The action being channeled
 * @param {number} mana - Current mana
 * @param {number} deltaTime - Time since last tick (seconds)
 * @returns {ExecutionResult}
 */
export function tickChannel(action, mana, deltaTime) {
  const manaDrain = (action.manaPerSecond || 0) * deltaTime;
  
  if (mana < manaDrain) {
    return {
      success: false,
      error: 'Insufficient mana for channel',
      errorCode: 'CHANNEL_DRAIN_FAILED',
    };
  }
  
  return {
    success: true,
    stateChanges: {
      mana: mana - manaDrain,
    },
  };
}

/**
 * Calculate damage output for a skill.
 * 
 * @param {Object} action - The action being executed
 * @param {Object} modifiers - Damage modifiers { elementBonus, critMultiplier, etc }
 * @returns {number} Final damage value
 */
export function calculateDamage(action, modifiers = {}) {
  const baseDamage = action.damage || 0;
  const elementBonus = modifiers.elementBonus || 0;
  const critMultiplier = modifiers.isCrit ? (modifiers.critMultiplier || 1.5) : 1;
  
  return Math.floor(baseDamage * (1 + elementBonus) * critMultiplier);
}
