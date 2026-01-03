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
  calculatePixieBuffs,
} from '@/config/actions';
import { 
  createBuffInstance, 
  applyBuffToArray, 
  removeExpiredBuffs,
  calculateBuffTotals,
} from '@/config/entities/buffs';
import { DEFAULT_COLLECTED_PIXIES } from '@/config/entities/pixies';
import { PIXIE_SLOTS, getDefaultSlotMap } from '@/config/slots';
import { ACHIEVEMENTS } from '@/config/achievements';
import { getDefaultLoadoutForClass, getAllowedSkillsForClass, getAllAllowedActionsForClass, getClasses, getDefaultClass } from '@/engine/classes';

// =============================================================================
// STORAGE HELPERS
// =============================================================================

const STORAGE_KEYS = {
  SLOT_MAP_PREFIX: 'player_slotmap_',  // Now keyed by classId
  ACTIVE_CLASS: 'player_active_class',
  PIXIES: 'player_pixies',
  ACHIEVEMENTS: 'player_achievements',
};

/**
 * Get default slot map for a class from its JSON config.
 */
const getDefaultSlotMapForClass = (classId) => {
  const empty = getDefaultSlotMap();
  const classDefaults = getDefaultLoadoutForClass(classId);
  return { ...empty, ...classDefaults };
};

/**
 * Load slot map for a specific class.
 */
const loadSlotMapForClass = (classId) => {
  const defaults = getDefaultSlotMapForClass(classId);
  try {
    const saved = localStorage.getItem(`${STORAGE_KEYS.SLOT_MAP_PREFIX}${classId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn(`Failed to load slotmap for ${classId}:`, e);
  }
  return defaults;
};

/**
 * Save slot map for a specific class.
 */
const saveSlotMapForClass = (classId, slotMap) => {
  try {
    localStorage.setItem(`${STORAGE_KEYS.SLOT_MAP_PREFIX}${classId}`, JSON.stringify(slotMap));
  } catch (e) {
    console.warn(`Failed to save slotmap for ${classId}:`, e);
  }
};

/**
 * Load the active class ID.
 */
const loadActiveClass = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLASS);
    if (saved) return saved;
  } catch (e) {
    console.warn('Failed to load active class:', e);
  }
  return 'wizard'; // Default class
};

/**
 * Save the active class ID.
 */
const saveActiveClass = (classId) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLASS, classId);
  } catch (e) {
    console.warn('Failed to save active class:', e);
  }
};

const loadPixies = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PIXIES);
    if (saved) {
      return JSON.parse(saved).collected || DEFAULT_COLLECTED_PIXIES;
    }
  } catch (e) {
    console.warn('Failed to load pixies:', e);
  }
  return DEFAULT_COLLECTED_PIXIES;
};

const savePixies = (collected) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PIXIES, JSON.stringify({ collected }));
  } catch (e) {
    console.warn('Failed to save pixies:', e);
  }
};

const loadAchievements = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load achievements:', e);
  }
  return new Set();
};

const saveAchievements = (unlocked) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify([...unlocked]));
  } catch (e) {
    console.warn('Failed to save achievements:', e);
  }
};

/**
 * Clear ALL game storage - used for New Game.
 * This removes all localStorage keys related to the game.
 */
const clearAllStorage = () => {
  try {
    // Clear active class
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CLASS);
    
    // Clear all class-specific slot maps
    const allClasses = getClasses();
    for (const cls of allClasses) {
      localStorage.removeItem(`${STORAGE_KEYS.SLOT_MAP_PREFIX}${cls.id}`);
    }
    
    // Clear pixies
    localStorage.removeItem(STORAGE_KEYS.PIXIES);
    
    // Clear achievements
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    
    if (import.meta.env.DEV) {
      console.log('[STORAGE] All game storage cleared');
    }
  } catch (e) {
    console.warn('Failed to clear storage:', e);
  }
};

/**
 * Get the default class ID for new games.
 */
const getDefaultClassId = () => {
  const defaultClass = getDefaultClass();
  return defaultClass?.id || 'wizard';
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
    // CLASS & LOADOUT (CLASS-SCOPED)
    // =========================================================================
    
    activeClassId: loadActiveClass(),
    
    // Slot map is derived from the active class's loadout
    slotMap: loadSlotMapForClass(loadActiveClass()),
    
    // Cache of allowed skills for the active class (for EXECUTION guards)
    allowedSkills: new Set(getAllowedSkillsForClass(loadActiveClass())),
    
    // Cache of ALL allowed actions for slot assignment (skills + pixies + consumables)
    allowedActions: new Set(getAllAllowedActionsForClass(loadActiveClass())),
    
    // =========================================================================
    // PIXIES
    // =========================================================================
    
    collectedPixies: loadPixies(),
    
    // =========================================================================
    // ACHIEVEMENTS
    // =========================================================================
    
    unlockedAchievements: loadAchievements(),
    achievementToastQueue: [],
    currentAchievementToast: null,
    
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
     * Handle slot-based input (press/release).
     * Resolves slot → action internally, allowing UI to emit intents only.
     * 
     * @param {string} slotId - The slot ID (e.g., 'slot_lmb', 'slot_1')
     * @param {boolean} isPressed - Whether the input is pressed or released
     * @param {boolean} isClick - Whether this was a click (vs held)
     */
    handleSlotInput: (slotId, isPressed, isClick = false) => {
      const state = get();
      const actionId = state.slotMap[slotId];
      if (!actionId) return; // No action assigned to this slot
      state.handleInput(actionId, isPressed, isClick);
    },
    
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
        // CLASS OWNERSHIP GUARD: Block execution if action not owned by active class
        const action = getActionById(actionId);
        if (action) {
          const skillId = action._skillId || action.id;
          if (!state.allowedSkills.has(skillId)) {
            if (import.meta.env.DEV) {
              console.error(`[GUARD] Skill execution blocked: "${skillId}" not owned by ${state.activeClassId}`);
            }
            return; // HARD BLOCK - cannot execute skills from another class
          }
        }
        
        set({ isClickTriggered: isClick });
        
        // Handle INSTANT actions (consumables)
        if (fsmAction === FSM_ACTIONS.INSTANT) {
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
      const { activeClassId, allowedActions } = get();
      
      // DEBUG: Log equip attempt
      if (import.meta.env.DEV) {
        console.log(`[DEBUG][Equip] Attempt equip item="${actionId}" into slot="${slotId}" allowedActions=${JSON.stringify([...allowedActions])}`);
      }
      
      // OWNERSHIP GUARD: Block assignment if action not owned by active class
      if (!allowedActions.has(actionId)) {
        if (import.meta.env.DEV) {
          console.error(`[DEBUG][Equip] REJECTED: "${actionId}" not in allowedActions for ${activeClassId}`);
        }
        return; // HARD BLOCK
      }
      
      set(state => {
        const updated = { ...state.slotMap };
        
        // Find if action is already assigned
        const existingSlot = Object.keys(updated).find(s => updated[s] === actionId);
        
        if (existingSlot && existingSlot !== slotId) {
          // Swap
          updated[existingSlot] = state.slotMap[slotId];
        }
        
        updated[slotId] = actionId;
        saveSlotMapForClass(activeClassId, updated);
        
        if (import.meta.env.DEV) {
          console.log(`[DEBUG][Equip] ACCEPTED: "${actionId}" → ${slotId}`);
        }
        
        return { slotMap: updated };
      });
    },
    
    swapSlots: (slotA, slotB) => {
      if (slotA === slotB) return;
      const { activeClassId } = get();
      
      set(state => {
        const updated = { ...state.slotMap };
        const temp = updated[slotA];
        updated[slotA] = updated[slotB];
        updated[slotB] = temp;
        saveSlotMapForClass(activeClassId, updated);
        return { slotMap: updated };
      });
    },
    
    clearSlot: (slotId) => {
      const { activeClassId } = get();
      set(state => {
        const updated = { ...state.slotMap, [slotId]: null };
        saveSlotMapForClass(activeClassId, updated);
        return { slotMap: updated };
      });
    },
    
    resetSlotMap: () => {
      const { activeClassId } = get();
      const defaults = getDefaultSlotMapForClass(activeClassId);
      saveSlotMapForClass(activeClassId, defaults);
      set({ slotMap: defaults });
    },
    
    /**
     * Force refresh the allowedActions cache.
     * Useful for development when code changes don't trigger a full store re-init.
     */
    refreshAllowedActions: () => {
      const { activeClassId } = get();
      const newAllowedSkills = new Set(getAllowedSkillsForClass(activeClassId));
      const newAllowedActions = new Set(getAllAllowedActionsForClass(activeClassId));
      
      if (import.meta.env.DEV) {
        console.log(`[DEBUG][Store] refreshAllowedActions for ${activeClassId}:`, [...newAllowedActions]);
      }
      
      set({
        allowedSkills: newAllowedSkills,
        allowedActions: newAllowedActions,
      });
    },
    
    // =========================================================================
    // CLASS SWITCHING
    // =========================================================================
    
    /**
    /**
     * Switch to a different class.
     * This is the ONLY way to change the active class.
     * On switch:
     * - Save current class's loadout
     * - Load new class's loadout
     * - Update allowed skills/actions cache
     */
    setActiveClass: (classId) => {
      const { activeClassId: currentClassId, slotMap: currentSlotMap } = get();
      
      // Don't switch if already active
      if (classId === currentClassId) return;
      
      // Save current class's loadout before switching
      saveSlotMapForClass(currentClassId, currentSlotMap);
      
      // Load new class's loadout and allowed skills/actions
      const newSlotMap = loadSlotMapForClass(classId);
      const newAllowedSkills = new Set(getAllowedSkillsForClass(classId));
      const newAllowedActions = new Set(getAllAllowedActionsForClass(classId));
      
      // Persist the class change
      saveActiveClass(classId);
      
      if (import.meta.env.DEV) {
        console.log(`[DEBUG][ClassSwitch] ${currentClassId} → ${classId}`);
        console.log(`[DEBUG][ClassSwitch] Loadout: ${JSON.stringify(newSlotMap)}`);
        console.log(`[DEBUG][ClassSwitch] AllowedActions: ${JSON.stringify([...newAllowedActions])}`);
      }
      
      set({
        activeClassId: classId,
        slotMap: newSlotMap,
        allowedSkills: newAllowedSkills,
        allowedActions: newAllowedActions,
        // Reset casting state on class switch to prevent ghost abilities
        activeAction: null,
        playerState: PLAYER_STATES.IDLE,
        castProgress: 0,
      });
    },
    
    // =========================================================================
    // GAME SESSION ACTIONS (New Game / Load Game)
    // =========================================================================
    
    /**
     * Start a new game - completely resets all state to defaults.
     * This is the NUCLEAR option - clears all localStorage and resets to fresh state.
     * 
     * Use when:
     * - Player clicks "New Game"
     * - Need to reset to a clean slate
     * 
     * @param {string} [startingClassId] - Optional starting class (defaults to wizard)
     */
    startNewGame: (startingClassId) => {
      // Clear ALL persistent storage first
      clearAllStorage();
      
      // Determine starting class
      const classId = startingClassId || getDefaultClassId();
      
      // Get fresh defaults for the starting class
      const freshSlotMap = getDefaultSlotMapForClass(classId);
      const freshAllowedSkills = new Set(getAllowedSkillsForClass(classId));
      const freshAllowedActions = new Set(getAllAllowedActionsForClass(classId));
      
      if (import.meta.env.DEV) {
        console.log('[NEW GAME] ============================================');
        console.log(`[NEW GAME] Starting class: ${classId}`);
        console.log(`[NEW GAME] Fresh loadout slots: ${Object.values(freshSlotMap).filter(Boolean).length}`);
        console.log(`[NEW GAME] Allowed skills: ${freshAllowedSkills.size}`);
        console.log(`[NEW GAME] Allowed actions: ${freshAllowedActions.size}`);
        console.log(`[NEW GAME] Pixies reset to: ${DEFAULT_COLLECTED_PIXIES.join(', ')}`);
        console.log(`[NEW GAME] Achievements cleared`);
        console.log('[NEW GAME] ============================================');
      }
      
      // Reset ALL state to fresh defaults
      set({
        // FSM state
        playerState: PLAYER_STATES.IDLE,
        previousState: null,
        activeAction: null,
        completedAction: null,
        interruptCounter: 0,
        interruptedAction: null,
        interruptedProgress: 0,
        
        // Resources
        mana: STATS.MAX_MANA,
        health: STATS.MAX_HEALTH,
        
        // Buffs
        buffs: [],
        
        // Casting
        castProgress: 0,
        isClickTriggered: false,
        heldInputs: new Set(),
        mouseButtonActions: { 0: null, 2: null },
        
        // Class & loadout - FRESH from config
        activeClassId: classId,
        slotMap: freshSlotMap,
        allowedSkills: freshAllowedSkills,
        allowedActions: freshAllowedActions,
        
        // Pixies - FRESH defaults
        collectedPixies: DEFAULT_COLLECTED_PIXIES,
        
        // Achievements - CLEARED
        unlockedAchievements: new Set(),
        achievementToastQueue: [],
        currentAchievementToast: null,
      });
    },
    
    /**
     * Load a saved game - completely overwrites current state.
     * NEVER merges - always full replacement.
     * 
     * @param {Object} saveData - The saved game data
     * @param {string} saveData.activeClassId - The class ID to load
     * @param {Object} saveData.classLoadouts - Map of classId -> slotMap
     * @param {string[]} saveData.collectedPixies - Array of collected pixie IDs
     * @param {string[]} saveData.unlockedAchievements - Array of unlocked achievement IDs
     * @param {number} [saveData.health] - Current health (optional)
     * @param {number} [saveData.mana] - Current mana (optional)
     */
    loadSavedGame: (saveData) => {
      if (!saveData || !saveData.activeClassId) {
        console.error('[LOAD GAME] Invalid save data - missing activeClassId');
        return false;
      }
      
      // Clear existing storage before loading
      clearAllStorage();
      
      const classId = saveData.activeClassId;
      
      // Restore all class loadouts to localStorage
      if (saveData.classLoadouts) {
        for (const [cId, cSlotMap] of Object.entries(saveData.classLoadouts)) {
          saveSlotMapForClass(cId, cSlotMap);
        }
      }
      
      // Load the active class's slot map
      const loadedSlotMap = saveData.classLoadouts?.[classId] 
        || getDefaultSlotMapForClass(classId);
      
      // Rebuild allowed actions from class config (not from save)
      const loadedAllowedSkills = new Set(getAllowedSkillsForClass(classId));
      const loadedAllowedActions = new Set(getAllAllowedActionsForClass(classId));
      
      // Persist the loaded state
      saveActiveClass(classId);
      
      if (saveData.collectedPixies) {
        savePixies(saveData.collectedPixies);
      }
      
      if (saveData.unlockedAchievements) {
        saveAchievements(new Set(saveData.unlockedAchievements));
      }
      
      if (import.meta.env.DEV) {
        console.log('[LOAD GAME] ============================================');
        console.log(`[LOAD GAME] Active class: ${classId}`);
        console.log(`[LOAD GAME] Loaded slots: ${Object.values(loadedSlotMap).filter(Boolean).length}`);
        console.log(`[LOAD GAME] Pixies: ${saveData.collectedPixies?.length || 0}`);
        console.log(`[LOAD GAME] Achievements: ${saveData.unlockedAchievements?.length || 0}`);
        console.log('[LOAD GAME] ============================================');
      }
      
      // Overwrite ALL state
      set({
        // FSM state - reset to idle
        playerState: PLAYER_STATES.IDLE,
        previousState: null,
        activeAction: null,
        completedAction: null,
        interruptCounter: 0,
        interruptedAction: null,
        interruptedProgress: 0,
        
        // Resources - from save or defaults
        mana: saveData.mana ?? STATS.MAX_MANA,
        health: saveData.health ?? STATS.MAX_HEALTH,
        
        // Buffs - always start fresh (buffs don't persist across sessions)
        buffs: [],
        
        // Casting
        castProgress: 0,
        isClickTriggered: false,
        heldInputs: new Set(),
        mouseButtonActions: { 0: null, 2: null },
        
        // Class & loadout - from save
        activeClassId: classId,
        slotMap: loadedSlotMap,
        allowedSkills: loadedAllowedSkills,
        allowedActions: loadedAllowedActions,
        
        // Pixies - from save or defaults
        collectedPixies: saveData.collectedPixies || DEFAULT_COLLECTED_PIXIES,
        
        // Achievements - from save or empty
        unlockedAchievements: new Set(saveData.unlockedAchievements || []),
        achievementToastQueue: [],
        currentAchievementToast: null,
      });
      
      return true;
    },
    
    /**
     * Export current game state for saving.
     * Returns a serializable object that can be passed to loadSavedGame.
     */
    exportSaveData: () => {
      const state = get();
      
      // Collect all class loadouts from localStorage
      const classLoadouts = {};
      const allClasses = getClasses();
      for (const cls of allClasses) {
        const slotMap = loadSlotMapForClass(cls.id);
        classLoadouts[cls.id] = slotMap;
      }
      
      // Make sure current class's in-memory slotMap is included
      classLoadouts[state.activeClassId] = state.slotMap;
      
      return {
        activeClassId: state.activeClassId,
        classLoadouts,
        collectedPixies: [...state.collectedPixies],
        unlockedAchievements: [...state.unlockedAchievements],
        health: state.health,
        mana: state.mana,
        // Note: buffs are NOT saved - they're ephemeral
      };
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
      savePixies(DEFAULT_COLLECTED_PIXIES);
      set({ collectedPixies: DEFAULT_COLLECTED_PIXIES });
    },
    
    // =========================================================================
    // ACHIEVEMENT ACTIONS
    // =========================================================================
    
    /**
     * Check if an achievement is unlocked
     */
    isAchievementUnlocked: (achievementId) => {
      return get().unlockedAchievements.has(achievementId);
    },
    
    /**
     * Unlock an achievement
     */
    unlockAchievement: (achievementId) => {
      const { unlockedAchievements } = get();
      if (unlockedAchievements.has(achievementId)) return false;
      
      const achievement = ACHIEVEMENTS[achievementId];
      if (!achievement) return false;
      
      const updated = new Set(unlockedAchievements);
      updated.add(achievementId);
      saveAchievements(updated);
      
      set(state => ({
        unlockedAchievements: updated,
        achievementToastQueue: [...state.achievementToastQueue, achievement],
      }));
      
      return true;
    },
    
    /**
     * Show next achievement toast from queue
     */
    showNextAchievementToast: () => {
      const { achievementToastQueue, currentAchievementToast } = get();
      if (currentAchievementToast || achievementToastQueue.length === 0) return;
      
      const [next, ...rest] = achievementToastQueue;
      set({
        currentAchievementToast: next,
        achievementToastQueue: rest,
      });
    },
    
    /**
     * Dismiss current achievement toast
     */
    dismissAchievementToast: () => {
      set({ currentAchievementToast: null });
    },
    
    /**
     * Get all achievements with unlock status
     */
    getAllAchievements: () => {
      const { unlockedAchievements } = get();
      return Object.values(ACHIEVEMENTS).map(a => ({
        ...a,
        unlocked: unlockedAchievements.has(a.id),
      }));
    },
    
    /**
     * Get achievement progress
     */
    getAchievementProgress: () => {
      const { unlockedAchievements } = get();
      const total = Object.keys(ACHIEVEMENTS).length;
      const unlocked = unlockedAchievements.size;
      return { unlocked, total, percent: Math.round((unlocked / total) * 100) };
    },
    
    /**
     * Reset achievements
     */
    resetAchievements: () => {
      const empty = new Set();
      saveAchievements(empty);
      set({
        unlockedAchievements: empty,
        achievementToastQueue: [],
        currentAchievementToast: null,
      });
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
  
  // DEV: Force refresh allowedActions to pick up code changes after HMR
  if (import.meta.env.DEV) {
    setTimeout(() => {
      useGameStore.getState().refreshAllowedActions();
    }, 100);
  }
}

// =============================================================================
// GLOBAL MOUSEUP HANDLER
// =============================================================================

if (typeof document !== 'undefined') {
  document.addEventListener('mouseup', (e) => {
    useGameStore.getState().clearMouseButtonAction(e.button);
  }, true);
}
