/**
 * =============================================================================
 * GAME STORE - ZUSTAND STATE MANAGEMENT
 * =============================================================================
 * 
 * Why Zustand:
 * ============
 * 
 * 1. PERFORMANCE: The game tick runs every 100ms updating mana/health/buffs.
 *    Zustand's selector pattern means components only re-render when their
 *    subscribed state changes.
 * 
 * 2. NO PROVIDER NESTING: Zustand stores are just modules - no provider wrapping.
 * 
 * 3. REFS BUILT-IN: Zustand's `getState()` provides current state without
 *    stale closure issues - perfect for animation loops.
 * 
 * 4. HOT PATH OPTIMIZATION: Combat code runs every frame. Zustand is direct
 *    object access with minimal overhead.
 * 
 * Store Design:
 * =============
 * - Flat state structure (no deep nesting)
 * - Actions are methods, not dispatch/reducer
 * - Selectors exported for component subscription
 * - Refs accessible via getState() for animation loops
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  STATS, 
  PLAYER_STATES, 
  STATE_ANIMATIONS,
  STATE_TRANSITIONS,
  FSM_ACTIONS,
  isBusyState,
} from '@/config/stats';
import { 
  getActionById, 
  getFsmAction, 
  canAffordAction,
  isChannelAction,
  canRecastAction,
} from '@/config/actions';
import { 
  createBuffInstance, 
  applyBuffToArray, 
  removeExpiredBuffs,
  calculateBuffTotals,
} from '@/config/buffs';
import { calculatePixieBuffs } from '@/config/pixies';
import { PIXIE_SLOTS, getDefaultSlotMap } from '@/config/slots';

// =============================================================================
// STORAGE HELPERS
// =============================================================================

const STORAGE_KEYS = {
  SLOT_MAP: 'player_slotmap',
  PIXIES: 'player_pixies',
};

const loadSlotMap = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SLOT_MAP);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultSlotMap(), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load slotmap:', e);
  }
  return getDefaultSlotMap();
};

const saveSlotMap = (slotMap) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SLOT_MAP, JSON.stringify(slotMap));
  } catch (e) {
    console.warn('Failed to save slotmap:', e);
  }
};

const loadPixies = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PIXIES);
    if (saved) {
      return JSON.parse(saved).collected || ['verdant', 'azure', 'violet', 'crimson'];
    }
  } catch (e) {
    console.warn('Failed to load pixies:', e);
  }
  return ['verdant', 'azure', 'violet', 'crimson'];
};

const savePixies = (collected) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PIXIES, JSON.stringify({ collected }));
  } catch (e) {
    console.warn('Failed to save pixies:', e);
  }
};

// =============================================================================
// STORE CREATION
// =============================================================================

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // =========================================================================
    // FSM STATE
    // =========================================================================
    
    playerState: PLAYER_STATES.IDLE,
    previousState: null,
    activeAction: null,          // Current action being performed
    completedAction: null,       // Action that just finished (for effects)
    interruptCounter: 0,         // Increments on interruption
    interruptedAction: null,     // Which action was interrupted
    interruptedProgress: 0,      // Progress at interruption
    
    // =========================================================================
    // RESOURCES
    // =========================================================================
    
    mana: STATS.MAX_MANA,
    health: STATS.MAX_HEALTH,
    
    // =========================================================================
    // BUFFS
    // =========================================================================
    
    buffs: [],                   // Active buff instances
    
    // =========================================================================
    // CASTING
    // =========================================================================
    
    castProgress: 0,             // 0-1 progress for current cast
    isClickTriggered: false,     // True if action was click (no recast)
    heldInputs: new Set(),       // Currently held action IDs
    mouseButtonActions: { 0: null, 2: null }, // Track mouse button -> action
    
    // =========================================================================
    // SLOT MAP
    // =========================================================================
    
    slotMap: loadSlotMap(),
    
    // =========================================================================
    // PIXIES
    // =========================================================================
    
    collectedPixies: loadPixies(),
    
    // =========================================================================
    // DERIVED STATE (computed on access)
    // =========================================================================
    
    /**
     * Get current animation name
     */
    getAnimation: () => {
      const { playerState } = get();
      return STATE_ANIMATIONS[playerState] || STATE_ANIMATIONS[PLAYER_STATES.IDLE];
    },
    
    /**
     * Get equipped pixie IDs from slot map
     */
    getEquippedPixies: () => {
      const { slotMap } = get();
      return PIXIE_SLOTS.map(slot => slotMap[slot.id]).filter(Boolean);
    },
    
    /**
     * Get total pixie buffs
     */
    getPixieBuffs: () => {
      const equipped = get().getEquippedPixies();
      return calculatePixieBuffs(equipped);
    },
    
    /**
     * Get effective max mana (base + pixie bonus)
     */
    getMaxMana: () => {
      const pixieBuffs = get().getPixieBuffs();
      return STATS.MAX_MANA + (pixieBuffs.maxMana || 0);
    },
    
    /**
     * Get effective max health (base + pixie bonus)
     */
    getMaxHealth: () => {
      const pixieBuffs = get().getPixieBuffs();
      return STATS.MAX_HEALTH + (pixieBuffs.maxHealth || 0);
    },
    
    /**
     * Calculate total mana regen (base + buffs + pixies - drain)
     */
    getManaRegen: () => {
      const { buffs, activeAction } = get();
      const buffTotals = calculateBuffTotals(buffs);
      const pixieBuffs = get().getPixieBuffs();
      
      let drain = 0;
      if (activeAction) {
        const action = getActionById(activeAction);
        drain = action?.manaPerSecond || 0;
      }
      
      return STATS.MANA_REGEN + buffTotals.manaRegen + (pixieBuffs.manaRegen || 0) - drain;
    },
    
    /**
     * Calculate total health regen (base + buffs + pixies)
     */
    getHealthRegen: () => {
      const { buffs } = get();
      const buffTotals = calculateBuffTotals(buffs);
      const pixieBuffs = get().getPixieBuffs();
      
      return STATS.HEALTH_REGEN + buffTotals.healthRegen + (pixieBuffs.healthRegen || 0);
    },
    
    /**
     * Get regen info for tooltips
     */
    getRegenInfo: () => {
      const { buffs, activeAction } = get();
      const buffTotals = calculateBuffTotals(buffs);
      const pixieBuffs = get().getPixieBuffs();
      
      let manaDrain = 0;
      if (activeAction) {
        const action = getActionById(activeAction);
        manaDrain = action?.manaPerSecond || 0;
      }
      
      const manaBuffBonus = buffTotals.manaRegen + (pixieBuffs.manaRegen || 0);
      const healthBuffBonus = buffTotals.healthRegen + (pixieBuffs.healthRegen || 0);
      
      return {
        mana: {
          base: STATS.MANA_REGEN,
          buff: manaBuffBonus,
          drain: manaDrain,
          net: STATS.MANA_REGEN + manaBuffBonus - manaDrain,
        },
        health: {
          base: STATS.HEALTH_REGEN,
          buff: healthBuffBonus,
          net: STATS.HEALTH_REGEN + healthBuffBonus,
        },
      };
    },
    
    // =========================================================================
    // FSM ACTIONS
    // =========================================================================
    
    /**
     * Transition to a new state
     */
    transition: (actionType, actionId = null, progress = 0) => {
      const { playerState, activeAction } = get();
      const transitions = STATE_TRANSITIONS[playerState];
      const nextState = transitions?.[actionType];
      
      if (!nextState) return false;
      
      // Determine if this is an interruption
      const wasBusy = isBusyState(playerState);
      const isFinish = actionType === 'FINISH';
      const isCancel = actionType === 'CANCEL' || actionType === 'STOP';
      const isDifferentAction = actionId && actionId !== activeAction;
      const isInterrupt = wasBusy && !isFinish && !isCancel && 
        (actionType === 'MOVE' || isDifferentAction);
      
      // Determine final activeAction
      let finalActiveAction;
      if (isFinish || isCancel || actionType === 'STOP') {
        finalActiveAction = null;
      } else if (actionType === 'MOVE') {
        // Keep activeAction for channeled movement abilities
        const action = getActionById(actionId);
        finalActiveAction = isChannelAction(action) ? actionId : null;
      } else {
        finalActiveAction = actionId ?? activeAction;
      }
      
      set({
        playerState: nextState,
        previousState: playerState,
        activeAction: finalActiveAction,
        completedAction: isFinish ? activeAction : null,
        interruptCounter: isInterrupt ? get().interruptCounter + 1 : get().interruptCounter,
        interruptedAction: isInterrupt ? activeAction : get().interruptedAction,
        interruptedProgress: isInterrupt ? progress : get().interruptedProgress,
      });
      
      return true;
    },
    
    /**
     * Check if in a specific state
     */
    is: (stateName) => get().playerState === stateName,
    
    /**
     * Check if a transition is possible
     */
    can: (actionType) => {
      const transitions = STATE_TRANSITIONS[get().playerState];
      return transitions ? actionType.toUpperCase() in transitions : false;
    },
    
    // =========================================================================
    // INPUT HANDLING
    // =========================================================================
    
    /**
     * Handle action input (press/release)
     * This is the main entry point for all player actions.
     */
    handleInput: (actionId, isPressed, isClick = false) => {
      const state = get();
      
      // Track held state FIRST
      if (isPressed) {
        state.heldInputs.add(actionId);
      } else {
        state.heldInputs.delete(actionId);
      }
      
      const fsmAction = getFsmAction(actionId);
      if (!fsmAction) return;
      
      if (isPressed) {
        set({ isClickTriggered: isClick });
        
        // Handle INSTANT actions (consumables)
        if (fsmAction === FSM_ACTIONS.INSTANT) {
          const action = getActionById(actionId);
          if (!state.spendResources(action)) return;
          
          // Apply buff immediately
          if (action?.buff) {
            state.applyBuff(action.buff);
          }
          return;
        }
        
        // Check if transition is valid
        const transitions = STATE_TRANSITIONS[state.playerState];
        if (!(fsmAction in transitions)) return;
        
        // Check and spend resources
        const action = getActionById(actionId);
        if (!state.spendResources(action)) return;
        
        // Transition with action ID
        state.transition(fsmAction, actionId, state.castProgress);
        
      } else {
        // Release: stop movement immediately
        if (fsmAction === FSM_ACTIONS.MOVE) {
          state.transition('STOP');
        }
      }
    },
    
    /**
     * Try to recast the current action (for held inputs)
     */
    tryRecast: () => {
      const { activeAction, isClickTriggered, heldInputs, castProgress } = get();
      
      if (!activeAction) return false;
      if (isClickTriggered) {
        set({ isClickTriggered: false });
        return false;
      }
      if (!heldInputs.has(activeAction)) return false;
      
      const action = getActionById(activeAction);
      if (!canRecastAction(action)) return false;
      
      // Check and spend resources
      if (!get().spendResources(action)) return false;
      
      // Apply mana gain on recast
      if (action?.manaGain) {
        get().gainMana(action.manaGain);
      }
      
      // Reset progress for recast
      set({ castProgress: 0 });
      
      return true;
    },
    
    /**
     * Set mouse button action tracking
     */
    setMouseButtonAction: (button, actionId) => {
      set(state => ({
        mouseButtonActions: { ...state.mouseButtonActions, [button]: actionId }
      }));
    },
    
    /**
     * Clear mouse button action on release
     */
    clearMouseButtonAction: (button) => {
      const { mouseButtonActions, heldInputs } = get();
      const actionId = mouseButtonActions[button];
      if (actionId) {
        heldInputs.delete(actionId);
        set({
          mouseButtonActions: { ...mouseButtonActions, [button]: null }
        });
      }
    },
    
    // =========================================================================
    // RESOURCE MANAGEMENT
    // =========================================================================
    
    /**
     * Spend resources for an action. Returns true if successful.
     */
    spendResources: (action) => {
      if (!action) return false;
      
      const { mana, health } = get();
      const manaCost = action.manaCost ?? 0;
      const healthCost = action.healthCost ?? 0;
      
      // Check costs
      if (manaCost > 0 && mana < manaCost) return false;
      if (healthCost > 0 && health <= healthCost) return false;
      
      // Spend costs
      set({
        mana: Math.max(0, mana - manaCost),
        health: Math.max(1, health - healthCost), // Never kill yourself
      });
      
      return true;
    },
    
    /**
     * Gain mana (from attacks, etc.)
     */
    gainMana: (amount) => {
      const maxMana = get().getMaxMana();
      set(state => ({
        mana: Math.min(maxMana, state.mana + amount)
      }));
    },
    
    /**
     * Apply a buff
     */
    applyBuff: (buffDef) => {
      const buffInstance = createBuffInstance(buffDef);
      if (!buffInstance) return;
      
      set(state => ({
        buffs: applyBuffToArray(state.buffs, buffInstance)
      }));
    },
    
    /**
     * Game tick - called every REGEN_TICK_MS
     * Handles regeneration and buff expiration
     */
    tick: () => {
      const state = get();
      const tickSeconds = STATS.REGEN_TICK_MS / 1000;
      const maxMana = state.getMaxMana();
      const maxHealth = state.getMaxHealth();
      
      // Calculate regen
      const manaRegen = state.getManaRegen();
      const healthRegen = state.getHealthRegen();
      
      // Apply regen
      let newMana = state.mana + (manaRegen * tickSeconds);
      let newHealth = state.health + (healthRegen * tickSeconds);
      
      // Clamp to bounds
      newMana = Math.max(0, Math.min(maxMana, newMana));
      newHealth = Math.max(0, Math.min(maxHealth, newHealth));
      
      // Remove expired buffs
      const activeBuffs = removeExpiredBuffs(state.buffs);
      
      set({
        mana: newMana,
        health: newHealth,
        buffs: activeBuffs,
      });
      
      // Stop channeled movement if mana depleted
      if (newMana <= 0 && state.playerState === PLAYER_STATES.MOVING && state.activeAction) {
        const action = getActionById(state.activeAction);
        if (isChannelAction(action)) {
          state.transition('STOP');
        }
      }
    },
    
    // =========================================================================
    // CAST PROGRESS
    // =========================================================================
    
    setCastProgress: (progress) => set({ castProgress: progress }),
    
    // =========================================================================
    // SLOT MAP ACTIONS
    // =========================================================================
    
    getActionForSlot: (slotId) => get().slotMap[slotId] || null,
    
    getActionObjectForSlot: (slotId) => {
      const actionId = get().slotMap[slotId];
      return actionId ? getActionById(actionId) : null;
    },
    
    getSlotForAction: (actionId) => {
      const { slotMap } = get();
      const entry = Object.entries(slotMap).find(([_, id]) => id === actionId);
      return entry ? entry[0] : null;
    },
    
    assignToSlot: (slotId, actionId) => {
      set(state => {
        const updated = { ...state.slotMap };
        
        // Find if action is already assigned
        const existingSlot = Object.keys(updated).find(s => updated[s] === actionId);
        
        if (existingSlot && existingSlot !== slotId) {
          // Swap
          updated[existingSlot] = state.slotMap[slotId];
        }
        
        updated[slotId] = actionId;
        saveSlotMap(updated);
        
        return { slotMap: updated };
      });
    },
    
    swapSlots: (slotA, slotB) => {
      if (slotA === slotB) return;
      
      set(state => {
        const updated = { ...state.slotMap };
        const temp = updated[slotA];
        updated[slotA] = updated[slotB];
        updated[slotB] = temp;
        saveSlotMap(updated);
        return { slotMap: updated };
      });
    },
    
    clearSlot: (slotId) => {
      set(state => {
        const updated = { ...state.slotMap, [slotId]: null };
        saveSlotMap(updated);
        return { slotMap: updated };
      });
    },
    
    resetSlotMap: () => {
      const defaults = getDefaultSlotMap();
      saveSlotMap(defaults);
      set({ slotMap: defaults });
    },
    
    // =========================================================================
    // PIXIE ACTIONS
    // =========================================================================
    
    collectPixie: (pixieId) => {
      set(state => {
        if (state.collectedPixies.includes(pixieId)) return state;
        const updated = [...state.collectedPixies, pixieId];
        savePixies(updated);
        return { collectedPixies: updated };
      });
    },
    
    resetPixies: () => {
      const defaults = ['verdant', 'azure', 'violet', 'crimson'];
      savePixies(defaults);
      set({ collectedPixies: defaults });
    },
    
    // =========================================================================
    // EFFECT COMPLETION
    // =========================================================================
    
    /**
     * Process completed action effects (called after animation finishes)
     */
    processCompletedAction: () => {
      const { completedAction } = get();
      if (!completedAction) return;
      
      const action = getActionById(completedAction);
      
      // Apply buff on completion
      if (action?.buff) {
        get().applyBuff(action.buff);
      }
      
      // Apply mana gain
      if (action?.manaGain) {
        get().gainMana(action.manaGain);
      }
      
      set({ completedAction: null });
    },
    
    clearInterrupted: () => set({ interruptedAction: null, interruptedProgress: 0 }),
  }))
);

// =============================================================================
// SELECTORS (for component subscription optimization)
// =============================================================================

// Resource selectors
export const selectMana = (state) => state.mana;
export const selectHealth = (state) => state.health;
export const selectMaxMana = (state) => state.getMaxMana();
export const selectMaxHealth = (state) => state.getMaxHealth();
export const selectBuffs = (state) => state.buffs;

// FSM selectors
export const selectPlayerState = (state) => state.playerState;
export const selectActiveAction = (state) => state.activeAction;
export const selectAnimation = (state) => state.getAnimation();
export const selectCastProgress = (state) => state.castProgress;

// Slot map selectors
export const selectSlotMap = (state) => state.slotMap;

// Combined selectors for specific use cases
export const selectRegenInfo = (state) => state.getRegenInfo();
export const selectEquippedPixies = (state) => state.getEquippedPixies();

// =============================================================================
// GAME TICK SETUP
// =============================================================================

let tickInterval = null;

export const startGameTick = () => {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    useGameStore.getState().tick();
  }, STATS.REGEN_TICK_MS);
};

export const stopGameTick = () => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
};

// Auto-start tick when module loads
if (typeof window !== 'undefined') {
  startGameTick();
}

// =============================================================================
// GLOBAL MOUSEUP HANDLER
// =============================================================================

if (typeof document !== 'undefined') {
  document.addEventListener('mouseup', (e) => {
    useGameStore.getState().clearMouseButtonAction(e.button);
  }, true);
}
