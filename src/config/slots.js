/**
 * =============================================================================
 * SLOT SYSTEM
 * =============================================================================
 * 
 * Defines UI slot positions for the skill bar, mouse buttons, consumables, and pixies.
 * Slots are containers - they hold action IDs, not the actions themselves.
 */

// =============================================================================
// SLOT TYPES
// =============================================================================

/**
 * Slot types determine what can be dropped into them.
 */
export const SLOT_TYPES = {
  SKILL: 'skill',           // Skills and attacks
  CONSUMABLE: 'consumable', // Potions, food
  PIXIE: 'pixie',           // Equipped pixies
};

// =============================================================================
// SLOT DEFINITIONS
// =============================================================================

export const SKILL_SLOTS = [
  { id: 'slot_1', defaultAction: 'skill_1', position: 0, slotType: SLOT_TYPES.SKILL },
  { id: 'slot_2', defaultAction: 'skill_2', position: 1, slotType: SLOT_TYPES.SKILL },
  { id: 'slot_3', defaultAction: 'skill_3', position: 2, slotType: SLOT_TYPES.SKILL },
  { id: 'slot_4', defaultAction: 'skill_4', position: 3, slotType: SLOT_TYPES.SKILL },
];

export const MOUSE_SLOTS = [
  { id: 'slot_lmb', defaultAction: 'primary_attack', position: 4, slotType: SLOT_TYPES.SKILL },
  { id: 'slot_rmb', defaultAction: 'secondary_attack', position: 5, slotType: SLOT_TYPES.SKILL },
];

export const CONSUMABLE_SLOTS = [
  { id: 'slot_consumable_1', defaultAction: 'potion', position: 6, slotType: SLOT_TYPES.CONSUMABLE },
  { id: 'slot_consumable_2', defaultAction: 'food', position: 7, slotType: SLOT_TYPES.CONSUMABLE },
];

export const PIXIE_SLOTS = [
  { id: 'slot_pixie_1', defaultAction: 'verdant', position: 8, slotType: SLOT_TYPES.PIXIE },
  { id: 'slot_pixie_2', defaultAction: null, position: 9, slotType: SLOT_TYPES.PIXIE },
  { id: 'slot_pixie_3', defaultAction: null, position: 10, slotType: SLOT_TYPES.PIXIE },
];

// All slots combined (order matters for iteration)
export const ALL_SLOTS = [
  ...SKILL_SLOTS,
  ...MOUSE_SLOTS,
  ...CONSUMABLE_SLOTS,
  ...PIXIE_SLOTS,
];

// Keybindable slots (excludes pixies)
export const KEYBINDABLE_SLOTS = [
  ...SKILL_SLOTS,
  ...MOUSE_SLOTS,
  ...CONSUMABLE_SLOTS,
];

// =============================================================================
// SLOT HELPERS
// =============================================================================

/**
 * Get slot definition by ID
 */
export const getSlotById = (slotId) => 
  ALL_SLOTS.find(s => s.id === slotId) || null;

/**
 * Get the slot type for a given slot ID
 */
export const getSlotType = (slotId) => {
  const slot = getSlotById(slotId);
  return slot?.slotType || null;
};

/**
 * Get default slot map (slot id -> action id)
 */
export const getDefaultSlotMap = () => 
  ALL_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = slot.defaultAction;
    return acc;
  }, {});

// =============================================================================
// SLOT LABELS (for UI)
// =============================================================================

export const SLOT_LABELS = {
  slot_1: 'Skill Slot 1',
  slot_2: 'Skill Slot 2',
  slot_3: 'Skill Slot 3',
  slot_4: 'Skill Slot 4',
  slot_lmb: 'Primary Attack',
  slot_rmb: 'Secondary Attack',
  slot_consumable_1: 'Consumable 1',
  slot_consumable_2: 'Consumable 2',
  slot_pixie_1: 'Pixie Slot 1',
  slot_pixie_2: 'Pixie Slot 2',
  slot_pixie_3: 'Pixie Slot 3',
};
