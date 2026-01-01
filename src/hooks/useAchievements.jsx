import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'player_achievements';

export const ACHIEVEMENTS = {
  first_cast: {
    id: 'first_cast',
    name: 'Apprentice Mage',
    description: 'Cast your first spell',
    icon: '✨',
    rarity: 'common',
  },
  potion_master: {
    id: 'potion_master',
    name: 'Potion Master',
    description: 'Use a health potion to restore your vitality',
    icon: '🧪',
    rarity: 'common',
  },
};

export const RARITY_COLORS = {
  common: { primary: '#9d9d9d', glow: 'rgba(157, 157, 157, 0.5)' },
  uncommon: { primary: '#1eff00', glow: 'rgba(30, 255, 0, 0.5)' },
  rare: { primary: '#0070dd', glow: 'rgba(0, 112, 221, 0.5)' },
  epic: { primary: '#a335ee', glow: 'rgba(163, 53, 238, 0.5)' },
  legendary: { primary: '#ff8000', glow: 'rgba(255, 128, 0, 0.6)' },
};

const AchievementContext = createContext(null);

const loadUnlocked = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load achievements:', e);
  }
  return new Set();
};

const saveUnlocked = (unlocked) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch (e) {
    console.warn('Failed to save achievements:', e);
  }
};

export function AchievementProvider({ children }) {
  const [unlocked, setUnlocked] = useState(loadUnlocked);
  const [toastQueue, setToastQueue] = useState([]);
  const [currentToast, setCurrentToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (currentToast === null && toastQueue.length > 0 && !isProcessingRef.current) {
      isProcessingRef.current = true;
      
      // Small delay before showing next toast
      const showTimer = setTimeout(() => {
        const [next, ...rest] = toastQueue;
        setCurrentToast(next);
        setToastQueue(rest);
        
        // Auto-dismiss after animation
        toastTimeoutRef.current = setTimeout(() => {
          setCurrentToast(null);
          isProcessingRef.current = false;
        }, 4000);
      }, 300);
      
      return () => clearTimeout(showTimer);
    }
  }, [currentToast, toastQueue]);

  const isUnlocked = useCallback((achievementId) => {
    return unlocked.has(achievementId);
  }, [unlocked]);

  const unlock = useCallback((achievementId) => {
    if (unlocked.has(achievementId)) return false;
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return false;

    setUnlocked(prev => {
      const updated = new Set(prev);
      updated.add(achievementId);
      saveUnlocked(updated);
      return updated;
    });

    setToastQueue(prev => [...prev, achievement]);
    
    return true;
  }, [unlocked]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setCurrentToast(null);
  }, []);

  const getAllAchievements = useCallback(() => {
    return Object.values(ACHIEVEMENTS).map(a => ({
      ...a,
      unlocked: unlocked.has(a.id),
    }));
  }, [unlocked]);

  const getProgress = useCallback(() => {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlockedCount = unlocked.size;
    return { unlocked: unlockedCount, total, percent: Math.round((unlockedCount / total) * 100) };
  }, [unlocked]);

  const value = {
    unlock,
    isUnlocked,
    getAllAchievements,
    getProgress,
    currentToast,
    dismissToast,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
}
