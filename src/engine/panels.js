/**
 * =============================================================================
 * PANELS - UI Panel System
 * =============================================================================
 * 
 * Loads and provides access to UI panel configurations.
 * Panels define entity drawers (SpellBook, Consumables, Pixies, etc.)
 * 
 * ARCHITECTURE:
 * =============
 * - Panel definitions live in JSON
 * - This module provides the API to access them
 * - React components read config, never hardcode behavior
 */

import panelsData from '@/data/ui/panels.json';

// Icon imports for panels
import bookIcon from '@/assets/icons/book.svg?raw';
import potionIcon from '@/assets/icons/potion.svg?raw';
import pixieIcon from '@/assets/icons/pixie.svg?raw';

// =============================================================================
// ICON RESOLUTION
// =============================================================================

const PANEL_ICON_MAP = {
  'book.svg': bookIcon,
  'potion.svg': potionIcon,
  'pixie.svg': pixieIcon,
};

/**
 * Resolve a panel icon path to the imported asset.
 */
const resolvePanelIcon = (iconPath) => {
  if (!iconPath) return null;
  return PANEL_ICON_MAP[iconPath] || null;
};

// =============================================================================
// PANEL PROCESSING
// =============================================================================

let PANELS_CACHE = null;
let PANELS_BY_ID = null;

/**
 * Build processed panels with resolved icons.
 */
function buildPanels() {
  if (PANELS_CACHE) return PANELS_CACHE;
  
  PANELS_CACHE = panelsData
    .map(panel => ({
      ...panel,
      resolvedIcon: resolvePanelIcon(panel.icon),
    }))
    .sort((a, b) => a.order - b.order);
  
  // Build ID lookup
  PANELS_BY_ID = {};
  for (const panel of PANELS_CACHE) {
    PANELS_BY_ID[panel.id] = panel;
  }
  
  return PANELS_CACHE;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get all panels, sorted by order.
 */
export function getPanels() {
  return buildPanels();
}

/**
 * Get a panel by ID.
 */
export function getPanelById(panelId) {
  if (!PANELS_BY_ID) buildPanels();
  return PANELS_BY_ID[panelId] || null;
}

/**
 * Get panels for a specific entity type.
 */
export function getPanelsForEntityType(entityType) {
  return getPanels().filter(p => p.entityType === entityType);
}
