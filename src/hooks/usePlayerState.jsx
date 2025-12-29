import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef, useState } from "react";
import { getFsmAction, getActionById } from "@/config/actions";

// Helper to check if we should keep activeAction during a transition
const shouldKeepActiveAction = (actionType, activeActionId) => {
  if (actionType === 'MOVE' && activeActionId) {
    const actionConfig = getActionById(activeActionId);
    // Keep activeAction if it's a channeled ability (has manaPerSecond)
    return actionConfig?.manaPerSecond > 0;
  }
  return false;
};

// Resource constants
const MAX_MANA = 100;
const MANA_REGEN_RATE = 5; // Mana per second
const MANA_REGEN_INTERVAL = 100; // ms

// States
export const STATES = {
  IDLE: 'idle',
  CASTING: 'casting',
  ATTACKING: 'attacking',
  MOVING: 'moving',
  DEAD: 'dead',
};

// Map states to animations
export const STATE_ANIMATIONS = {
  [STATES.IDLE]: 'Idle',
  [STATES.CASTING]: 'Spell1',
  [STATES.ATTACKING]: 'Staff_Attack',
  [STATES.MOVING]: 'Run',
  [STATES.DEAD]: 'Death',
};

// Define valid transitions: { [fromState]: { [action]: toState } }
const transitions = {
  [STATES.IDLE]: {
    CAST: STATES.CASTING,
    ATTACK: STATES.ATTACKING,
    MOVE: STATES.MOVING,
    DIE: STATES.DEAD,
  },
  [STATES.CASTING]: {
    FINISH: STATES.IDLE,
    CANCEL: STATES.IDLE,
    CAST: STATES.CASTING,    // Allow interrupting with another cast
    ATTACK: STATES.ATTACKING, // Allow interrupting with attack
    MOVE: STATES.MOVING,      // Allow canceling with movement
    DIE: STATES.DEAD,
  },
  [STATES.ATTACKING]: {
    FINISH: STATES.IDLE,
    CANCEL: STATES.IDLE,
    CAST: STATES.CASTING,    // Allow interrupting with cast
    ATTACK: STATES.ATTACKING, // Allow interrupting with another attack
    MOVE: STATES.MOVING,      // Allow canceling with movement
    DIE: STATES.DEAD,
  },
  [STATES.MOVING]: {
    STOP: STATES.IDLE,
    CAST: STATES.CASTING,
    ATTACK: STATES.ATTACKING,
    DIE: STATES.DEAD,
  },
  [STATES.DEAD]: {
    REVIVE: STATES.IDLE,
  },
};

const initialState = {
  current: STATES.IDLE,
  previous: null,
  activeAction: null, // Track which action triggered the current state
  interruptCounter: 0, // Increments each time an interruption happens
  interruptedAction: null, // Track which action was interrupted
  interruptedProgress: 0, // Track progress at time of interruption
};

function reducer(state, action) {
  if (action.type === 'SET_ACTIVE_ACTION') {
    const actionId = action.payload?.actionId;
    const currentProgress = action.payload?.currentProgress ?? 0;
    
    // Check if we're interrupting an existing cast/attack
    const wasCastingOrAttacking = state.current === STATES.CASTING || state.current === STATES.ATTACKING;
    const isInterruption = wasCastingOrAttacking && state.activeAction && actionId && actionId !== state.activeAction;
    
    return { 
      ...state, 
      activeAction: actionId, 
      interruptCounter: isInterruption ? state.interruptCounter + 1 : state.interruptCounter,
      interruptedAction: isInterruption ? state.activeAction : state.interruptedAction,
      interruptedProgress: isInterruption ? currentProgress : state.interruptedProgress,
    };
  }
  
  if (action.type === 'CLEAR_INTERRUPTED') {
    return { ...state, interruptedAction: null, interruptedProgress: 0 };
  }

  const currentTransitions = transitions[state.current];
  const nextState = currentTransitions?.[action.type];

  if (nextState) {
    // Check if this is an interruption (leaving casting/attacking via movement, not via FINISH)
    const wasCastingOrAttacking = state.current === STATES.CASTING || state.current === STATES.ATTACKING;
    const isMovementInterrupt = wasCastingOrAttacking && action.type === 'MOVE';
    
    return {
      ...state,
      current: nextState,
      previous: state.current,
      interruptCounter: isMovementInterrupt ? state.interruptCounter + 1 : state.interruptCounter,
      interruptedAction: isMovementInterrupt ? state.activeAction : state.interruptedAction,
      interruptedProgress: isMovementInterrupt ? (action.progress ?? state.interruptedProgress) : state.interruptedProgress,
      // Clear activeAction when finishing/canceling, but keep it for channeled movement abilities
      activeAction: (action.type === 'FINISH' || action.type === 'CANCEL') 
        ? null 
        : (action.type === 'MOVE' && !shouldKeepActiveAction('MOVE', state.activeAction)) 
          ? null 
          : state.activeAction,
    };
  }

  return state;
}

const PlayerStateContext = createContext(null);

export function PlayerStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [castProgress, setCastProgressState] = useState(0);
  const [mana, setMana] = useState(MAX_MANA);
  const castProgressRef = useRef(0);
  const manaRef = useRef(MAX_MANA);
  const listenersRef = useRef(new Set());
  const stateRef = useRef(state.current);
  const activeActionRef = useRef(null);
  const heldInputsRef = useRef(new Set()); // Track which inputs are currently held

  // Wrapper to update both state and ref
  const setCastProgress = useCallback((progress) => {
    castProgressRef.current = progress;
    setCastProgressState(progress);
  }, []);

  // Keep mana ref in sync
  useEffect(() => {
    manaRef.current = mana;
  }, [mana]);

  // Keep activeAction ref in sync
  useEffect(() => {
    activeActionRef.current = state.activeAction;
  }, [state.activeAction]);

  // Mana regeneration and drain
  useEffect(() => {
    const interval = setInterval(() => {
      setMana(current => {
        const tickSeconds = MANA_REGEN_INTERVAL / 1000;
        let newMana = current;
        
        // Always regen mana
        newMana += MANA_REGEN_RATE * tickSeconds;
        
        // If we have an active action with manaPerSecond, drain it
        if (activeActionRef.current) {
          const actionConfig = getActionById(activeActionRef.current);
          if (actionConfig?.manaPerSecond) {
            newMana -= actionConfig.manaPerSecond * tickSeconds;
          }
        }
        
        // Clamp between 0 and max
        newMana = Math.max(0, Math.min(MAX_MANA, newMana));
        
        // Update ref immediately for accurate checks
        manaRef.current = newMana;
        
        return newMana;
      });
    }, MANA_REGEN_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  // Stop movement if mana runs out during a manaPerSecond ability
  useEffect(() => {
    if (state.current === STATES.MOVING && state.activeAction && mana <= 0) {
      const actionConfig = getActionById(state.activeAction);
      if (actionConfig?.manaPerSecond) {
        // Force stop - out of mana
        dispatch({ type: 'SET_ACTIVE_ACTION', payload: { actionId: null, currentProgress: 0 } });
        dispatch({ type: 'STOP' });
      }
    }
  }, [mana, state.current, state.activeAction]);

  // Spend mana for a skill (returns true if successful)
  const spendMana = useCallback((amount) => {
    if (amount === 0) return true; // No cost, always succeed
    if (manaRef.current < amount) {
      return false;
    }
    setMana(current => Math.max(0, current - amount));
    manaRef.current = Math.max(0, manaRef.current - amount);
    return true;
  }, []);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state.current;
  }, [state.current]);

  // Subscribe to state changes
  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  // Notify listeners on state change
  useEffect(() => {
    listenersRef.current.forEach(listener => listener(state.current, state.previous));
  }, [state.current, state.previous]);

  // Dispatch FSM action by name
  const dispatchAction = useCallback((actionType) => {
    dispatch({ type: actionType });
  }, []);

  // Handle input press/release from any source
  const handleInput = useCallback((inputName, isPressed) => {
    const fsmAction = getFsmAction(inputName);
    if (!fsmAction) return;

    // Track held state
    if (isPressed) {
      heldInputsRef.current.add(inputName);
    } else {
      heldInputsRef.current.delete(inputName);
    }

    if (isPressed) {
      // Only update activeAction if the transition is valid
      const currentTransitions = transitions[stateRef.current] || {};
      if (fsmAction in currentTransitions) {
        // Check and spend mana
        const actionConfig = getActionById(inputName);
        const manaCost = actionConfig?.manaCost ?? 0;
        
        // spendMana returns false if not enough mana
        if (!spendMana(manaCost)) {
          return;
        }
        
        dispatch({ 
          type: 'SET_ACTIVE_ACTION', 
          payload: { 
            actionId: inputName, 
            currentProgress: castProgressRef.current 
          } 
        });
        dispatchAction(fsmAction);
      }
    } else {
      // For movement, stop immediately on key release
      if (fsmAction === 'MOVE') {
        dispatch({ type: 'SET_ACTIVE_ACTION', payload: { actionId: null, currentProgress: 0 } });
        dispatchAction('STOP');
      }
      // For casting/attacking, let the animation complete (handled in Wizard.jsx)
    }
  }, [dispatchAction, spendMana]);

  // Try to recast the active action if key is still held and has mana
  // Returns true if recast will happen (caller should NOT dispatch FINISH)
  const tryRecast = useCallback(() => {
    const currentAction = state.activeAction;
    if (!currentAction) return false;
    
    // Check if key is still held
    if (!heldInputsRef.current.has(currentAction)) return false;
    
    const fsmAction = getFsmAction(currentAction);
    if (!fsmAction) return false;
    
    // Only recast for CAST and ATTACK actions
    if (fsmAction !== 'CAST' && fsmAction !== 'ATTACK') return false;
    
    const actionConfig = getActionById(currentAction);
    const manaCost = actionConfig?.manaCost ?? 0;
    
    // Check if we have enough mana
    if (!spendMana(manaCost)) return false;
    
    // Reset progress and signal a recast by updating activeAction (triggers animation reset)
    setCastProgress(0);
    dispatch({ 
      type: 'SET_ACTIVE_ACTION', 
      payload: { actionId: currentAction, currentProgress: 0, isRecast: true } 
    });
    
    return true;
  }, [state.activeAction, spendMana, setCastProgress]);

  // Check helpers
  const is = useCallback((stateName) => state.current === stateName, [state.current]);
  
  const can = useCallback((actionName) => {
    const currentTransitions = transitions[state.current] || {};
    return actionName.toUpperCase() in currentTransitions;
  }, [state.current]);

  // Get current animation name
  const animation = STATE_ANIMATIONS[state.current] || STATE_ANIMATIONS[STATES.IDLE];

  const value = useMemo(() => ({
    state: state.current,
    previousState: state.previous,
    activeAction: state.activeAction,
    interruptCounter: state.interruptCounter,
    interruptedAction: state.interruptedAction,
    interruptedProgress: state.interruptedProgress,
    animation,
    castProgress,
    setCastProgress,
    mana,
    maxMana: MAX_MANA,
    handleInput,
    dispatchAction,
    tryRecast,
    subscribe,
    is,
    can,
    STATES,
  }), [state, animation, castProgress, setCastProgress, mana, handleInput, dispatchAction, tryRecast, subscribe, is, can]);

  return (
    <PlayerStateContext.Provider value={value}>
      {children}
    </PlayerStateContext.Provider>
  );
}

export function usePlayerState() {
  const context = useContext(PlayerStateContext);
  if (!context) {
    throw new Error('usePlayerState must be used within a PlayerStateProvider');
  }
  return context;
}

/**
 * Hook to run effects when entering/leaving specific states.
 */
export function useStateEffect(targetState, onEnter, onLeave) {
  const { state, previousState, subscribe } = usePlayerState();
  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);

  // Keep refs up to date
  useEffect(() => {
    onEnterRef.current = onEnter;
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    // Check initial state
    if (state === targetState) {
      onEnterRef.current?.();
    }

    return subscribe((current, previous) => {
      if (current === targetState && previous !== targetState) {
        onEnterRef.current?.();
      }
      if (previous === targetState && current !== targetState) {
        onLeaveRef.current?.();
      }
    });
  }, [targetState, subscribe, state]);
}
