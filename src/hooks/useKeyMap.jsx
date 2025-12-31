import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { getDefaultKeyMap } from "@/config/actions";

const STORAGE_KEY = 'player_keymap';

// Load keymap from localStorage or use defaults
const loadKeyMap = () => {
  const defaults = getDefaultKeyMap();
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Merge saved keymap with defaults to handle new actions
      // This ensures new skills get their default keys
      const merged = defaults.map(defaultBinding => {
        const savedBinding = parsed.find(s => s.name === defaultBinding.name);
        return savedBinding || defaultBinding;
      });
      
      // Save the merged version if we added new bindings
      if (merged.length !== parsed.length) {
        saveKeyMap(merged);
      }
      
      return merged;
    }
  } catch (e) {
    console.warn('Failed to load keymap from storage:', e);
  }
  return defaults;
};

// Save keymap to localStorage
const saveKeyMap = (keyMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyMap));
  } catch (e) {
    console.warn('Failed to save keymap to storage:', e);
  }
};

const KeyMapContext = createContext(null);

export function KeyMapProvider({ children }) {
  const [keyMap, setKeyMap] = useState(loadKeyMap);
  const [rebinding, setRebinding] = useState(null); // Currently rebinding action name

  // Get the key for a specific action
  const getKey = useCallback((actionId) => {
    const binding = keyMap.find(m => m.name === actionId);
    return binding?.keys[0] || null;
  }, [keyMap]);

  // Get display-friendly key name
  const getDisplayKey = useCallback((actionId) => {
    const key = getKey(actionId);
    if (!key) return '?';
    
    // Handle mouse buttons
    if (key === 'MouseLeft') return 'LMB';
    if (key === 'MouseRight') return 'RMB';
    if (key === 'MouseMiddle') return 'MMB';
    
    // Convert KeyQ -> Q, ShiftLeft -> Shift, etc.
    return key
      .replace('Key', '')
      .replace('Left', '')
      .replace('Right', '')
      .replace('Digit', '');
  }, [getKey]);

  // Start rebinding process for an action
  const startRebind = useCallback((actionName) => {
    setRebinding(actionName);
    
    return new Promise((resolve) => {
      const keyHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        setKeyMap((prev) => {
          const newMap = prev.map((m) =>
            m.name === actionName
              ? { ...m, keys: [event.code] }
              : m
          );
          saveKeyMap(newMap);
          return newMap;
        });

        cleanup();
        resolve(event.code);
      };
      
      const pointerHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Map pointer buttons to our key format
        // pointerType can be 'mouse', 'pen', 'touch'
        const mouseKey = event.button === 0 ? 'MouseLeft' 
          : event.button === 2 ? 'MouseRight' 
          : event.button === 1 ? 'MouseMiddle' 
          : null;
        
        if (!mouseKey) return;
        
        setKeyMap((prev) => {
          const newMap = prev.map((m) =>
            m.name === actionName
              ? { ...m, keys: [mouseKey] }
              : m
          );
          saveKeyMap(newMap);
          return newMap;
        });

        cleanup();
        resolve(mouseKey);
      };
      
      const contextHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      
      const cleanup = () => {
        setRebinding(null);
        document.removeEventListener('keydown', keyHandler, true);
        document.removeEventListener('pointerdown', pointerHandler, true);
        document.removeEventListener('contextmenu', contextHandler, true);
      };

      // Use requestAnimationFrame + setTimeout to ensure we're past the current click
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Use capture phase (true) to get events before other handlers
          document.addEventListener('keydown', keyHandler, true);
          document.addEventListener('pointerdown', pointerHandler, true);
          document.addEventListener('contextmenu', contextHandler, true);
        }, 0);
      });
    });
  }, []);

  // Cancel current rebind
  const cancelRebind = useCallback(() => {
    setRebinding(null);
  }, []);

  // Reset to defaults
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

