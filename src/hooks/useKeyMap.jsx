import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { ALL_SLOTS } from "./useSlotMap";

const STORAGE_KEY = 'player_keymap';

const MOUSE_BUTTONS = {
  0: 'MouseLeft',
  1: 'MouseMiddle', 
  2: 'MouseRight',
};

const MOUSE_DISPLAY = {
  MouseLeft: 'LMB',
  MouseRight: 'RMB',
  MouseMiddle: 'MMB',
};

/**
 * Default key mappings for slots (not actions)
 */
const DEFAULT_SLOT_KEYS = {
  slot_1: 'KeyQ',
  slot_2: 'KeyW',
  slot_3: 'KeyE',
  slot_4: 'KeyR',
  slot_lmb: 'MouseLeft',
  slot_rmb: 'MouseRight',
  slot_consumable_1: 'KeyD',
  slot_consumable_2: 'KeyF',
};

const getDefaultKeyMap = () => 
  ALL_SLOTS.map(slot => ({
    name: slot.id,
    keys: [DEFAULT_SLOT_KEYS[slot.id] || ''],
    label: slot.id.replace('slot_', '').replace('consumable_', 'C').toUpperCase(),
  }));

const saveKeyMap = (keyMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyMap));
  } catch (e) {
    console.warn('Failed to save keymap:', e);
  }
};

const loadKeyMap = () => {
  const defaults = getDefaultKeyMap();
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      
      const savedMap = new Map(parsed.map(s => [s.name, s]));
      
      const merged = defaults.map(def => savedMap.get(def.name) || def);
      
      if (merged.length !== parsed.length) {
        saveKeyMap(merged);
      }
      
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load keymap:', e);
  }
  
  saveKeyMap(defaults);
  return defaults;
};

const formatKeyDisplay = (key) => {
  if (!key) return '?';
  if (MOUSE_DISPLAY[key]) return MOUSE_DISPLAY[key];
  
  return key
    .replace('Key', '')
    .replace('Left', '')
    .replace('Right', '')
    .replace('Digit', '');
};

const KeyMapContext = createContext(null);

export function KeyMapProvider({ children }) {
  const [keyMap, setKeyMap] = useState(loadKeyMap);
  const [rebinding, setRebinding] = useState(null);

  const getKey = useCallback((actionId) => {
    return keyMap.find(m => m.name === actionId)?.keys[0] || null;
  }, [keyMap]);

  const getDisplayKey = useCallback((actionId) => {
    return formatKeyDisplay(getKey(actionId));
  }, [getKey]);

  const updateBinding = useCallback((actionName, newKey) => {
    setKeyMap(prev => {
      const updated = prev.map(m => {
        if (m.name === actionName) {
          return { ...m, keys: [newKey] };
        }
        if (m.keys[0] === newKey) {
          return { ...m, keys: [] };
        }
        return m;
      });
      saveKeyMap(updated);
      return updated;
    });
  }, []);

  const startRebind = useCallback((actionName) => {
    setRebinding(actionName);
    
    return new Promise((resolve) => {
      const handleKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateBinding(actionName, e.code);
        cleanup();
        resolve(e.code);
      };
      
      const handlePointer = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const mouseKey = MOUSE_BUTTONS[e.button];
        if (!mouseKey) return;
        
        updateBinding(actionName, mouseKey);
        cleanup();
        resolve(mouseKey);
      };
      
      const handleContext = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      const cleanup = () => {
        setRebinding(null);
        document.removeEventListener('keydown', handleKey, true);
        document.removeEventListener('pointerdown', handlePointer, true);
        document.removeEventListener('contextmenu', handleContext, true);
      };

      // Delay to avoid capturing the click that triggered rebind
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.addEventListener('keydown', handleKey, true);
          document.addEventListener('pointerdown', handlePointer, true);
          document.addEventListener('contextmenu', handleContext, true);
        }, 0);
      });
    });
  }, [updateBinding]);

  const cancelRebind = useCallback(() => setRebinding(null), []);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultKeyMap();
    setKeyMap(defaults);
    saveKeyMap(defaults);
  }, []);

  const value = useMemo(() => ({
    keyMap,
    getKey,
    getDisplayKey,
    startRebind,
    cancelRebind,
    resetToDefaults,
    rebinding,
  }), [keyMap, getKey, getDisplayKey, startRebind, cancelRebind, resetToDefaults, rebinding]);

  return (
    <KeyMapContext.Provider value={value}>
      {children}
    </KeyMapContext.Provider>
  );
}

export function useKeyMap() {
  const context = useContext(KeyMapContext);
  if (!context) {
    throw new Error('useKeyMap must be used within a KeyMapProvider');
  }
  return context;
}

