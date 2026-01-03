/**
 * =============================================================================
 * GAME HOOKS - COMPONENT-FACING API
 * =============================================================================
 * 
 * These hooks provide the interface for components to access game state.
 * They wrap the Zustand store with stable, optimized selectors.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/stores/gameStore';
import { PLAYER_STATES, STATE_ANIMATIONS } from '@/config/stats';
import { getActionById, getPixies, getPixieActionById, calculatePixieBuffs } from '@/config/actions';
import { PIXIE_SLOTS, SKILL_SLOTS, MOUSE_SLOTS, CONSUMABLE_SLOTS, ALL_SLOTS } from '@/config/slots';

// =============================================================================
// usePlayerState - Main player state hook
// =============================================================================

/**
 * Hook to access player state.
 * Uses Zustand selectors to minimize re-renders - only subscribes to what's used.
 */
export function usePlayerState() {
  // Subscribe to state slices that components commonly need together
  const state = useGameStore(useShallow(state => ({
    playerState: state.playerState,
    previousState: state.previousState,
    activeAction: state.activeAction,
    interruptCounter: state.interruptCounter,
    interruptedAction: state.interruptedAction,
    interruptedProgress: state.interruptedProgress,
    mana: state.mana,
    health: state.health,
    buffs: state.buffs,
    castProgress: state.castProgress,
    slotMap: state.slotMap,
  })));
  
  // Get stable action references
  const handleInput = useGameStore(s => s.handleInput);
  const handleSlotInput = useGameStore(s => s.handleSlotInput);
  const transition = useGameStore(s => s.transition);
  const tryRecast = useGameStore(s => s.tryRecast);
  const setCastProgress = useGameStore(s => s.setCastProgress);
  const processCompletedAction = useGameStore(s => s.processCompletedAction);
  const setMouseButtonAction = useGameStore(s => s.setMouseButtonAction);
  
  // Get derived values
  const getMaxMana = useGameStore(s => s.getMaxMana);
  const getMaxHealth = useGameStore(s => s.getMaxHealth);
  const getRegenInfo = useGameStore(s => s.getRegenInfo);
  const getAnimation = useGameStore(s => s.getAnimation);
  
  // Compute derived values
  const animation = getAnimation();
  const maxMana = getMaxMana();
  const maxHealth = getMaxHealth();
  const regenInfo = getRegenInfo();
  
  // For components that need ref-like access in useFrame
  const castProgressRef = useRef(state.castProgress);
  castProgressRef.current = state.castProgress;
  
  // Create mouseButtonActionsRef for Target component compatibility
  const mouseButtonActionsRef = useRef({ 0: null, 2: null });
  
  // Wrap setMouseButtonAction to also update ref
  const wrappedSetMouseButtonAction = useCallback((button, actionId) => {
    mouseButtonActionsRef.current[button] = actionId;
    setMouseButtonAction(button, actionId);
  }, [setMouseButtonAction]);
  
  // State helpers
  const is = useCallback((stateName) => state.playerState === stateName, [state.playerState]);
  const can = useCallback((actionType) => useGameStore.getState().can(actionType), []);
  
  // Dispatch action (FSM transition)
  const dispatchAction = useCallback((actionType) => {
    transition(actionType);
  }, [transition]);
  
  // Sync cast progress UI (force update)
  const syncCastProgressUI = useCallback(() => {
    // No-op in Zustand - state is already reactive
  }, []);
  
  // Subscribe for state transitions (for useStateEffect)
  const subscribe = useCallback((listener) => {
    return useGameStore.subscribe(
      (state) => ({ current: state.playerState, previous: state.previousState }),
      ({ current, previous }) => listener(current, previous)
    );
  }, []);
  
  // Process completed action effects
  useEffect(() => {
    const completedAction = useGameStore.getState().completedAction;
    if (completedAction) {
      processCompletedAction();
    }
  }, [state.buffs, processCompletedAction]); // Re-run when buffs change (indicates completion)
  
  return {
    // State
    state: state.playerState,
    previousState: state.previousState,
    activeAction: state.activeAction,
    interruptCounter: state.interruptCounter,
    interruptedAction: state.interruptedAction,
    interruptedProgress: state.interruptedProgress,
    
    // Resources
    mana: state.mana,
    health: state.health,
    maxMana,
    maxHealth,
    buffs: state.buffs,
    regenInfo,
    
    // Casting
    animation,
    castProgress: state.castProgress,
    castProgressRef,
    setCastProgress,
    syncCastProgressUI,
    
    // Actions
    handleInput,
    handleSlotInput,
    dispatchAction,
    tryRecast,
    subscribe,
    
    // State helpers
    is,
    can,
    STATES: PLAYER_STATES,
    
    // Mouse button tracking (for Target component)
    mouseButtonActionsRef,
  };
}

// =============================================================================
// useSlotMap - Slot assignment hook
// =============================================================================

/**
 * Hook to manage slot assignments.
 * Provides the same API as the old SlotMapContext.
 */
export function useSlotMap() {
  const slotMap = useGameStore(s => s.slotMap);
  const assignToSlot = useGameStore(s => s.assignToSlot);
  const swapSlots = useGameStore(s => s.swapSlots);
  const clearSlot = useGameStore(s => s.clearSlot);
  const resetToDefaults = useGameStore(s => s.resetSlotMap);
  
  const getActionForSlot = useCallback((slotId) => {
    return slotMap[slotId] || null;
  }, [slotMap]);
  
  const getActionObjectForSlot = useCallback((slotId) => {
    const actionId = slotMap[slotId];
    return actionId ? getActionById(actionId) : null;
  }, [slotMap]);
  
  const getSlotForAction = useCallback((actionId) => {
    const entry = Object.entries(slotMap).find(([_, id]) => id === actionId);
    return entry ? entry[0] : null;
  }, [slotMap]);
  
  return {
    slotMap,
    getActionForSlot,
    getActionObjectForSlot,
    getSlotForAction,
    assignToSlot,
    swapSlots,
    clearSlot,
    resetToDefaults,
    SKILL_SLOTS,
    MOUSE_SLOTS,
    CONSUMABLE_SLOTS,
    ALL_SLOTS,
  };
}

// =============================================================================
// usePixies - Pixie management hook
// =============================================================================

/**
 * Hook to manage pixies.
 * Pixies are now passive skills - they use the same pipeline as skills/consumables.
 */
export function usePixies() {
  const collectedPixies = useGameStore(s => s.collectedPixies);
  const slotMap = useGameStore(s => s.slotMap);
  const collectPixie = useGameStore(s => s.collectPixie);
  const resetToDefaults = useGameStore(s => s.resetPixies);
  
  // Get all pixie actions (from the unified actions layer)
  const allPixies = useMemo(() => getPixies(), []);
  
  // Build a lookup map for pixies
  const pixieMap = useMemo(() => {
    const map = {};
    for (const p of allPixies) {
      map[p.id] = p;
    }
    return map;
  }, [allPixies]);
  
  // Derive equipped from slot map
  const equipped = useMemo(() => {
    return PIXIE_SLOTS
      .map(slot => slotMap[slot.id])
      .filter(Boolean);
  }, [slotMap]);
  
  // Calculate total buffs from equipped pixies
  const activeBuffs = useMemo(() => {
    return calculatePixieBuffs(equipped);
  }, [equipped]);
  
  // Get equipped pixie actions for 3D rendering
  const equippedPixies = useMemo(() => {
    return equipped.map(id => pixieMap[id]).filter(Boolean);
  }, [equipped, pixieMap]);
  
  // Get collected but not equipped
  const unequippedPixies = useMemo(() => {
    return collectedPixies
      .filter(id => !equipped.includes(id))
      .map(id => pixieMap[id])
      .filter(Boolean);
  }, [collectedPixies, equipped, pixieMap]);
  
  return {
    collected: collectedPixies,
    equipped,
    activeBuffs,
    equippedPixies,
    unequippedPixies,
    collectPixie,
    resetToDefaults,
    MAX_EQUIPPED: 3,
    PIXIES: pixieMap, // Legacy compatibility
  };
}

// =============================================================================
// useStateEffect - Run effects on state transitions
// =============================================================================

/**
 * Hook to run effects when entering/leaving specific states.
 * Same API as the old useStateEffect.
 */
export function useStateEffect(targetState, onEnter, onLeave) {
  const onEnterRef = useRef(onEnter);
  const onLeaveRef = useRef(onLeave);
  
  // Keep refs up to date
  useEffect(() => {
    onEnterRef.current = onEnter;
    onLeaveRef.current = onLeave;
  });
  
  useEffect(() => {
    // Check initial state
    const initialState = useGameStore.getState().playerState;
    if (initialState === targetState) {
      onEnterRef.current?.();
    }
    
    // Subscribe to state changes
    const unsubscribe = useGameStore.subscribe(
      (state) => state.playerState,
      (current, previous) => {
        if (current === targetState && previous !== targetState) {
          onEnterRef.current?.();
        }
        if (previous === targetState && current !== targetState) {
          onLeaveRef.current?.();
        }
      }
    );
    
    return unsubscribe;
  }, [targetState]);
}

// =============================================================================
// useAchievements - Achievement tracking hook
// =============================================================================

/**
 * Hook to access and track achievements.
 */
export function useAchievements() {
  const unlockedAchievements = useGameStore(s => s.unlockedAchievements);
  const currentToast = useGameStore(s => s.currentAchievementToast);
  const toastQueue = useGameStore(s => s.achievementToastQueue);
  
  const unlock = useGameStore(s => s.unlockAchievement);
  const isUnlocked = useGameStore(s => s.isAchievementUnlocked);
  const getAllAchievements = useGameStore(s => s.getAllAchievements);
  const getProgress = useGameStore(s => s.getAchievementProgress);
  const dismissToast = useGameStore(s => s.dismissAchievementToast);
  const showNextToast = useGameStore(s => s.showNextAchievementToast);
  const resetToDefaults = useGameStore(s => s.resetAchievements);
  
  // Auto-advance toast queue
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const timer = setTimeout(() => {
        showNextToast();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentToast, toastQueue, showNextToast]);
  
  // Auto-dismiss current toast after delay
  useEffect(() => {
    if (currentToast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentToast, dismissToast]);
  
  return {
    unlock,
    isUnlocked,
    getAllAchievements,
    getProgress,
    currentToast,
    dismissToast,
    resetToDefaults,
  };
}

// =============================================================================
// useActiveClass - Class management hook
// =============================================================================

/**
 * Hook to access and change the active class.
 * The setActiveClass function handles ALL class-scoped state rebinding:
 * - Saves current loadout before switching
 * - Loads new class loadout
 * - Updates allowed skills cache
 * - Resets casting state
 */
export function useActiveClass() {
  const activeClassId = useGameStore(s => s.activeClassId);
  const setActiveClass = useGameStore(s => s.setActiveClass);
  const allowedSkills = useGameStore(s => s.allowedSkills);
  const startNewGame = useGameStore(s => s.startNewGame);
  const loadSavedGame = useGameStore(s => s.loadSavedGame);
  const exportSaveData = useGameStore(s => s.exportSaveData);
  
  return {
    activeClassId,
    setActiveClass,
    allowedSkills,
    startNewGame,
    loadSavedGame,
    exportSaveData,
  };
}

// =============================================================================
// Direct store access for animation loops
// =============================================================================

/**
 * Get the store's getState function for use in animation loops.
 * This avoids the hook overhead and provides ref-like access.
 */
export const getGameState = () => useGameStore.getState();
