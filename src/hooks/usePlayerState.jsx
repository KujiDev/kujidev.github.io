import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef } from "react";
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
    DIE: STATES.DEAD,
  },
  [STATES.ATTACKING]: {
    FINISH: STATES.IDLE,
    CANCEL: STATES.IDLE,
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
};

function reducer(state, action) {
  if (action.type === 'SET_ACTIVE_ACTION') {
    return { ...state, activeAction: action.payload };
  }

  const currentTransitions = transitions[state.current];
  const nextState = currentTransitions?.[action.type];

  if (nextState) {
    return {
      ...state,
      current: nextState,
      previous: state.current,
    };
  }

  return state;
}

const PlayerStateContext = createContext(null);

export function PlayerStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const listenersRef = useRef(new Set());

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
      dispatch({ type: 'SET_ACTIVE_ACTION', payload: inputName });
      dispatchAction(fsmAction);
    } else {
      dispatch({ type: 'SET_ACTIVE_ACTION', payload: null });
      // On release, try to finish or stop
      dispatchAction('FINISH');
      dispatchAction('STOP');
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
    animation,
    handleInput,
    dispatchAction,
    subscribe,
    is,
    can,
    STATES,
  }), [state, animation, handleInput, dispatchAction, subscribe, is, can]);

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
