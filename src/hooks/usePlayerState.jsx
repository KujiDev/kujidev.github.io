import { createContext, useContext, useReducer, useCallback, useMemo } from "react";

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

// Map input names to actions
const INPUT_TO_ACTION = {
  skill_1: 'ATTACK',
  skill_2: 'CAST',
  skill_3: 'MOVE',
  skill_4: 'ATTACK',
};

const initialState = {
  current: STATES.IDLE,
  previous: null,
};

function reducer(state, action) {
  const currentTransitions = transitions[state.current];
  const nextState = currentTransitions?.[action.type];

  if (nextState) {
    return {
      current: nextState,
      previous: state.current,
    };
  }

  return state;
}

const PlayerStateContext = createContext(null);

export function PlayerStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Dispatch action by name
  const dispatchAction = useCallback((actionType) => {
    dispatch({ type: actionType });
  }, []);

  // Handle input press/release
  const handleInput = useCallback((inputName, isPressed) => {
    const actionType = INPUT_TO_ACTION[inputName];
    if (!actionType) return;

    if (isPressed) {
      dispatchAction(actionType);
    } else {
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
    animation,
    handleInput,
    is,
    can,
    STATES,
  }), [state, animation, handleInput, is, can]);

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
