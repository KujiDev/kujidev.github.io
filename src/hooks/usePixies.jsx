/**
 * usePixies - Pixie system hook (stub)
 * 
 * This provides pixie-related buffs and bonuses.
 * Currently a stub until the pixie system is implemented.
 */

import { useMemo } from 'react';

/**
 * Hook for accessing pixie system buffs.
 * Returns passive buffs provided by equipped/active pixies.
 */
export function usePixies() {
  const activeBuffs = useMemo(() => ({
    manaRegen: 0,
    healthRegen: 0,
  }), []);

  return {
    activeBuffs,
    pixies: [],
  };
}

export default usePixies;
