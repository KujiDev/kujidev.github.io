/**
 * =============================================================================
 * BASE STATS & GAME CONSTANTS
 * =============================================================================
 * 
 * All numeric game values live here. Balance changes are made in this file only.
 * No magic numbers in components or hooks.
 */

// =============================================================================
// RESOURCE POOLS
// =============================================================================

export const STATS = {
  // Base resource values
  MAX_MANA: 100,
  MAX_HEALTH: 100,
  
  // Regeneration rates (per second)
  MANA_REGEN: 5,
  HEALTH_REGEN: 2,
  
  // Game tick rate for regeneration (ms)
  REGEN_TICK_MS: 100,
};

// =============================================================================
// FSM STATES
// =============================================================================

export const PLAYER_STATES = {
  IDLE: 'idle',
  CASTING: 'casting',
  ATTACKING: 'attacking',
  MOVING: 'moving',
  DEAD: 'dead',
};

// Animation names mapped to states
export const STATE_ANIMATIONS = {
  [PLAYER_STATES.IDLE]: 'Idle',
  [PLAYER_STATES.CASTING]: 'Spell1',
  [PLAYER_STATES.ATTACKING]: 'Staff_Attack',
  [PLAYER_STATES.MOVING]: 'Run',
  [PLAYER_STATES.DEAD]: 'Death',
};

// =============================================================================
// FSM TRANSITIONS
// =============================================================================

/**
 * State machine transitions table.
 * Key: current state
 * Value: { actionType: nextState }
 * 
 * This is the ONLY place state transitions are defined.
 */
export const STATE_TRANSITIONS = {
  [PLAYER_STATES.IDLE]: {
    CAST: PLAYER_STATES.CASTING,
    ATTACK: PLAYER_STATES.ATTACKING,
    MOVE: PLAYER_STATES.MOVING,
    DIE: PLAYER_STATES.DEAD,
  },
  [PLAYER_STATES.CASTING]: {
    FINISH: PLAYER_STATES.IDLE,
    CANCEL: PLAYER_STATES.IDLE,
    CAST: PLAYER_STATES.CASTING,     // Allow interrupting with another cast
    ATTACK: PLAYER_STATES.ATTACKING, // Allow interrupting with attack
    MOVE: PLAYER_STATES.MOVING,      // Allow canceling with movement
    DIE: PLAYER_STATES.DEAD,
  },
  [PLAYER_STATES.ATTACKING]: {
    FINISH: PLAYER_STATES.IDLE,
    CANCEL: PLAYER_STATES.IDLE,
    CAST: PLAYER_STATES.CASTING,
    ATTACK: PLAYER_STATES.ATTACKING,
    MOVE: PLAYER_STATES.MOVING,
    DIE: PLAYER_STATES.DEAD,
  },
  [PLAYER_STATES.MOVING]: {
    STOP: PLAYER_STATES.IDLE,
    CAST: PLAYER_STATES.CASTING,
    ATTACK: PLAYER_STATES.ATTACKING,
    DIE: PLAYER_STATES.DEAD,
  },
  [PLAYER_STATES.DEAD]: {
    REVIVE: PLAYER_STATES.IDLE,
  },
};

// =============================================================================
// FSM ACTION TYPES
// =============================================================================

/**
 * Valid FSM action types that can trigger state transitions.
 * Actions in config/actions.js reference these.
 */
export const FSM_ACTIONS = {
  CAST: 'CAST',       // Starts casting animation
  ATTACK: 'ATTACK',   // Starts attack animation
  MOVE: 'MOVE',       // Starts movement
  STOP: 'STOP',       // Stops movement
  FINISH: 'FINISH',   // Animation completed naturally
  CANCEL: 'CANCEL',   // Animation was cancelled
  DIE: 'DIE',         // Player died
  REVIVE: 'REVIVE',   // Player revived
  INSTANT: 'INSTANT', // Instant actions bypass FSM (consumables)
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a transition is valid
 */
export const canTransition = (currentState, actionType) => {
  const transitions = STATE_TRANSITIONS[currentState];
  return transitions ? actionType in transitions : false;
};

/**
 * Get the next state for a transition
 */
export const getNextState = (currentState, actionType) => {
  const transitions = STATE_TRANSITIONS[currentState];
  return transitions?.[actionType] || null;
};

/**
 * Check if state is a "busy" state (casting/attacking)
 */
export const isBusyState = (state) => 
  state === PLAYER_STATES.CASTING || state === PLAYER_STATES.ATTACKING;
