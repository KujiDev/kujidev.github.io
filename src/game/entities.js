/**
 * =============================================================================
 * ENTITIES - Pre-Resolved Entity Data for UI
 * =============================================================================
 * 
 * This module resolves entities (skills, pixies, consumables) into
 * render-ready shapes that React components can consume without interpretation.
 * 
 * React receives pre-resolved props, NOT raw data it must interpret.
 * 
 * NO REACT. NO ZUSTAND. PURE LOGIC.
 */

import { 
  getSkills, 
  getConsumables, 
  getPixies,
  getActionById,
  ELEMENTS,
} from '@/engine/actions';
import {
  getScopedSkillsForClass,
  getScopedConsumablesForClass,
  getScopedPixiesForClass,
} from '@/engine/classes';
import { classOwnsSkill } from './classInstance';

// =============================================================================
// BUFF TYPE DISPLAY INFO (moved from component)
// =============================================================================

/**
 * Buff type display metadata.
 * This is game data, not UI logic.
 */
export const BUFF_DISPLAY_INFO = Object.freeze({
  healthRegen: { label: 'Health Regen', suffix: '/sec', color: '#40ff80', name: 'Healing' },
  manaRegen: { label: 'Mana Regen', suffix: '/sec', color: '#40a0ff', name: 'Mana' },
  maxHealth: { label: 'Max Health', suffix: '', color: '#ff6040', name: 'Vitality' },
  maxMana: { label: 'Max Mana', suffix: '', color: '#a040ff', name: 'Arcane' },
  castSpeed: { label: 'Cast Speed', suffix: '%', color: '#ffcc00', name: 'Haste' },
  cooldownReduction: { label: 'Cooldown', suffix: '%', color: '#00ccff', name: 'Flow' },
});

// =============================================================================
// ENTITY RESOLUTION
// =============================================================================

/**
 * Resolve a skill into render-ready props.
 * 
 * @param {Object} skill - Raw skill data from engine
 * @param {Object} context - Resolution context { slotMap, classInstance }
 * @returns {Object} Render-ready skill props
 */
export function resolveSkillForRender(skill, context = {}) {
  const element = skill.element ? ELEMENTS[skill.element] : null;
  const assignedSlot = context.slotMap 
    ? Object.entries(context.slotMap).find(([_, id]) => id === skill.id)?.[0]
    : null;
  
  return {
    id: skill.id,
    label: skill.label,
    description: skill.description,
    icon: skill.icon,
    type: skill.type,
    
    // Pre-resolved element data
    element: element ? {
      id: skill.element,
      name: element.name,
      primaryColor: element.primary,
      secondaryColor: element.secondary,
    } : null,
    
    // Flat cost/gain properties (for component compatibility)
    manaCost: skill.manaCost || 0,
    healthCost: skill.healthCost || 0,
    manaPerSecond: skill.manaPerSecond || 0,
    manaGain: skill.manaGain || 0,
    
    // Pre-resolved buff info
    buff: skill.buff ? {
      duration: skill.buff.duration,
      type: skill.buff.type,
      value: skill.buff.value,
      // Include legacy bonus fields for consumables
      healthRegenBonus: skill.buff.healthRegenBonus || 0,
      manaRegenBonus: skill.buff.manaRegenBonus || 0,
      displayInfo: BUFF_DISPLAY_INFO[skill.buff.type],
    } : null,
    
    // UI state
    isAssigned: !!assignedSlot,
    assignedSlot,
    
    // Drag data (pre-packaged)
    dragData: {
      id: skill.id,
      icon: skill.icon,
      label: skill.label,
      dragType: 'skill',
    },
  };
}

/**
 * Resolve a pixie into render-ready props.
 * 
 * @param {Object} pixie - Raw pixie data from engine
 * @param {Object} context - Resolution context { slotMap, collectedPixies }
 * @returns {Object} Render-ready pixie props
 */
export function resolvePixieForRender(pixie, context = {}) {
  const buffInfo = pixie.buff ? BUFF_DISPLAY_INFO[pixie.buff.type] : null;
  const assignedSlot = context.slotMap 
    ? Object.entries(context.slotMap).find(([_, id]) => id === pixie.id)?.[0]
    : null;
  const isCollected = context.collectedPixies?.includes(pixie.id) ?? false;
  
  return {
    id: pixie.id,
    label: pixie.label,
    description: pixie.description,
    icon: pixie.icon,
    color: pixie.color,
    type: 'pixie', // Entity type for UI display
    activationType: 'passive', // Pixies are always passive
    
    // Pre-resolved buff info with displayInfo
    buff: pixie.buff ? {
      type: pixie.buff.type,
      value: pixie.buff.value,
      duration: pixie.buff.duration || 0,
      displayInfo: buffInfo,
    } : null,
    
    // UI state
    isCollected,
    isAssigned: !!assignedSlot,
    assignedSlot,
    
    // Drag data (pre-packaged)
    dragData: {
      id: pixie.id,
      icon: pixie.icon,
      label: pixie.label,
      dragType: 'pixie',
    },
  };
}

/**
 * Resolve a consumable into render-ready props.
 * 
 * @param {Object} consumable - Raw consumable data from engine
 * @param {Object} context - Resolution context { slotMap }
 * @returns {Object} Render-ready consumable props
 */
export function resolveConsumableForRender(consumable, context = {}) {
  const element = consumable.element ? ELEMENTS[consumable.element] : null;
  const assignedSlot = context.slotMap 
    ? Object.entries(context.slotMap).find(([_, id]) => id === consumable.id)?.[0]
    : null;
  
  return {
    id: consumable.id,
    label: consumable.label,
    description: consumable.description,
    icon: consumable.icon,
    type: consumable.type,
    
    // Pre-resolved element data
    element: element ? {
      id: consumable.element,
      name: element.name,
      primaryColor: element.primary,
      secondaryColor: element.secondary,
    } : null,
    
    // Pre-resolved buff info with legacy bonus fields
    buff: consumable.buff ? {
      duration: consumable.buff.duration,
      type: consumable.buff.type,
      value: consumable.buff.value,
      healthRegenBonus: consumable.buff.healthRegenBonus || 0,
      manaRegenBonus: consumable.buff.manaRegenBonus || 0,
      displayInfo: BUFF_DISPLAY_INFO[consumable.buff.type],
    } : null,
    
    // UI state
    isAssigned: !!assignedSlot,
    assignedSlot,
    
    // Drag data (pre-packaged)
    dragData: {
      id: consumable.id,
      icon: consumable.icon,
      label: consumable.label,
      dragType: 'consumable',
    },
  };
}

// =============================================================================
// BATCH RESOLUTION (for lists)
// =============================================================================

/**
 * Resolve all skills for a class into render-ready list.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @param {Object} context - Resolution context { slotMap }
 * @returns {Object[]} Array of render-ready skill props
 */
export function resolveSkillsForClass(classInstance, context = {}) {
  const skills = getScopedSkillsForClass(classInstance.id);
  return skills.map(skill => resolveSkillForRender(skill, context));
}

/**
 * Resolve all pixies for a class into render-ready list.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @param {Object} context - Resolution context { slotMap, collectedPixies }
 * @returns {Object[]} Array of render-ready pixie props
 */
export function resolvePixiesForClass(classInstance, context = {}) {
  const pixies = getScopedPixiesForClass(classInstance.id);
  return pixies.map(pixie => resolvePixieForRender(pixie, context));
}

/**
 * Resolve all consumables for a class into render-ready list.
 * 
 * @param {ClassInstance} classInstance - The class instance
 * @param {Object} context - Resolution context { slotMap }
 * @returns {Object[]} Array of render-ready consumable props
 */
export function resolveConsumablesForClass(classInstance, context = {}) {
  const consumables = getScopedConsumablesForClass(classInstance.id);
  return consumables.map(consumable => resolveConsumableForRender(consumable, context));
}
