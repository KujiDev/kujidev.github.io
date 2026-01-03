/**
 * =============================================================================
 * CLASS CONTENT HOOK - Class-Scoped Entity Access (THIN ADAPTER)
 * =============================================================================
 * 
 * This hook is a THIN ADAPTER between React and the game logic layer.
 * 
 * RULES:
 * ======
 * ✅ Calls game logic layer for entity resolution
 * ✅ Returns pre-resolved, render-ready props
 * ✅ Memoizes based on classId
 * 
 * ❌ NO domain logic
 * ❌ NO filtering (game layer does that)
 * ❌ NO interpretation of what entities are
 * 
 * USAGE:
 * ======
 * const { skills, consumables, pixies, classId } = useClassContent();
 * 
 * // skills, consumables, pixies are ALREADY RESOLVED for rendering
 * // Components just spread props, no interpretation needed
 */

import { useMemo, useEffect } from 'react';
import { useCurrentClass } from '@/App';
import { useSlotMap, usePixies } from '@/hooks/useGame';
import { getClassById } from '@/engine/classes';
import { getPanelById } from '@/engine/panels';
import { 
  createClassInstance,
  resolveSkillsForClass,
  resolveConsumablesForClass,
  resolvePixiesForClass,
} from '@/game';

/**
 * Get class-scoped, pre-resolved entity lists.
 * Returns render-ready props for the current class's entities.
 * 
 * THIN ADAPTER: Calls game layer, returns resolved data.
 */
export function useClassContent() {
  const { classId } = useCurrentClass();
  const { slotMap } = useSlotMap();
  const { collectedPixies } = usePixies();
  
  // Create class instance (pure game logic)
  const classInstance = useMemo(
    () => createClassInstance(classId),
    [classId]
  );
  
  // Resolution context for the game layer
  const context = useMemo(
    () => ({ slotMap, collectedPixies }),
    [slotMap, collectedPixies]
  );
  
  // Get pre-resolved, render-ready entities from game layer
  const skills = useMemo(
    () => resolveSkillsForClass(classInstance, context),
    [classInstance, context]
  );
  
  const consumables = useMemo(
    () => resolveConsumablesForClass(classInstance, context),
    [classInstance, context]
  );
  
  const pixies = useMemo(
    () => resolvePixiesForClass(classInstance, context),
    [classInstance, context]
  );
  
  // DEBUG: Warn about missing content in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const classConfig = getClassById(classId);
      const className = classConfig?.name || classId;
      
      if (skills.length === 0 && classConfig?.allowedSkills?.length > 0) {
        console.warn(`[DEBUG][${className}] ✖ 0 skills resolved from ${classConfig.allowedSkills.length} declared`);
      }
      if (pixies.length === 0 && classConfig?.collectablePixies?.length > 0) {
        console.warn(`[DEBUG][${className}] ✖ 0 pixies resolved from ${classConfig.collectablePixies.length} declared`);
      }
    }
  }, [classId, skills, pixies]);
  
  return {
    classId,
    classInstance,
    skills,
    consumables,
    pixies,
  };
}

/**
 * Get resolved skills for the current class.
 * Returns render-ready skill props.
 */
export function useClassSkills() {
  const { classId } = useCurrentClass();
  const { slotMap } = useSlotMap();
  
  return useMemo(() => {
    const classInstance = createClassInstance(classId);
    return resolveSkillsForClass(classInstance, { slotMap });
  }, [classId, slotMap]);
}

/**
 * Get resolved consumables for the current class.
 * Returns render-ready consumable props.
 */
export function useClassConsumables() {
  const { classId } = useCurrentClass();
  const { slotMap } = useSlotMap();
  
  return useMemo(() => {
    const classInstance = createClassInstance(classId);
    return resolveConsumablesForClass(classInstance, { slotMap });
  }, [classId, slotMap]);
}

/**
 * Get resolved pixies for the current class.
 * Returns render-ready pixie props.
 */
export function useClassPixies() {
  const { classId } = useCurrentClass();
  const { slotMap } = useSlotMap();
  const { collectedPixies } = usePixies();
  
  return useMemo(() => {
    const classInstance = createClassInstance(classId);
    return resolvePixiesForClass(classInstance, { slotMap, collectedPixies });
  }, [classId, slotMap, collectedPixies]);
}

/**
 * Get class-scoped panels with class-specific filter overrides.
 * 
 * This merges base panel config (from panels.json) with class-specific
 * filter overrides (from class.ui.panels). The class config determines:
 * - Which panels are visible
 * - Which filters appear in each panel
 * 
 * If a class doesn't specify filters for a panel, the base panel filters are used.
 * 
 * THIN ADAPTER: Reads from data, returns merged config.
 */
export function useClassPanels() {
  const { classId } = useCurrentClass();
  
  return useMemo(() => {
    const classConfig = getClassById(classId);
    const classPanelConfigs = classConfig?.ui?.panels || [];
    
    // Build merged panels
    return classPanelConfigs.map(classPanel => {
      const basePanel = getPanelById(classPanel.id);
      if (!basePanel) return null;
      
      // Merge: class filters override base filters if provided
      return {
        ...basePanel,
        filters: classPanel.filters || basePanel.filters,
      };
    }).filter(Boolean);
  }, [classId]);
}
