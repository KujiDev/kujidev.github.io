import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { getDefaultKeyMap } from "@/config/actions";

const STORAGE_KEY = 'player_keymap';

// Load keymap from localStorage or use defaults
const loadKeyMap = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load keymap from storage:', e);
  }
  return getDefaultKeyMap();
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
      const handler = (event) => {
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

        setRebinding(null);
        window.removeEventListener('keydown', handler);
        resolve(event.code);
      };

      window.addEventListener('keydown', handler);
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

