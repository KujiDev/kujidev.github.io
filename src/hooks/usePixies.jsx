import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useSlotMap, PIXIE_SLOTS } from './useSlotMap';

// Import pixie icons
import pixieVerdantIcon from '@/assets/icons/pixie-verdant.svg';
import pixieAzureIcon from '@/assets/icons/pixie-azure.svg';
import pixieVioletIcon from '@/assets/icons/pixie-violet.svg';
import pixieCrimsonIcon from '@/assets/icons/pixie-crimson.svg';

const STORAGE_KEY = 'player_pixies';
const MAX_EQUIPPED = 3;

/**
 * Pixie definitions with their buffs
 * Similar to Lineage 2 Cubics / Zelda fairies
 */
export const PIXIES = {
  verdant: {
    id: 'verdant',
    name: 'Verdant Sprite',
    description: 'A gentle forest spirit that mends wounds over time',
    color: '#40ff80',
    glowColor: '#20ff60',
    icon: pixieVerdantIcon,
    dragType: 'pixie',
    buff: {
      type: 'healthRegen',
      value: 3, // +3 HP/sec
    },
  },
  azure: {
    id: 'azure',
    name: 'Azure Wisp',
    description: 'A mystical wisp that restores magical energy',
    color: '#40a0ff',
    glowColor: '#2080ff',
    icon: pixieAzureIcon,
    dragType: 'pixie',
    buff: {
      type: 'manaRegen',
      value: 4, // +4 MP/sec
    },
  },
  violet: {
    id: 'violet',
    name: 'Violet Shimmer',
    description: 'An arcane spirit that expands your mana pool',
    color: '#a040ff',
    glowColor: '#8020ff',
    icon: pixieVioletIcon,
    dragType: 'pixie',
    buff: {
      type: 'maxMana',
      value: 25, // +25 Max MP
    },
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Ember',
    description: 'A fiery sprite that bolsters your vitality',
    color: '#ff6040',
    glowColor: '#ff4020',
    icon: pixieCrimsonIcon,
    dragType: 'pixie',
    buff: {
      type: 'maxHealth',
      value: 25, // +25 Max HP
    },
  },
};

const PixiesContext = createContext(null);

const loadPixieState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.collected || ['verdant', 'azure', 'violet', 'crimson'];
    }
  } catch (e) {
    console.warn('Failed to load pixies:', e);
  }
  // Start with all pixies collected for demo purposes
  return ['verdant', 'azure', 'violet', 'crimson'];
};

const savePixieState = (collected) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collected }));
  } catch (e) {
    console.warn('Failed to save pixies:', e);
  }
};

export function PixiesProvider({ children }) {
  const [collected, setCollected] = useState(loadPixieState);
  const { slotMap } = useSlotMap();

  // Derive equipped from slot map - use slotMap directly for stable reference
  const equipped = useMemo(() => {
    return PIXIE_SLOTS
      .map(slot => slotMap[slot.id])
      .filter(Boolean);
  }, [slotMap]);

  // Save state whenever collected changes
  useEffect(() => {
    savePixieState(collected);
  }, [collected]);

  // Collect a new pixie
  const collectPixie = useCallback((pixieId) => {
    if (!PIXIES[pixieId]) return false;
    
    setCollected(prev => {
      if (prev.includes(pixieId)) return prev;
      return [...prev, pixieId];
    });
    return true;
  }, []);

  // Calculate total buffs from equipped pixies
  const activeBuffs = useMemo(() => {
    const buffs = {
      healthRegen: 0,
      manaRegen: 0,
      maxHealth: 0,
      maxMana: 0,
    };
    
    equipped.forEach(pixieId => {
      const pixie = PIXIES[pixieId];
      if (pixie?.buff) {
        buffs[pixie.buff.type] += pixie.buff.value;
      }
    });
    
    return buffs;
  }, [equipped]);

  // Get equipped pixie data for 3D rendering
  const equippedPixies = useMemo(() => {
    return equipped.map(id => PIXIES[id]).filter(Boolean);
  }, [equipped]);

  // Get collected but not equipped
  const unequippedPixies = useMemo(() => {
    return collected
      .filter(id => !equipped.includes(id))
      .map(id => PIXIES[id])
      .filter(Boolean);
  }, [collected, equipped]);

  const value = useMemo(() => ({
    collected,
    equipped,
    activeBuffs,
    equippedPixies,
    unequippedPixies,
    collectPixie,
    MAX_EQUIPPED,
    PIXIES,
  }), [collected, equipped, activeBuffs, equippedPixies, unequippedPixies, collectPixie]);

  return (
    <PixiesContext.Provider value={value}>
      {children}
    </PixiesContext.Provider>
  );
}

export function usePixies() {
  const context = useContext(PixiesContext);
  if (!context) {
    throw new Error('usePixies must be used within a PixiesProvider');
  }
  return context;
}
