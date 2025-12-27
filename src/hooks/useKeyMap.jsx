import { createContext, useCallback, useContext, useState } from "react";

const DEFAULT_KEY_MAP = [
  { name: 'skill_1', keys: ['KeyQ'] },
  { name: 'skill_2', keys: ['KeyW'] },
  { name: 'skill_3', keys: ['KeyE'] },
  { name: 'skill_4', keys: ['KeyR'] },
  { name: 'skill_5', keys: ['ShiftLeft'] },
];

const KeyMapContext = createContext(null);

export function KeyMapProvider({ children }) {
  const [keyMap, setKeyMap] = useState(DEFAULT_KEY_MAP);

  const rebind = useCallback((action) => {
    return new Promise((resolve) => {
      const handler = (event) => {
        event.preventDefault();
        setKeyMap((prev) =>
          prev.map((m) =>
            m.name === action
              ? { ...m, keys: [event.code] }
              : m
          )
        );

        window.removeEventListener('keydown', handler);
        resolve(event.code);
      };

      window.addEventListener('keydown', handler);
    });
  }, []);

  return (
    <KeyMapContext.Provider value={{ keyMap, rebind }}>
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
