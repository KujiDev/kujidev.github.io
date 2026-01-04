/**
 * =============================================================================
 * ELEMENTAL SYSTEM
 * =============================================================================
 * 
 * Unified color palette for all elemental effects across UI and 3D.
 * Each element defines colors for different use cases to ensure visual consistency.
 */

export const ELEMENTS = {
  ice: {
    id: 'ice',
    name: 'Ice',
    primary: '#5ba4d0',    // Cool cyan-blue - main UI color
    secondary: '#8ed3f7',  // Light ice highlight - accents
    glow: '#5ba4d0',       // 3D emissive color
    dark: '#1a3a4a',       // Deep shadow for UI depth
  },
  fire: {
    id: 'fire',
    name: 'Fire',
    primary: '#e85a30',    // Warm orange-red
    secondary: '#ffa040',  // Hot yellow-orange highlight
    glow: '#ff6b35',
    dark: '#4a1a10',
  },
  arcane: {
    id: 'arcane',
    name: 'Arcane',
    primary: '#9070c0',    // Rich purple
    secondary: '#c0a8e8',  // Light lavender highlight
    glow: '#bb77ff',       // Matches ShieldEffect aura
    dark: '#2a1a3a',
  },
  mana: {
    id: 'mana',
    name: 'Mana',
    primary: '#4080ff',    // Deep blue
    secondary: '#80c0ff',  // Bright sky blue
    glow: '#60a0ff',
    dark: '#0d1a3a',
  },
  healing: {
    id: 'healing',
    name: 'Healing',
    primary: '#e85050',    // Warm red
    secondary: '#ff8080',  // Soft pink highlight
    glow: '#ff6b6b',
    dark: '#3a1010',
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    primary: '#40ff80',    // Verdant green
    secondary: '#80ffa0',  // Light green highlight
    glow: '#20ff60',
    dark: '#0a3a1a',
  },
  holy: {
    id: 'holy',
    name: 'Holy',
    primary: '#f0d890',    // Warm gold
    secondary: '#fff8e0',  // Bright white-gold
    glow: '#ffd700',       // Divine golden glow
    dark: '#3a3010',
  },
  physical: {
    id: 'physical',
    name: 'Physical',
    primary: '#c0c0c0',    // Steel silver
    secondary: '#e8e8e8',  // Bright silver highlight
    glow: '#d0d0d0',       // Metallic glow
    dark: '#2a2a2a',
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    primary: '#a0d0ff',    // Electric blue
    secondary: '#e0f0ff',  // Bright white-blue
    glow: '#80c0ff',       // Electric arc glow
    dark: '#1a2a4a',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    primary: '#6040a0',    // Dark purple
    secondary: '#9070c0',  // Lighter purple
    glow: '#8040c0',       // Shadowy violet glow
    dark: '#1a0a2a',
  },
};

/**
 * Get element data by ID
 * @param {string} elementId 
 * @returns {object|null}
 */
export const getElement = (elementId) => ELEMENTS[elementId] || null;
