/**
 * =============================================================================
 * GAME LOGIC LAYER - PURE, FRAMEWORK-AGNOSTIC
 * =============================================================================
 * 
 * This is the authoritative game logic layer.
 * 
 * RULES:
 * ======
 * ❌ NO React imports
 * ❌ NO JSX
 * ❌ NO DOM access
 * ❌ NO Zustand-specific code
 * ❌ NO hooks
 * 
 * ✅ Pure functions: data in → data out
 * ✅ Deterministic behavior
 * ✅ Testable without React
 * 
 * If you delete React, this code must still work.
 * 
 * EXPORTS:
 * ========
 * - Class instance management
 * - Skill validation and execution
 * - Loadout management
 * - Entity resolution
 */

// Re-export all game logic modules
export * from './classInstance';
export * from './loadout';
export * from './validation';
export * from './execution';
export * from './entities';
