/**
 * =============================================================================
 * ENTITY SYSTEM - MAIN EXPORT
 * =============================================================================
 * 
 * This is the canonical source of truth for game entities.
 * 
 * ARCHITECTURE:
 * =============
 * - JSON files in /data/ define all entity data
 * - Engine layer in /engine/ loads and provides access
 * - This file re-exports the runtime helpers for buffs and pixies
 * 
 * For skills, classes, and animations, use the engine layer:
 *   import { getSkillById, getClassById } from '@/engine/loader';
 */

// =============================================================================
// BUFFS - Runtime buff management
// =============================================================================

export {
  BUFF_EFFECTS,
  STACK_RULES,
  createBuffInstance,
  calculateBuffTotals,
  applyBuffToArray,
  removeExpiredBuffs,
} from './buffs';

// =============================================================================
// PIXIES - Companion creature definitions
// =============================================================================

export {
  PIXIES,
  MAX_EQUIPPED_PIXIES,
  DEFAULT_COLLECTED_PIXIES,
  getPixieById,
  getAllPixies,
  getPixieIds,
  calculatePixieBuffs,
  canEquipPixie,
} from './pixies';
