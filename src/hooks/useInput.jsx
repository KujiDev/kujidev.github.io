import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { usePlayerState } from "@/hooks/useGame";

const InputContext = createContext(null);

/**
 * Input Provider - tracks SLOT press states, not action IDs.
 * 
 * Each slot has its own independent pressed state.
 * This prevents the bug where clicking one slot highlights all slots
 * that share the same action.
 */
export function InputProvider({ children }) {
  // Track which SLOTS are pressed (not actions)
  const [activeSlots, setActiveSlots] = useState({});

  const pressSlot = useCallback((slotId) => {
    setActiveSlots(prev => ({ ...prev, [slotId]: true }));
  }, []);

  const releaseSlot = useCallback((slotId) => {
    setActiveSlots(prev => ({ ...prev, [slotId]: false }));
  }, []);

  const isSlotActive = useCallback((slotId) => {
    return !!activeSlots[slotId];
  }, [activeSlots]);

  const syncKeyboardState = useCallback((slotId, isPressed) => {
    setActiveSlots(prev => {
      if (prev[slotId] === isPressed) return prev;
      return { ...prev, [slotId]: isPressed };
    });
  }, []);

  const value = useMemo(() => ({
    activeSlots,
    pressSlot,
    releaseSlot,
    isSlotActive,
    syncKeyboardState,
  }), [activeSlots, pressSlot, releaseSlot, isSlotActive, syncKeyboardState]);

  return (
    <InputContext.Provider value={value}>
      {children}
    </InputContext.Provider>
  );
}

export function KeyboardSync() {
  const { syncKeyboardState } = useInput();
  
  // Subscribe to slot-based keyboard state (mouse buttons handled separately in Target component)
  const slot1 = useKeyboardControls((state) => state.slot_1);
  const slot2 = useKeyboardControls((state) => state.slot_2);
  const slot3 = useKeyboardControls((state) => state.slot_3);
  const slot4 = useKeyboardControls((state) => state.slot_4);
  const slotC1 = useKeyboardControls((state) => state.slot_consumable_1);
  const slotC2 = useKeyboardControls((state) => state.slot_consumable_2);

  useEffect(() => { syncKeyboardState('slot_1', slot1); }, [slot1, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('slot_2', slot2); }, [slot2, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('slot_3', slot3); }, [slot3, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('slot_4', slot4); }, [slot4, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('slot_consumable_1', slotC1); }, [slotC1, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('slot_consumable_2', slotC2); }, [slotC2, syncKeyboardState]);

  return null;
}

export function useInput() {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error('useInput must be used within an InputProvider');
  }
  return context;
}

/**
 * Hook for action button UI components.
 * 
 * CRITICAL: This hook tracks by SLOT ID, not action ID.
 * - `slotId` determines highlighting (which button looks pressed)
 * - `actionId` determines what action executes
 * 
 * This separation ensures that if multiple slots have the same action,
 * only the pressed slot highlights.
 */
export function useActionButton(actionId, slotId) {
  const { isSlotActive, pressSlot, releaseSlot } = useInput();
  const { handleInput } = usePlayerState();
  
  // slotId is REQUIRED for proper highlighting
  if (!slotId) {
    console.warn('useActionButton: slotId is required for proper highlighting');
  }
  
  // Listen for keyboard state on THIS slot
  const keyboardState = useKeyboardControls((state) => state[slotId]);
  
  // Track if currently in a touch interaction to prevent mouse events from double-firing
  const isTouchingRef = useRef(false);
  const pressedRef = useRef(false);
  
  // Active state is based on SLOT, not action
  const active = isSlotActive(slotId) || keyboardState;

  // Press visual feedback is decoupled from action execution
  // Slot shows "pressed" even without a skill assigned
  const doPress = useCallback(() => {
    if (!pressedRef.current) {
      pressedRef.current = true;
      pressSlot(slotId);
      if (actionId) handleInput(actionId, true);
    }
  }, [actionId, slotId, pressSlot, handleInput]);

  const doRelease = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      releaseSlot(slotId);
      if (actionId) handleInput(actionId, false);
    }
  }, [actionId, slotId, releaseSlot, handleInput]);

  const handlers = useMemo(() => ({
    // Mouse events - only fire if not in touch mode
    onMouseDown: () => {
      if (!isTouchingRef.current) {
        doPress();
      }
    },
    onMouseUp: () => {
      if (!isTouchingRef.current) {
        doRelease();
      }
    },
    onMouseLeave: () => {
      if (!isTouchingRef.current) {
        doRelease();
      }
    },
    
    // Touch events - set touch mode and handle
    onTouchStart: (e) => {
      e.preventDefault();
      e.stopPropagation();
      isTouchingRef.current = true;
      doPress();
    },
    onTouchEnd: (e) => {
      e.preventDefault();
      e.stopPropagation();
      doRelease();
      // Reset touch mode after a delay to ignore synthetic mouse events
      setTimeout(() => {
        isTouchingRef.current = false;
      }, 300);
    },
    onTouchCancel: (e) => {
      e.preventDefault();
      e.stopPropagation();
      doRelease();
      setTimeout(() => {
        isTouchingRef.current = false;
      }, 300);
    },
    
    // Keyboard events for accessibility
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doPress();
      }
    },
    onKeyUp: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doRelease();
      }
    },
    
    // Prevent context menu on long press
    onContextMenu: (e) => e.preventDefault(),
  }), [doPress, doRelease]);

  return { active, handlers };
}
