/**
 * =============================================================================
 * RENDER REGISTRY - Component Lookup by Entity Type
 * =============================================================================
 * 
 * This is the ONLY bridge between data types and React components.
 * 
 * React never decides what to render - it looks up which component
 * matches the data type from this registry.
 * 
 * USAGE:
 * ======
 * import { getComponentForType } from '@/render/registry';
 * 
 * const Component = getComponentForType('skill-icon');
 * return <Component {...resolvedProps} />;
 */

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * Registry of data types to component paths.
 * Components are lazy-loaded to avoid circular dependencies.
 */
const COMPONENT_REGISTRY = {
  // Entity icons
  'skill-icon': () => import('@/components/SkillBar').then(m => m.SkillIcon),
  'pixie-icon': () => import('@/components/Pixies').then(m => m.PixieIcon),
  'consumable-icon': () => import('@/components/Consumables').then(m => m.ConsumableIcon),
  
  // Slots
  'skill-slot': () => import('@/components/SkillBar').then(m => m.Slot),
  'pixie-slot': () => import('@/components/Pixies').then(m => m.PixieSlot),
  'consumable-slot': () => import('@/components/SkillBar').then(m => m.Slot),
  
  // Cards (for menus/drawers)
  'skill-card': () => import('@/components/SpellBook').then(m => m.SpellCard),
  'pixie-card': () => import('@/components/Pixies').then(m => m.PixieCard),
  'consumable-card': () => import('@/components/Consumables').then(m => m.ConsumableCard),
  
  // Effects (3D)
  'projectile-ice': () => import('@/components/IceShard').then(m => m.default),
  'projectile-fire': () => import('@/components/Meteor').then(m => m.default),
  'effect-shield': () => import('@/components/ManaShield').then(m => m.default),
  'effect-heal': () => import('@/components/HealingParticles').then(m => m.default),
  
  // UI bars
  'casting-bar': () => import('@/components/CastingBar').then(m => m.default),
  'buff-bar': () => import('@/components/BuffBar').then(m => m.default),
  'health-orb': () => import('@/components/Orb').then(m => m.HealthOrb),
  'mana-orb': () => import('@/components/Orb').then(m => m.ManaOrb),
};

// Cache for resolved components
const componentCache = new Map();

/**
 * Get a component for a data type.
 * Returns null if type is not registered.
 * 
 * @param {string} type - The data type
 * @returns {Promise<React.ComponentType | null>}
 */
export async function getComponentForType(type) {
  if (componentCache.has(type)) {
    return componentCache.get(type);
  }
  
  const loader = COMPONENT_REGISTRY[type];
  if (!loader) {
    console.warn(`[Registry] Unknown component type: ${type}`);
    return null;
  }
  
  try {
    const Component = await loader();
    componentCache.set(type, Component);
    return Component;
  } catch (e) {
    console.error(`[Registry] Failed to load component for type "${type}":`, e);
    return null;
  }
}

/**
 * Synchronously get a cached component.
 * Returns null if not yet loaded.
 * 
 * @param {string} type - The data type
 * @returns {React.ComponentType | null}
 */
export function getCachedComponent(type) {
  return componentCache.get(type) || null;
}

/**
 * Preload components for a list of types.
 * Useful for eager loading during app init.
 * 
 * @param {string[]} types - Types to preload
 */
export async function preloadComponents(types) {
  await Promise.all(types.map(type => getComponentForType(type)));
}

/**
 * Get all registered types.
 * 
 * @returns {string[]}
 */
export function getRegisteredTypes() {
  return Object.keys(COMPONENT_REGISTRY);
}

// =============================================================================
// DRAG TYPE MAPPING
// =============================================================================

/**
 * Map drag types to accepted slot types.
 */
export const DRAG_TYPE_TO_SLOT_TYPE = Object.freeze({
  'skill': ['skill-slot'],
  'consumable': ['consumable-slot'],
  'pixie': ['pixie-slot'],
});

/**
 * Check if a drag type can drop on a slot type.
 * 
 * @param {string} dragType - The drag type
 * @param {string} slotType - The slot type
 * @returns {boolean}
 */
export function canDropOnSlot(dragType, slotType) {
  const accepted = DRAG_TYPE_TO_SLOT_TYPE[dragType];
  return accepted?.includes(slotType) ?? false;
}
