import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { usePlayerState } from "@/hooks/usePlayerState";

const InputContext = createContext(null);

/**
 * Unified input handling for both keyboard and UI button presses.
 * Tracks which actions are currently active and provides a clean API
 * for the rest of the app to consume.
 */
export function InputProvider({ children }) {
  // Track active state for each action (true = pressed)
  const [activeInputs, setActiveInputs] = useState({});
  
  // Track UI-triggered presses separately (for cases where we need to distinguish)
  const [uiPresses, setUiPresses] = useState({});

  // Press an action (from UI button)
  const pressAction = useCallback((actionId) => {
    setActiveInputs(prev => ({ ...prev, [actionId]: true }));
    setUiPresses(prev => ({ ...prev, [actionId]: true }));
  }, []);

  // Release an action (from UI button)
  const releaseAction = useCallback((actionId) => {
    setActiveInputs(prev => ({ ...prev, [actionId]: false }));
    setUiPresses(prev => ({ ...prev, [actionId]: false }));
  }, []);

  // Check if an action is currently active
  const isActive = useCallback((actionId) => {
    return !!activeInputs[actionId];
  }, [activeInputs]);

  // Check if action was triggered from UI
  const isUiTriggered = useCallback((actionId) => {
    return !!uiPresses[actionId];
  }, [uiPresses]);

  // Update from keyboard state (called by KeyboardSync component)
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

/**
 * Syncs drei's KeyboardControls state with our unified input system.
 * Must be rendered inside KeyboardControls.
 */
export function KeyboardSync() {
  const { syncKeyboardState } = useInput();
  
  // Subscribe to each action's keyboard state
  const skill1 = useKeyboardControls((state) => state.skill_1);
  const skill2 = useKeyboardControls((state) => state.skill_2);
  const skill3 = useKeyboardControls((state) => state.skill_3);
  const skill4 = useKeyboardControls((state) => state.skill_4);
  const skill5 = useKeyboardControls((state) => state.skill_5);

  useEffect(() => { syncKeyboardState('skill_1', skill1); }, [skill1, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('skill_2', skill2); }, [skill2, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('skill_3', skill3); }, [skill3, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('skill_4', skill4); }, [skill4, syncKeyboardState]);
  useEffect(() => { syncKeyboardState('skill_5', skill5); }, [skill5, syncKeyboardState]);

  return null;
}

/**
 * Hook to access input state and actions.
 */
export function useInput() {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error('useInput must be used within an InputProvider');
  }
  return context;
}

/**
 * Hook for use with skill bar buttons.
 * Returns handlers and state for a specific action.
 * Handles both touch and mouse input without conflicts.
 */
export function useActionButton(actionId) {
  const { isActive, pressAction, releaseAction } = useInput();
  const { handleInput } = usePlayerState();
  const keyboardState = useKeyboardControls((state) => state[actionId]);
  
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
