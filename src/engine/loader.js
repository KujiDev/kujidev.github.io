/**
 * =============================================================================
 * DATA LOADER - JSON to Runtime Entity Conversion
 * =============================================================================
 * 
 * This module loads JSON data files and converts them to runtime-ready entities.
 * 
 * ARCHITECTURE:
 * =============
 * - JSON files are the SINGLE SOURCE OF TRUTH
 * - This loader INTERPRETS the data, never defines gameplay logic
 * - All data is validated before use
 * - Asset paths (icons) are resolved at load time
 * 
 * USAGE:
 * ======
 * import { loadClasses, loadSkills, getClassById, getSkillById } from '@/engine/loader';
 * 
 * // Load all data at startup
 * await loadAll();
 * 
 * // Access loaded data
 * const wizard = getClassById('wizard');
 * const iceShard = getSkillById('ice_shard');
 */

// Import JSON data files
import classesData from '@/data/classes/wizard.json';
import skillsData from '@/data/skills/skills.json';
import statusesData from '@/data/statuses/statuses.json';
import pixesData from '@/data/pixes/pixes.json';
import achievementsData from '@/data/achievements/achievements.json';
import statsData from '@/data/stats/stats.json';
import animationsData from '@/data/animations/animations.json';
import graphsData from '@/data/graphs/graphs.json';

// Icon imports - mapped by filename
import iceShardIcon from '@/assets/icons/ice-shard.svg';
import meteorIcon from '@/assets/icons/meteor.svg';
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';
import manaBodyIcon from '@/assets/icons/mana-body.svg';
import arcaneBoltIcon from '@/assets/icons/arcane-bolt.svg';
import arcaneBlastIcon from '@/assets/icons/arcane-blast.svg';
import healthPotionIcon from '@/assets/icons/health-potion.svg';
import foodIcon from '@/assets/icons/food.svg';
import pixieVerdantIcon from '@/assets/icons/pixie-verdant.svg';
import pixieAzureIcon from '@/assets/icons/pixie-azure.svg';
import pixieVioletIcon from '@/assets/icons/pixie-violet.svg';
import pixieCrimsonIcon from '@/assets/icons/pixie-crimson.svg';

// =============================================================================
// ASSET RESOLUTION
// =============================================================================

/**
 * Map of icon filenames to imported assets.
 * Add new icons here as they're added to assets.
 */
const ICON_MAP = {
  'ice-shard.svg': iceShardIcon,
  'meteor.svg': meteorIcon,
  'arcane-rush.svg': arcaneRushIcon,
  'mana-body.svg': manaBodyIcon,
  'arcane-bolt.svg': arcaneBoltIcon,
  'arcane-blast.svg': arcaneBlastIcon,
  'health-potion.svg': healthPotionIcon,
  'food.svg': foodIcon,
  'pixie-verdant.svg': pixieVerdantIcon,
  'pixie-azure.svg': pixieAzureIcon,
  'pixie-violet.svg': pixieVioletIcon,
  'pixie-crimson.svg': pixieCrimsonIcon,
};

/**
 * Resolve an icon path to the actual imported asset.
 */
const resolveIcon = (iconPath) => {
  if (!iconPath) return null;
  const resolved = ICON_MAP[iconPath];
  if (!resolved) {
    console.warn(`[Loader] Unknown icon: ${iconPath}`);
    return null;
  }
  return resolved;
};

// =============================================================================
// REGISTRIES (Populated at load time)
// =============================================================================

const REGISTRIES = {
  classes: new Map(),
  skills: new Map(),
  statuses: new Map(),
  pixes: new Map(),
  achievements: new Map(),
  stats: new Map(),
  animations: new Map(),
  graphs: new Map(),
};

let isLoaded = false;

// =============================================================================
// LOADERS
// =============================================================================

/**
 * Load and process class data.
 * IMPORTANT: Clone objects before mutating - imported JSON may be frozen.
 */
function loadClasses() {
  // For now we have a single class file, but this will expand
  const classes = Array.isArray(classesData) ? classesData : [classesData];
  
  for (const cls of classes) {
    // Clone to avoid mutating frozen imported JSON
    const processed = {
      ...cls,
      ui: cls.ui ? {
        ...cls.ui,
        icon: resolveIcon(cls.ui.icon),
      } : undefined,
    };
    
    REGISTRIES.classes.set(processed.id, Object.freeze(processed));
  }
}

/**
 * Load and process skill data.
 * IMPORTANT: Clone objects before mutating - imported JSON may be frozen.
 */
function loadSkills() {
  for (const skill of skillsData) {
    // Clone to avoid mutating frozen imported JSON
    const resolvedIcon = skill.ui?.icon ? resolveIcon(skill.ui.icon) : null;
    
    // ASSERTION: Icon resolution must succeed for all skills with icons defined
    if (import.meta.env.DEV && skill.ui?.icon && !resolvedIcon) {
      console.error(`[LOADER ASSERTION FAILED] Skill "${skill.id}" has icon "${skill.ui.icon}" but resolution failed!`);
    }
    
    const processed = {
      ...skill,
      ui: skill.ui ? {
        ...skill.ui,
        icon: resolvedIcon,
      } : undefined,
    };
    
    REGISTRIES.skills.set(processed.id, Object.freeze(processed));
  }
}

/**
 * Load and process status effect data.
 * IMPORTANT: Clone objects before mutating - imported JSON may be frozen.
 */
function loadStatuses() {
  for (const status of statusesData) {
    // Clone to avoid mutating frozen imported JSON
    const processed = {
      ...status,
      visual: status.visual ? {
        ...status.visual,
        icon: resolveIcon(status.visual.icon),
      } : undefined,
    };
    
    REGISTRIES.statuses.set(processed.id, Object.freeze(processed));
  }
}

/**
 * Load and process pixie data.
 * IMPORTANT: Clone objects before mutating - imported JSON may be frozen.
 */
function loadPixes() {
  for (const pix of pixesData) {
    // Clone to avoid mutating frozen imported JSON
    const processed = {
      ...pix,
      visual: pix.visual ? {
        ...pix.visual,
        icon: resolveIcon(pix.visual.icon),
      } : undefined,
    };
    
    REGISTRIES.pixes.set(processed.id, Object.freeze(processed));
  }
}

/**
 * Load and process achievement data.
 */
function loadAchievements() {
  for (const achievement of achievementsData) {
    REGISTRIES.achievements.set(achievement.id, Object.freeze(achievement));
  }
}

/**
 * Load and process stat definitions.
 */
function loadStats() {
  for (const stat of statsData) {
    REGISTRIES.stats.set(stat.id, Object.freeze(stat));
  }
}

/**
 * Load and process animation mappings.
 */
function loadAnimations() {
  for (const anim of animationsData) {
    REGISTRIES.animations.set(anim.modelId, Object.freeze(anim));
  }
}

/**
 * Load and process graph definitions.
 */
function loadGraphs() {
  for (const graph of graphsData) {
    REGISTRIES.graphs.set(graph.id, Object.freeze(graph));
  }
}

// =============================================================================
// MAIN LOADER
// =============================================================================

/**
 * Load all data files. Call this at application startup.
 */
export function loadAll() {
  if (isLoaded) {
    return;
  }
  
  loadClasses();
  loadSkills();
  loadStatuses();
  loadPixes();
  loadAchievements();
  loadStats();
  loadAnimations();
  loadGraphs();
  
  isLoaded = true;
}

// =============================================================================
// AUTO-LOAD ON IMPORT
// =============================================================================

// Automatically load all data when this module is imported
loadAll();

// =============================================================================
// ACCESSORS
// =============================================================================

/**
 * Get a class by ID.
 */
export function getClassById(id) {
  return REGISTRIES.classes.get(id) || null;
}

/**
 * Get all classes.
 */
export function getAllClasses() {
  return Array.from(REGISTRIES.classes.values());
}

/**
 * Get a skill by ID.
 */
export function getSkillById(id) {
  return REGISTRIES.skills.get(id) || null;
}

/**
 * Get all skills.
 */
export function getAllSkills() {
  return Array.from(REGISTRIES.skills.values());
}

/**
 * Get skills for a specific class.
 */
export function getSkillsForClass(classId) {
  return getAllSkills().filter(skill => {
    const classes = skill.restrictions?.classes;
    return !classes || classes.includes(classId);
  });
}

/**
 * Get a status effect by ID.
 */
export function getStatusById(id) {
  return REGISTRIES.statuses.get(id) || null;
}

/**
 * Get all status effects.
 */
export function getAllStatuses() {
  return Array.from(REGISTRIES.statuses.values());
}

/**
 * Get a pixie by ID.
 */
export function getPixById(id) {
  return REGISTRIES.pixes.get(id) || null;
}

/**
 * Get all pixes.
 */
export function getAllPixes() {
  return Array.from(REGISTRIES.pixes.values());
}

/**
 * Get an achievement by ID.
 */
export function getAchievementById(id) {
  return REGISTRIES.achievements.get(id) || null;
}

/**
 * Get all achievements.
 */
export function getAllAchievements() {
  return Array.from(REGISTRIES.achievements.values());
}

/**
 * Get a stat definition by ID.
 */
export function getStatById(id) {
  return REGISTRIES.stats.get(id) || null;
}

/**
 * Get all stat definitions.
 */
export function getAllStats() {
  return Array.from(REGISTRIES.stats.values());
}

/**
 * Get animation mapping for a model.
 */
export function getAnimationMapping(modelId) {
  return REGISTRIES.animations.get(modelId) || null;
}

/**
 * Get a specific animation clip name for a model.
 */
export function getAnimationClip(modelId, animKey) {
  const mapping = REGISTRIES.animations.get(modelId);
  if (!mapping) return null;
  
  const clip = mapping.clips[animKey];
  if (!clip) return null;
  
  // Handle both string and object formats
  return typeof clip === 'string' ? clip : clip.clip;
}

/**
 * Get a graph by ID.
 */
export function getGraphById(id) {
  return REGISTRIES.graphs.get(id) || null;
}

/**
 * Get all graphs.
 */
export function getAllGraphs() {
  return Array.from(REGISTRIES.graphs.values());
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a class can use a skill.
 */
export function canClassUseSkill(classId, skillId) {
  const cls = getClassById(classId);
  const skill = getSkillById(skillId);
  
  if (!cls || !skill) return false;
  
  // Check if skill is in class's allowed skills
  if (!cls.allowedSkills.includes(skillId)) return false;
  
  // Check skill's class restrictions
  const restrictions = skill.restrictions?.classes;
  return !restrictions || restrictions.includes(classId);
}

/**
 * Check if a class can use an element.
 */
export function canClassUseElement(classId, elementId) {
  const cls = getClassById(classId);
  if (!cls) return false;
  
  return cls.allowedElements?.includes(elementId) ?? false;
}

/**
 * Get the default loadout for a class.
 */
export function getDefaultLoadout(classId) {
  const cls = getClassById(classId);
  return cls?.defaultLoadout || {};
}
