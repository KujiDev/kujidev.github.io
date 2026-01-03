/**
 * =============================================================================
 * DEBUG PANEL - Development-only state inspector
 * =============================================================================
 * 
 * Displays real-time game state for debugging purposes.
 * Only renders in development mode (import.meta.env.DEV).
 * 
 * Toggle visibility with: F12 key or `window.toggleDebugPanel()`
 * 
 * ARCHITECTURE:
 * =============
 * - This component reads from all major stores/hooks
 * - It is PASSIVE - only reads, never writes
 * - All data is derived/computed for display only
 * - Exposes window.DEBUG_CONTEXT for console access
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerState, useSlotMap, useActiveClass } from '@/hooks/useGame';
import { useClassContent } from '@/hooks/useClassContent';
import { getActionById } from '@/engine/actions';
import styles from './styles.module.css';

/**
 * Format a Set for display
 */
function formatSet(set) {
  if (!set || !(set instanceof Set)) return '(empty)';
  const arr = Array.from(set);
  if (arr.length === 0) return '(empty)';
  if (arr.length > 8) return `${arr.slice(0, 8).join(', ')}... (+${arr.length - 8} more)`;
  return arr.join(', ');
}

/**
 * Format a slotMap for display
 */
function formatSlotMap(slotMap) {
  if (!slotMap) return {};
  const result = {};
  for (const [slot, actionId] of Object.entries(slotMap)) {
    if (actionId) {
      result[slot] = actionId;
    }
  }
  return result;
}

/**
 * Debug state section component
 */
function DebugSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={styles.section}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.arrow}>{isOpen ? '▼' : '▶'}</span>
        {title}
      </div>
      {isOpen && (
        <div className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Key-value display row
 */
function DebugRow({ label, value, type = 'string' }) {
  let displayValue = value;
  let valueClass = styles.value;
  
  if (value === null || value === undefined) {
    displayValue = 'null';
    valueClass = `${styles.value} ${styles.null}`;
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'true' : 'false';
    valueClass = `${styles.value} ${value ? styles.true : styles.false}`;
  } else if (typeof value === 'number') {
    displayValue = value.toFixed(type === 'percent' ? 0 : 2);
    valueClass = `${styles.value} ${styles.number}`;
  } else if (typeof value === 'object') {
    displayValue = JSON.stringify(value, null, 2);
    valueClass = `${styles.value} ${styles.object}`;
  }
  
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}:</span>
      <span className={valueClass}>{displayValue}</span>
    </div>
  );
}

/**
 * Main debug panel component
 */
export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  
  // === STORE READS ===
  const activeClassId = useGameStore(s => s.activeClassId);
  const playerState = useGameStore(s => s.playerState);
  const activeAction = useGameStore(s => s.activeAction);
  const castProgress = useGameStore(s => s.castProgress);
  const health = useGameStore(s => s.health);
  const mana = useGameStore(s => s.mana);
  const maxHealth = useGameStore(s => s.maxHealth);
  const maxMana = useGameStore(s => s.maxMana);
  const buffs = useGameStore(s => s.buffs);
  const slotMap = useGameStore(s => s.slotMap);
  const allowedSkills = useGameStore(s => s.allowedSkills);
  const allowedActions = useGameStore(s => s.allowedActions);
  const getEquippedPixies = useGameStore(s => s.getEquippedPixies);
  
  // Derive equipped pixies - must be memoized to avoid infinite loop
  const equippedPixies = useMemo(() => getEquippedPixies(), [getEquippedPixies]);
  
  // === DERIVED CONTENT ===
  const { skills, pixies, consumables } = useClassContent();
  
  // === KEYBOARD TOGGLE ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F12 or backtick to toggle
      if (e.key === 'F12' || e.key === '`') {
        e.preventDefault();
        setIsVisible(v => !v);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // === EXPOSE TO CONSOLE ===
  useEffect(() => {
    const store = useGameStore.getState();
    
    const debugContext = {
      // State
      activeClassId,
      playerState,
      activeAction,
      castProgress,
      health,
      mana,
      maxHealth,
      maxMana,
      buffs,
      slotMap,
      allowedSkills: Array.from(allowedSkills || []),
      allowedActions: Array.from(allowedActions || []),
      equippedPixies,
      
      // Content
      skills,
      pixies,
      consumables,
      
      // Helpers
      getAction: getActionById,
      getStore: () => useGameStore.getState(),
      
      // Game session actions
      startNewGame: store.startNewGame,
      loadSavedGame: store.loadSavedGame,
      exportSaveData: store.exportSaveData,
    };
    
    window.DEBUG_CONTEXT = debugContext;
    window.toggleDebugPanel = () => setIsVisible(v => !v);
    
    return () => {
      delete window.DEBUG_CONTEXT;
      delete window.toggleDebugPanel;
    };
  }, [
    activeClassId, playerState, activeAction, castProgress,
    health, mana, maxHealth, maxMana, buffs, slotMap,
    allowedSkills, allowedActions, equippedPixies,
    skills, pixies, consumables
  ]);
  
  // === COMPUTED VALUES ===
  const filledSlots = useMemo(() => formatSlotMap(slotMap), [slotMap]);
  const activeActionName = useMemo(() => {
    if (!activeAction) return null;
    const action = getActionById(activeAction);
    return action?.name || activeAction;
  }, [activeAction]);
  
  if (!isVisible) {
    return (
      <div className={styles.minimized} onClick={() => setIsVisible(true)}>
        🔧
      </div>
    );
  }
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Debug Panel</span>
        <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>×</button>
      </div>
      
      <div className={styles.content}>
        <DebugSection title="Class & State">
          <DebugRow label="Active Class" value={activeClassId} />
          <DebugRow label="Player State" value={playerState} />
          <DebugRow label="Active Action" value={activeActionName} />
          <DebugRow label="Cast Progress" value={castProgress} type="percent" />
        </DebugSection>
        
        <DebugSection title="Resources">
          <DebugRow label="Health" value={`${health?.toFixed(0) || 0} / ${maxHealth}`} />
          <DebugRow label="Mana" value={`${mana?.toFixed(0) || 0} / ${maxMana}`} />
          <DebugRow label="Active Buffs" value={buffs?.length || 0} />
        </DebugSection>
        
        <DebugSection title="Allowed Actions" defaultOpen={false}>
          <DebugRow label="Skills (execution)" value={formatSet(allowedSkills)} />
          <DebugRow label="Actions (slots)" value={formatSet(allowedActions)} />
        </DebugSection>
        
        <DebugSection title="Slot Map" defaultOpen={false}>
          <pre className={styles.pre}>
            {JSON.stringify(filledSlots, null, 2)}
          </pre>
        </DebugSection>
        
        <DebugSection title="Equipped Pixies" defaultOpen={false}>
          <DebugRow label="Count" value={equippedPixies?.length || 0} />
          <DebugRow label="IDs" value={equippedPixies?.join(', ') || '(none)'} />
        </DebugSection>
        
        <DebugSection title="Class Content" defaultOpen={false}>
          <DebugRow label="Skills" value={skills?.length || 0} />
          <DebugRow label="Pixies" value={pixies?.length || 0} />
          <DebugRow label="Consumables" value={consumables?.length || 0} />
        </DebugSection>
      </div>
      
      <div className={styles.footer}>
        Press <kbd>`</kbd> or <kbd>F12</kbd> to toggle • <code>window.DEBUG_CONTEXT</code>
      </div>
    </div>
  );
}
