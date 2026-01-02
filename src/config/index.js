/**
 * =============================================================================
 * GAME CONFIGURATION - SINGLE SOURCE OF TRUTH
 * =============================================================================
 * 
 * This folder contains all game data and rules. Components should NEVER define
 * gameplay logic - they only consume and render.
 * 
 * Architecture Decision: Zustand over Context
 * ============================================
 * Rationale:
 * 1. Performance: Game ticks every 100ms update mana/health/buffs. Context would
 *    trigger cascading re-renders across all consumers.
 * 2. Selectors: Components subscribe to exactly what they need. A mana orb doesn't
 *    re-render when buffs change.
 * 3. No provider nesting: Eliminates 7+ levels of Context wrapping.
 * 4. Hot path optimization: Direct state access, no context lookup overhead.
 * 5. Refs built-in: getState() provides ref-like access without useRef patterns.
 * 
 * File Structure:
 * - /config/index.js      - Re-exports all config
 * - /config/actions.js    - All player actions (skills, attacks, consumables)
 * - /config/pixies.js     - Pixie definitions and buffs
 * - /config/elements.js   - Elemental types and colors
 * - /config/buffs.js      - Buff definitions and stacking rules
 * - /config/stats.js      - Base stats, caps, regen rates
 * - /config/slots.js      - UI slot definitions
 */

// Re-export all configuration
export * from './elements';
export * from './stats';
export * from './buffs';
export * from './actions';
export * from './pixies';
export * from './slots';
