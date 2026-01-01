import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { usePlayerState } from "@/hooks/usePlayerState";

const InputContext = createContext(null);

export function InputProvider({ children }) {
  const [activeInputs, setActiveInputs] = useState({});
  
  const [uiPresses, setUiPresses] = useState({});

  const pressAction = useCallback((actionId) => {
    setActiveInputs(prev => ({ ...prev, [actionId]: true }));
    setUiPresses(prev => ({ ...prev, [actionId]: true }));
  }, []);

  const releaseAction = useCallback((actionId) => {
    setActiveInputs(prev => ({ ...prev, [actionId]: false }));
    setUiPresses(prev => ({ ...prev, [actionId]: false }));
  }, []);

  const isActive = useCallback((actionId) => {
    return !!activeInputs[actionId];
  }, [activeInputs]);

  const isUiTriggered = useCallback((actionId) => {
    return !!uiPresses[actionId];
  }, [uiPresses]);

  const syncKeyboardState = useCallback((actionId, isPressed) => {
    setActiveInputs(prev => {
      // Don't override UI presses with keyboard state
      if (prev[actionId] === isPressed) return prev;
      return { ...prev, [actionId]: isPressed };
    });
  }, []);

  const value = useMemo(() => ({
    activeInputs,
    pressAction,
    releaseAction,
    isActive,
    isUiTriggered,
    syncKeyboardState,
  }), [activeInputs, pressAction, releaseAction, isActive, isUiTriggered, syncKeyboardState]);

  return (
    <InputContext.Provider value={value}>
      {children}
    </InputContext.Provider>
  );
}

export function KeyboardSync() {
  const { syncKeyboardState } = useInput();
  
  // Subscribe to slot-based keyboard state
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

export function useActionButton(actionId, slotId = null) {
  const { isActive, pressAction, releaseAction } = useInput();
  const { handleInput } = usePlayerState();
  // Use slotId for keyboard state if provided, otherwise fall back to actionId
  const keyboardStateKey = slotId || actionId;
  const keyboardState = useKeyboardControls((state) => state[keyboardStateKey]);
  
  // Track if currently in a touch interaction to prevent mouse events from double-firing
  const isTouchingRef = useRef(false);
  const pressedRef = useRef(false);
  const active = isActive(actionId) || keyboardState;

  const doPress = useCallback(() => {
    if (!pressedRef.current) {
      pressedRef.current = true;
      pressAction(actionId);
      handleInput(actionId, true);
    }
  }, [actionId, pressAction, handleInput]);

  const doRelease = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      releaseAction(actionId);
      handleInput(actionId, false);
    }
  }, [actionId, releaseAction, handleInput]);

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
