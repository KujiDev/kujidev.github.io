/**
 * =============================================================================
 * GAME CONFIGURATION - SINGLE SOURCE OF TRUTH
 * =============================================================================
 * 
 * This folder contains runtime configuration and helpers.
 * Entity data is defined in JSON files at /data/ and loaded by /engine/.
 * 
 * Architecture:
 * =============
 * - /data/              - JSON entity definitions (classes, skills, statuses, etc.)
 * - /engine/            - Data loader and runtime systems
 * - /config/actions.js  - Action bridge (exports from engine)
 * - /config/elements.js - Elemental types and colors
 * - /config/stats.js    - Base stats, FSM states
 * - /config/slots.js    - UI slot definitions
 * - /config/achievements.js - Achievement definitions
 * 
 * State Management: Zustand stores in /stores/
 */

// Re-export all configuration
export * from './elements';
export * from './stats';
export * from './actions';
export * from './slots';
export * from './achievements';

// Re-export from entities (canonical source for buffs/pixies)
export * from './entities/buffs';
export * from './entities/pixies';
