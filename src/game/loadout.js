/**
 * =============================================================================
 * LOADOUT - Skill Slot Management
 * =============================================================================
 * 
 * Pure functions for managing player loadouts (skill bar assignments).
 * A loadout is a mapping of slot IDs to action IDs.
 * 
 * NO REACT. NO ZUSTAND. PURE LOGIC.
 */

import { getDefaultSlotMap, SKILL_SLOTS, CONSUMABLE_SLOTS, PIXIE_SLOTS } from '@/config/slots';
import { classOwnsSkill } from './classInstance';

/**
 * @typedef {Object.<string, string|null>} Loadout
 * A mapping of slot IDs to action IDs
 */

/**
 * Create an empty loadout.
 * 
 * @returns {Loadout} Empty loadout with all slots set to null
 */
export function createEmptyLoadout() {
  return getDefaultSlotMap();
}

/**
 * Create a loadout from class defaults.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @returns {Loadout} Loadout with class default assignments
 */
export function createDefaultLoadout(classInstance) {
  const empty = createEmptyLoadout();
  const defaults = classInstance.defaultLoadout || {};
  return { ...empty, ...defaults };
}

/**
 * Merge a saved loadout with defaults.
 * Used when loading from storage.
 * 
 * @param {Loadout} saved - Saved loadout from storage
 * @param {ClassInstance} classInstance - The class instance
 * @returns {Loadout} Merged loadout
 */
export function mergeLoadout(saved, classInstance) {
  const defaults = createDefaultLoadout(classInstance);
  return { ...defaults, ...saved };
}

/**
 * Validate that a loadout only contains skills owned by the class.
 * Returns a sanitized loadout with invalid assignments removed.
 * 
 * @param {Loadout} loadout - The loadout to validate
 * @param {ClassInstance} classInstance - The class instance
 * @returns {Loadout} Sanitized loadout
 */
export function sanitizeLoadout(loadout, classInstance) {
  const sanitized = { ...loadout };
  
  for (const [slotId, actionId] of Object.entries(sanitized)) {
    if (actionId && !classOwnsSkill(classInstance, actionId)) {
      sanitized[slotId] = null;
    }
  }
  
  return sanitized;
}

/**
 * Get the slot type for a slot ID.
 * 
 * @param {string} slotId - The slot ID
 * @returns {'skill' | 'consumable' | 'pixie' | 'unknown'} The slot type
 */
export function getSlotType(slotId) {
  if (SKILL_SLOTS.includes(slotId)) return 'skill';
  if (CONSUMABLE_SLOTS.includes(slotId)) return 'consumable';
  if (PIXIE_SLOTS.includes(slotId)) return 'pixie';
  return 'unknown';
}

/**
 * Check if a skill can be assigned to a slot.
 * 
 * @param {string} slotId - The slot ID
 * @param {string} actionId - The action ID
 * @param {ClassInstance} classInstance - The class instance
 * @returns {{ valid: boolean, reason?: string }} Validation result
 */
export function canAssignToSlot(slotId, actionId, classInstance) {
  // Check ownership
  if (!classOwnsSkill(classInstance, actionId)) {
    return { valid: false, reason: `Skill "${actionId}" not owned by ${classInstance.id}` };
  }
  
  // Check slot type compatibility (could be extended)
  const slotType = getSlotType(slotId);
  if (slotType === 'unknown') {
    return { valid: false, reason: `Unknown slot: ${slotId}` };
  }
  
  return { valid: true };
}

/**
 * Assign an action to a slot.
 * Returns a new loadout (immutable).
 * 
 * @param {Loadout} loadout - Current loadout
 * @param {string} slotId - The slot ID
 * @param {string} actionId - The action ID
 * @param {ClassInstance} classInstance - The class instance
 * @returns {{ loadout: Loadout, success: boolean, error?: string }}
 */
export function assignToSlot(loadout, slotId, actionId, classInstance) {
  const validation = canAssignToSlot(slotId, actionId, classInstance);
  if (!validation.valid) {
    return { loadout, success: false, error: validation.reason };
  }
  
  // Remove from any existing slot
  const updated = { ...loadout };
  for (const [slot, action] of Object.entries(updated)) {
    if (action === actionId) {
      updated[slot] = null;
    }
  }
  
  // Assign to new slot
  updated[slotId] = actionId;
  
  return { loadout: updated, success: true };
}

/**
 * Swap two slots.
 * Returns a new loadout (immutable).
 * 
 * @param {Loadout} loadout - Current loadout
 * @param {string} slotA - First slot ID
 * @param {string} slotB - Second slot ID
 * @returns {Loadout} New loadout with swapped slots
 */
export function swapSlots(loadout, slotA, slotB) {
  const updated = { ...loadout };
  const temp = updated[slotA];
  updated[slotA] = updated[slotB];
  updated[slotB] = temp;
  return updated;
}

/**
 * Clear a slot.
 * Returns a new loadout (immutable).
 * 
 * @param {Loadout} loadout - Current loadout
 * @param {string} slotId - The slot ID to clear
 * @returns {Loadout} New loadout with slot cleared
 */
export function clearSlot(loadout, slotId) {
  return { ...loadout, [slotId]: null };
}

/**
 * Get the slot ID for an action.
 * 
 * @param {Loadout} loadout - The loadout
 * @param {string} actionId - The action ID
 * @returns {string | null} The slot ID or null if not assigned
 */
export function getSlotForAction(loadout, actionId) {
  for (const [slotId, action] of Object.entries(loadout)) {
    if (action === actionId) return slotId;
  }
  return null;
}
