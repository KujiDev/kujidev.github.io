import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getFsmAction, getActionById } from "@/config/actions";
import { usePixies } from "@/hooks/usePixies";

// Helper to check if we should keep activeAction during a transition
const shouldKeepActiveAction = (actionType, activeActionId) => {
  if (actionType === 'MOVE' && activeActionId) {
    const actionConfig = getActionById(activeActionId);
    // Keep activeAction if it's a channeled ability (has manaPerSecond)
    return actionConfig?.manaPerSecond > 0;
  }
  return false;
};

const MAX_MANA = 100;
const MAX_HEALTH = 100;
const MANA_REGEN_RATE = 5; // Mana per second
const HEALTH_REGEN_RATE = 2; // Health per second
const REGEN_INTERVAL = 100; // ms

export const STATES = {
  IDLE: 'idle',
  CASTING: 'casting',
  ATTACKING: 'attacking',
  MOVING: 'moving',
  DEAD: 'dead',
};

export const STATE_ANIMATIONS = {
  [STATES.IDLE]: 'Idle',
  [STATES.CASTING]: 'Spell1',
  [STATES.ATTACKING]: 'Staff_Attack',
  [STATES.MOVING]: 'Run',
  [STATES.DEAD]: 'Death',
};

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
  completedAction: null, // Track the action that just completed (for applying buffs)
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
  
  if (action.type === 'CLEAR_COMPLETED') {
    return { ...state, completedAction: null };
  }

  const currentTransitions = transitions[state.current];
  const nextState = currentTransitions?.[action.type];

  if (nextState) {
    // Check if this is an interruption (any action that cancels an in-progress cast/attack)
    const wasCastingOrAttacking = state.current === STATES.CASTING || state.current === STATES.ATTACKING;
    const isFinish = action.type === 'FINISH';
    const isCancel = action.type === 'CANCEL' || action.type === 'STOP';
    
    // Any non-finish action during casting/attacking is an interrupt (MOVE, CAST, ATTACK switching to different action)
    const isDifferentAction = action.actionId && action.actionId !== state.activeAction;
    const isInterrupt = wasCastingOrAttacking && !isFinish && !isCancel && 
      (action.type === 'MOVE' || isDifferentAction);
    
    // Get the actionId from the action payload (passed with the FSM action)
    const newActionId = action.actionId ?? state.activeAction;
    
    // Determine if we should keep the active action
    const shouldKeep = action.type === 'MOVE' 
      ? shouldKeepActiveAction('MOVE', newActionId)
      : true;
    
    const finalActiveAction = (action.type === 'FINISH' || action.type === 'CANCEL' || action.type === 'STOP') 
      ? null 
      : (action.type === 'MOVE' && !shouldKeep)
        ? null 
        : newActionId;
    
    return {
      ...state,
      current: nextState,
      previous: state.current,
      // Capture completed action on FINISH for buff application
      completedAction: isFinish ? state.activeAction : null,
      interruptCounter: isInterrupt ? state.interruptCounter + 1 : state.interruptCounter,
      interruptedAction: isInterrupt ? state.activeAction : state.interruptedAction,
      interruptedProgress: isInterrupt ? (action.progress ?? state.interruptedProgress) : state.interruptedProgress,
      // Clear activeAction when finishing/canceling/stopping, but keep it for channeled movement abilities
      activeAction: finalActiveAction,
    };
  }

  return state;
}

const PlayerStateContext = createContext(null);

export function PlayerStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [castProgress, setCastProgressState] = useState(0);
  const [mana, setMana] = useState(MAX_MANA);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [buffs, setBuffs] = useState([]);
  const castProgressRef = useRef(0);
  const lastUIUpdateRef = useRef(0);
  const manaRef = useRef(MAX_MANA);
  const healthRef = useRef(MAX_HEALTH);
  const buffsRef = useRef([]);
  const listenersRef = useRef(new Set());
  const stateRef = useRef(state.current);
  const activeActionRef = useRef(null);
  const heldInputsRef = useRef(new Set());
  const clickTriggeredRef = useRef(false);
  const handleInputRef = useRef(null);
  
  // Get pixie buffs (passive bonuses from equipped pixies)
  const { activeBuffs: pixieBuffs } = usePixies();

  // Throttled setter - only updates React state every 50ms to reduce re-renders
  // 3D components read castProgressRef directly in useFrame
  const setCastProgress = useCallback((progress) => {
    castProgressRef.current = progress;
    
    const now = performance.now();
    // Throttle UI updates to ~20fps (50ms) - 3D components use ref directly
    if (now - lastUIUpdateRef.current > 50) {
      lastUIUpdateRef.current = now;
      setCastProgressState(progress);
    }
  }, []);
  
  // Force UI sync when cast ends (progress = 0 or 1)
  const syncCastProgressUI = useCallback(() => {
    setCastProgressState(castProgressRef.current);
  }, []);

  useEffect(() => {
    manaRef.current = mana;
  }, [mana]);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  useEffect(() => {
    buffsRef.current = buffs;
  }, [buffs]);

  useEffect(() => {
    activeActionRef.current = state.activeAction;
  }, [state.activeAction]);

  const getBuffManaRegenBonus = useCallback(() => {
    let bonus = 0;
    const now = Date.now();
    for (const buff of buffsRef.current) {
      if (buff.expiresAt > now && buff.manaRegenBonus) {
        bonus += buff.manaRegenBonus;
      }
    }
    // Add pixie mana regen bonus
    bonus += pixieBuffs?.manaRegen || 0;
    return bonus;
  }, [pixieBuffs?.manaRegen]);

  const getBuffHealthRegenBonus = useCallback(() => {
    let bonus = 0;
    const now = Date.now();
    for (const buff of buffsRef.current) {
      if (buff.expiresAt > now && buff.healthRegenBonus) {
        bonus += buff.healthRegenBonus;
      }
    }
    // Add pixie health regen bonus
    bonus += pixieBuffs?.healthRegen || 0;
    return bonus;
  }, [pixieBuffs?.healthRegen]);
  
  // Calculate effective max health/mana including pixie bonuses
  const effectiveMaxMana = MAX_MANA + (pixieBuffs?.maxMana || 0);
  const effectiveMaxHealth = MAX_HEALTH + (pixieBuffs?.maxHealth || 0);

  const getManaDrainRate = useCallback(() => {
    const activeAction = activeActionRef.current;
    if (activeAction) {
      const actionConfig = getActionById(activeAction);
      if (actionConfig?.manaPerSecond) {
        return actionConfig.manaPerSecond;
      }
    }
    return 0;
  }, []);

  // Single consolidated game tick: handles mana/health regen + buff expiration
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const tickSeconds = REGEN_INTERVAL / 1000;
      
      // Mana regeneration
      setMana(current => {
        let newMana = current;
        
        const totalRegen = MANA_REGEN_RATE + getBuffManaRegenBonus();
        newMana += totalRegen * tickSeconds;
        
        const activeAction = activeActionRef.current;
        if (activeAction) {
          const actionConfig = getActionById(activeAction);
          if (actionConfig?.manaPerSecond) {
            newMana -= actionConfig.manaPerSecond * tickSeconds;
          }
        }
        
        newMana = Math.max(0, Math.min(effectiveMaxMana, newMana));
        manaRef.current = newMana;
        
        return newMana;
      });
      
      // Health regeneration
      setHealth(current => {
        const totalRegen = HEALTH_REGEN_RATE + getBuffHealthRegenBonus();
        let newHealth = current + (totalRegen * tickSeconds);
        newHealth = Math.max(0, Math.min(effectiveMaxHealth, newHealth));
        healthRef.current = newHealth;
        return newHealth;
      });
      
      // Buff expiration check
      setBuffs(current => {
        const active = current.filter(b => b.expiresAt > now);
        if (active.length !== current.length) {
          buffsRef.current = active;
          return active;
        }
        return current;
      });
    }, REGEN_INTERVAL);
    
    return () => clearInterval(interval);
  }, [getBuffManaRegenBonus, getBuffHealthRegenBonus, effectiveMaxMana, effectiveMaxHealth]);

  // Stop movement if mana runs out during a manaPerSecond ability
  useEffect(() => {
    if (state.current === STATES.MOVING && state.activeAction && mana <= 0) {
      const actionConfig = getActionById(state.activeAction);
      if (actionConfig?.manaPerSecond) {
        dispatch({ type: 'STOP', actionId: null });
      }
    }
  }, [mana, state.current, state.activeAction]);

  const spendMana = useCallback((amount) => {
    if (amount === 0) return true; // No cost, always succeed
    if (manaRef.current < amount) {
      return false;
    }
    setMana(current => Math.max(0, current - amount));
    manaRef.current = Math.max(0, manaRef.current - amount);
    return true;
  }, []);

  const spendHealth = useCallback((amount) => {
    if (amount === 0) return true;
    if (healthRef.current <= amount) {
      return false; // Can't kill yourself with health cost
    }
    setHealth(current => Math.max(1, current - amount));
    healthRef.current = Math.max(1, healthRef.current - amount);
    return true;
  }, []);

  const applyBuff = useCallback((buffConfig) => {
    if (!buffConfig) return;
    
    const now = Date.now();
    const newBuff = {
      id: buffConfig.id,
      name: buffConfig.name,
      icon: buffConfig.icon,
      duration: buffConfig.duration,
      expiresAt: now + (buffConfig.duration * 1000),
      manaRegenBonus: buffConfig.manaRegenBonus || 0,
      healthRegenBonus: buffConfig.healthRegenBonus || 0,
    };
    
    setBuffs(current => {
      // Replace existing buff of same id (refresh duration)
      const filtered = current.filter(b => b.id !== buffConfig.id);
      const updated = [...filtered, newBuff];
      buffsRef.current = updated;
      return updated;
    });
  }, []);

  const gainMana = useCallback((amount) => {
    setMana(current => Math.min(MAX_MANA, current + amount));
    manaRef.current = Math.min(MAX_MANA, manaRef.current + amount);
  }, []);

  useEffect(() => {
    if (state.completedAction) {
      const actionConfig = getActionById(state.completedAction);
      if (actionConfig?.buff) {
        applyBuff(actionConfig.buff);
      }
      if (actionConfig?.manaGain) {
        gainMana(actionConfig.manaGain);
      }
      dispatch({ type: 'CLEAR_COMPLETED' });
    }
  }, [state.completedAction, applyBuff, gainMana]);

  // Sync refs before paint to prevent stale reads in event handlers
  useLayoutEffect(() => {
    stateRef.current = state.current;
  }, [state.current]);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    listenersRef.current.forEach(listener => listener(state.current, state.previous));
  }, [state.current, state.previous]);

  const dispatchAction = useCallback((actionType) => {
    dispatch({ type: actionType });
  }, []);

  // Handle input press/release from any source
  // isClick: true = single click (no recast), false/undefined = can be held for recast
  const handleInput = useCallback((inputName, isPressed, isClick = false) => {
    // Track held state FIRST - before any early returns
    // This ensures release events always clear the held state
    if (isPressed) {
      heldInputsRef.current.add(inputName);
    } else {
      heldInputsRef.current.delete(inputName);
    }

    const fsmAction = getFsmAction(inputName);
    if (!fsmAction) return;

    if (isPressed) {
      // Mark if this action was triggered by a click (single fire, no recast)
      clickTriggeredRef.current = isClick;

      // Handle INSTANT actions (like potions) - they bypass the FSM
      if (fsmAction === 'INSTANT') {
        const actionConfig = getActionById(inputName);
        const manaCost = actionConfig?.manaCost ?? 0;
        const healthCost = actionConfig?.healthCost ?? 0;
        
        // Check and spend resources
        if (healthCost > 0 && !spendHealth(healthCost)) return;
        if (manaCost > 0 && !spendMana(manaCost)) return;
        
        // Apply the buff immediately
        if (actionConfig?.buff) {
          applyBuff(actionConfig.buff);
        }
        return;
      }
      
      // Only update activeAction if the transition is valid
      const currentTransitions = transitions[stateRef.current] || {};
      if (fsmAction in currentTransitions) {
        const actionConfig = getActionById(inputName);
        const manaCost = actionConfig?.manaCost ?? 0;
        const healthCost = actionConfig?.healthCost ?? 0;
        
        // Check and spend health cost first (if any)
        if (healthCost > 0) {
          if (!spendHealth(healthCost)) {
            return;
          }
        }
        
        // Check and spend mana cost
        if (manaCost > 0) {
          if (!spendMana(manaCost)) {
            return;
          }
        }
        
        // Note: Buffs are applied on action completion (FINISH), not on start
        
        // Dispatch FSM action with actionId included (atomic update)
        dispatch({ 
          type: fsmAction, 
          actionId: inputName,
          progress: castProgressRef.current 
        });
      }
    } else {
      // For movement, stop immediately on key release
      if (fsmAction === 'MOVE') {
        dispatch({ type: 'STOP', actionId: null });
      }
      // For casting/attacking, let the animation complete (handled in Wizard.jsx)
    }
  }, [dispatchAction, spendMana, spendHealth, applyBuff]);

  // Keep handleInput ref up to date for global event listeners
  useEffect(() => {
    handleInputRef.current = handleInput;
  }, [handleInput]);

  // Track which action was triggered by which mouse button
  const mouseButtonActionsRef = useRef({ 0: null, 2: null }); // LMB=0, RMB=2

  // Global mouseup listener to ensure mouse button releases are always captured
  // This properly clears the actual action that was triggered by that mouse button
  useEffect(() => {
    const onGlobalMouseUp = (e) => {
      const action = mouseButtonActionsRef.current[e.button];
      if (action) {
        heldInputsRef.current.delete(action);
        mouseButtonActionsRef.current[e.button] = null;
      }
    };
    
    // Use capture phase to ensure we get the event first
    document.addEventListener('mouseup', onGlobalMouseUp, true);
    return () => document.removeEventListener('mouseup', onGlobalMouseUp, true);
  }, []);

  // Try to recast the active action if key is still held and has mana
  // Returns true if recast will happen (caller should NOT dispatch FINISH)
  const tryRecast = useCallback(() => {
    const currentAction = state.activeAction;
    if (!currentAction) return false;
    
    // If action was triggered by a click (not hold), don't recast
    if (clickTriggeredRef.current) {
      clickTriggeredRef.current = false; // Reset for next action
      return false;
    }
    
    // Check if key is still held
    if (!heldInputsRef.current.has(currentAction)) return false;
    
    const fsmAction = getFsmAction(currentAction);
    if (!fsmAction) return false;
    
    // Only recast for CAST and ATTACK actions
    if (fsmAction !== 'CAST' && fsmAction !== 'ATTACK') return false;
    
    const actionConfig = getActionById(currentAction);
    const manaCost = actionConfig?.manaCost ?? 0;
    const healthCost = actionConfig?.healthCost ?? 0;
    
    // Check and spend health cost first
    if (healthCost > 0 && !spendHealth(healthCost)) return false;
    
    // Check and spend mana cost
    if (manaCost > 0 && !spendMana(manaCost)) return false;
    
    // Apply mana gain on each successful hit (recast)
    if (actionConfig?.manaGain) {
      gainMana(actionConfig.manaGain);
    }
    
    // Note: Buff is applied via completedAction effect when first cast finishes
    // Recasts don't re-apply the buff (just refresh if they go through FINISH)
    
    // Reset progress and signal a recast
    setCastProgress(0);
    // For recast, we stay in the same state so we just update activeAction directly
    activeActionRef.current = currentAction;
    
    return true;
  }, [state.activeAction, spendMana, spendHealth, gainMana, setCastProgress]);

  const is = useCallback((stateName) => state.current === stateName, [state.current]);
  
  const can = useCallback((actionName) => {
    const currentTransitions = transitions[state.current] || {};
    return actionName.toUpperCase() in currentTransitions;
  }, [state.current]);

  // Get current animation name
  const animation = STATE_ANIMATIONS[state.current] || STATE_ANIMATIONS[STATES.IDLE];

  // Calculate regen info for tooltips - recalculates when buffs, pixieBuffs, or activeAction change
  const regenInfo = useMemo(() => {
    const now = Date.now();
    
    // Calculate buff bonuses directly from buffs state
    let manaBuffBonus = 0;
    let healthBuffBonus = 0;
    for (const buff of buffs) {
      if (buff.expiresAt > now) {
        if (buff.manaRegenBonus) manaBuffBonus += buff.manaRegenBonus;
        if (buff.healthRegenBonus) healthBuffBonus += buff.healthRegenBonus;
      }
    }
    
    // Add pixie passive buffs
    manaBuffBonus += pixieBuffs?.manaRegen || 0;
    healthBuffBonus += pixieBuffs?.healthRegen || 0;
    
    // Calculate drain from activeAction
    let manaDrain = 0;
    if (state.activeAction) {
      const actionConfig = getActionById(state.activeAction);
      if (actionConfig?.manaPerSecond) {
        manaDrain = actionConfig.manaPerSecond;
      }
    }
    
    return {
      mana: {
        base: MANA_REGEN_RATE,
        buff: manaBuffBonus,
        drain: manaDrain,
        net: MANA_REGEN_RATE + manaBuffBonus - manaDrain,
      },
      health: {
        base: HEALTH_REGEN_RATE,
        buff: healthBuffBonus,
        net: HEALTH_REGEN_RATE + healthBuffBonus,
      },
    };
  }, [buffs, state.activeAction, pixieBuffs]);

  const value = useMemo(() => ({
    state: state.current,
    previousState: state.previous,
    activeAction: state.activeAction,
    interruptCounter: state.interruptCounter,
    interruptedAction: state.interruptedAction,
    interruptedProgress: state.interruptedProgress,
    animation,
    castProgress,
    castProgressRef,
    setCastProgress,
    syncCastProgressUI,
    mana,
    maxMana: effectiveMaxMana,
    health,
    maxHealth: effectiveMaxHealth,
    buffs,
    regenInfo,
    handleInput,
    dispatchAction,
    tryRecast,
    subscribe,
    is,
    can,
    STATES,
    mouseButtonActionsRef,
  }), [state, animation, castProgress, setCastProgress, syncCastProgressUI, mana, health, buffs, regenInfo, handleInput, dispatchAction, tryRecast, subscribe, is, can, effectiveMaxMana, effectiveMaxHealth]);

  return (
    <PlayerStateContext.Provider value={value}>
      {children}
    </PlayerStateContext.Provider>
  );
}

export function usePlayerState() {
  const context = useContext(PlayerStateContext);
  // Return empty object if outside provider (allows for use in Canvas components)
  return context || {};
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
