import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { getDefaultKeyMap } from "@/config/actions";

const STORAGE_KEY = 'player_keymap';
const VERSION_KEY = 'player_keymap_version';
const CURRENT_VERSION = 2; // Bump this when default keybindings change

// Mouse button mappings
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

// Save keymap to localStorage
const saveKeyMap = (keyMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyMap));
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  } catch (e) {
    console.warn('Failed to save keymap:', e);
  }
};

// Load keymap from localStorage, merging with defaults for new actions
const loadKeyMap = () => {
  const defaults = getDefaultKeyMap();
  
  try {
    const savedVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10);
    const saved = localStorage.getItem(STORAGE_KEY);
    
    // If version changed, reset to defaults (new/changed keybindings)
    if (savedVersion !== CURRENT_VERSION) {
      console.log(`Keymap version changed (${savedVersion} -> ${CURRENT_VERSION}), resetting to defaults`);
      saveKeyMap(defaults);
      return defaults;
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Build a map of saved custom bindings
      const savedMap = new Map(parsed.map(s => [s.name, s]));
      
      // Merge: use saved bindings where they exist, defaults for new actions
      const merged = defaults.map(def => savedMap.get(def.name) || def);
      
      // Check if we added new actions
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

// Convert key code to display-friendly name
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

  // Get the key code for a specific action
  const getKey = useCallback((actionId) => {
    return keyMap.find(m => m.name === actionId)?.keys[0] || null;
  }, [keyMap]);

  // Get display-friendly key name
  const getDisplayKey = useCallback((actionId) => {
    return formatKeyDisplay(getKey(actionId));
  }, [getKey]);

  // Update a key binding, unbinding any action that previously had this key
  const updateBinding = useCallback((actionName, newKey) => {
    setKeyMap(prev => {
      const updated = prev.map(m => {
        // Assign the new key to the target action
        if (m.name === actionName) {
          return { ...m, keys: [newKey] };
        }
        // Unbind if another action had this key
        if (m.keys[0] === newKey) {
          return { ...m, keys: [] };
        }
        return m;
      });
      saveKeyMap(updated);
      return updated;
    });
  }, []);

  // Start rebinding process for an action
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

