import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef, useState } from "react";
import { getFsmAction } from "@/config/actions";

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
      // Clear activeAction when finishing/canceling or moving
      activeAction: (action.type === 'FINISH' || action.type === 'CANCEL' || action.type === 'MOVE') ? null : state.activeAction,
    };
  }

  return state;
}

const PlayerStateContext = createContext(null);

export function PlayerStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [castProgress, setCastProgressState] = useState(0);
  const castProgressRef = useRef(0);
  const listenersRef = useRef(new Set());
  const stateRef = useRef(state.current);

  // Wrapper to update both state and ref
  const setCastProgress = useCallback((progress) => {
    castProgressRef.current = progress;
    setCastProgressState(progress);
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

    if (isPressed) {
      // Only update activeAction if the transition is valid
      const currentTransitions = transitions[stateRef.current] || {};
      if (fsmAction in currentTransitions) {
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
  }, [dispatchAction]);

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
    handleInput,
    dispatchAction,
    subscribe,
    is,
    can,
    STATES,
  }), [state, animation, castProgress, setCastProgress, handleInput, dispatchAction, subscribe, is, can]);

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
