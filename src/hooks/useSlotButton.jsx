/**
 * =============================================================================
 * useSlotButton - Shared hook for slot button state
 * =============================================================================
 * 
 * Extracts common logic used by SlotButton and MouseSlotButton:
 * - Action resolution from slotMap
 * - Keybind display
 * - Affordability check
 * - Tooltip generation
 * 
 * This DRYs up the slot rendering logic in App.jsx.
 */

import { useMemo } from 'react';
import { usePlayerState, useSlotMap } from '@/hooks/useGame';
import { useKeyMap } from '@/hooks/useKeyMap';
import { useInput } from '@/hooks/useInput';
import { useActionButton } from '@/hooks/useInput';
import { getElementForAction } from '@/config/actions';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build tooltip data from an action object.
 */
export function buildTooltip(action) {
  if (!action) return null;
  const element = getElementForAction(action.id);
  return {
    name: action.label,
    type: action.type,
    element,
    description: action.description,
    manaCost: action.manaCost,
    manaGain: action.manaGain,
    manaPerSecond: action.manaPerSecond,
    healthCost: action.healthCost,
    buff: action.buff,
  };
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check if player can afford an action.
 */
export function useCanAffordAction(action) {
  const { mana, health } = usePlayerState();
  
  if (!action) return false;
  
  const manaCost = action.manaCost ?? 0;
  const healthCost = action.healthCost ?? 0;
  const manaPerSecond = action.manaPerSecond ?? 0;
  
  const requiredMana = manaCost > 0 ? manaCost : manaPerSecond > 0 ? 1 : 0;
  const hasEnoughMana = mana >= requiredMana;
  const hasEnoughHealth = healthCost > 0 ? health > healthCost : true;
  
  return hasEnoughMana && hasEnoughHealth;
}

/**
 * Hook for keyboard-activated slot buttons (Q, W, E, R, D, F keys).
 * Uses useActionButton for keyboard press handling.
 * 
 * @param {string} slotId - The slot ID (e.g., 'slot_1', 'slot_consumable_1')
 * @returns {Object} Slot props ready to spread onto <Slot />
 */
export function useSlotButton(slotId) {
  const { getDisplayKey } = useKeyMap();
  const { getActionObjectForSlot } = useSlotMap();
  
  const action = getActionObjectForSlot(slotId);
  const { active, handlers } = useActionButton(action?.id, slotId);
  const canAfford = useCanAffordAction(action);
  
  // Slot should only be disabled if it has an action the player can't afford
  const isDisabled = action && !canAfford;
  
  const tooltip = useMemo(() => buildTooltip(action), [action]);
  
  return {
    slotId,
    actionId: action?.id,
    keyBind: getDisplayKey(slotId),
    icon: action?.icon,
    active,
    disabled: isDisabled,
    tooltip,
    handlers,
  };
}

/**
 * Hook for mouse-activated slot buttons (LMB, RMB).
 * Uses isSlotActive for mouse press state (no keyboard handling).
 * 
 * @param {string} slotId - The slot ID (e.g., 'slot_lmb', 'slot_rmb')
 * @returns {Object} Slot props ready to spread onto <Slot />
 */
export function useMouseSlotButton(slotId) {
  const { getDisplayKey } = useKeyMap();
  const { getActionObjectForSlot } = useSlotMap();
  const { isSlotActive } = useInput();
  
  const action = getActionObjectForSlot(slotId);
  const canAfford = useCanAffordAction(action);
  const active = isSlotActive(slotId);
  
  // Slot should only be disabled if it has an action the player can't afford
  const isDisabled = action && !canAfford;
  
  const tooltip = useMemo(() => buildTooltip(action), [action]);
  
  return {
    slotId,
    actionId: action?.id,
    keyBind: getDisplayKey(slotId),
    icon: action?.icon,
    active,
    disabled: isDisabled,
    tooltip,
    handlers: {}, // Mouse slots don't have keyboard handlers
  };
}
