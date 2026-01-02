import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { ACTIONS } from "@/config/actions";

const STORAGE_KEY = 'player_slotmap';
const VERSION_KEY = 'player_slotmap_version';
const CURRENT_VERSION = 2;

/**
 * Define skill bar slots - these are UI positions, not skills
 * Each slot can hold any action
 * slotType determines what can be dropped here
 */
export const SKILL_SLOTS = [
  { id: 'slot_1', defaultAction: 'skill_1', position: 0, slotType: 'skill' },
  { id: 'slot_2', defaultAction: 'skill_2', position: 1, slotType: 'skill' },
  { id: 'slot_3', defaultAction: 'skill_3', position: 2, slotType: 'skill' },
  { id: 'slot_4', defaultAction: 'skill_4', position: 3, slotType: 'skill' },
];

export const MOUSE_SLOTS = [
  { id: 'slot_lmb', defaultAction: 'primary_attack', position: 4, slotType: 'skill' },
  { id: 'slot_rmb', defaultAction: 'secondary_attack', position: 5, slotType: 'skill' },
];

export const CONSUMABLE_SLOTS = [
  { id: 'slot_consumable_1', defaultAction: 'potion', position: 6, slotType: 'consumable' },
  { id: 'slot_consumable_2', defaultAction: 'food', position: 7, slotType: 'consumable' },
];

export const PIXIE_SLOTS = [
  { id: 'slot_pixie_1', defaultAction: null, position: 8, slotType: 'pixie' },
  { id: 'slot_pixie_2', defaultAction: null, position: 9, slotType: 'pixie' },
  { id: 'slot_pixie_3', defaultAction: null, position: 10, slotType: 'pixie' },
];

export const ALL_SLOTS = [...SKILL_SLOTS, ...MOUSE_SLOTS, ...CONSUMABLE_SLOTS, ...PIXIE_SLOTS];

/**
 * Get the slot type for a given slot ID
 */
export const getSlotType = (slotId) => {
  const slot = ALL_SLOTS.find(s => s.id === slotId);
  return slot?.slotType || null;
};

const getDefaultSlotMap = () => 
  ALL_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = slot.defaultAction;
    return acc;
  }, {});

const saveSlotMap = (slotMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slotMap));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  } catch (e) {
    console.warn('Failed to save slotmap:', e);
  }
};

const loadSlotMap = () => {
  const defaults = getDefaultSlotMap();
  
  try {
    const savedVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (savedVersion !== CURRENT_VERSION) {
      console.log(`SlotMap version changed (${savedVersion} -> ${CURRENT_VERSION}), resetting to defaults`);
      saveSlotMap(defaults);
      return defaults;
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new slots
      const merged = { ...defaults, ...parsed };
      saveSlotMap(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load slotmap:', e);
  }
  
  saveSlotMap(defaults);
  return defaults;
};

const SlotMapContext = createContext(null);

export function SlotMapProvider({ children }) {
  const [slotMap, setSlotMap] = useState(loadSlotMap);

  /**
   * Get the action ID assigned to a slot
   */
  const getActionForSlot = useCallback((slotId) => {
    return slotMap[slotId] || null;
  }, [slotMap]);

  /**
   * Get the full action object for a slot
   */
  const getActionObjectForSlot = useCallback((slotId) => {
    const actionId = slotMap[slotId];
    if (!actionId) return null;
    return Object.values(ACTIONS).find(a => a.id === actionId) || null;
  }, [slotMap]);

  /**
   * Find which slot contains a given action (if any)
   */
  const getSlotForAction = useCallback((actionId) => {
    const entry = Object.entries(slotMap).find(([_, aId]) => aId === actionId);
    return entry ? entry[0] : null;
  }, [slotMap]);

  /**
   * Assign an action to a slot
   * If the action is already in another slot, swap them
   */
  const assignToSlot = useCallback((slotId, actionId) => {
    setSlotMap(prev => {
      const updated = { ...prev };
      
      // Find if this action is already assigned somewhere
      const existingSlot = Object.keys(updated).find(s => updated[s] === actionId);
      
      if (existingSlot && existingSlot !== slotId) {
        // Swap: put the current slot's action into the existing slot
        updated[existingSlot] = prev[slotId];
      }
      
      // Assign the new action to the target slot
      updated[slotId] = actionId;
      
      saveSlotMap(updated);
      return updated;
    });
  }, []);

  /**
   * Swap actions between two slots
   */
  const swapSlots = useCallback((slotA, slotB) => {
    if (slotA === slotB) return;
    
    setSlotMap(prev => {
      const updated = { ...prev };
      const actionA = prev[slotA];
      const actionB = prev[slotB];
      
      updated[slotA] = actionB;
      updated[slotB] = actionA;
      
      saveSlotMap(updated);
      return updated;
    });
  }, []);

  /**
   * Clear a slot (set to null)
   */
  const clearSlot = useCallback((slotId) => {
    setSlotMap(prev => {
      const updated = { ...prev };
      updated[slotId] = null;
      saveSlotMap(updated);
      return updated;
    });
  }, []);

  /**
   * Reset all slots to defaults
   */
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultSlotMap();
    setSlotMap(defaults);
    saveSlotMap(defaults);
  }, []);

  /**
   * Get all assignable actions (skills that can be dragged to slots)
   */
  const getAssignableActions = useCallback(() => {
    // Return all non-consumable actions that make sense in skill slots
    return Object.values(ACTIONS).filter(a => 
      a.type !== 'Consumable' || a.element === 'healing'
    );
  }, []);

  const value = useMemo(() => ({
    slotMap,
    getActionForSlot,
    getActionObjectForSlot,
    getSlotForAction,
    assignToSlot,
    swapSlots,
    clearSlot,
    resetToDefaults,
    getAssignableActions,
    SKILL_SLOTS,
    MOUSE_SLOTS,
    CONSUMABLE_SLOTS,
    ALL_SLOTS,
  }), [
    slotMap,
    getActionForSlot,
    getActionObjectForSlot,
    getSlotForAction,
    assignToSlot,
    swapSlots,
    clearSlot,
    resetToDefaults,
    getAssignableActions,
  ]);

  return (
    <SlotMapContext.Provider value={value}>
      {children}
    </SlotMapContext.Provider>
  );
}

export function useSlotMap() {
  const context = useContext(SlotMapContext);
  // Return null if outside provider (allows for use in Canvas components)
  return context;
}
