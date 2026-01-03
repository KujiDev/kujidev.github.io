/**
 * =============================================================================
 * CHARACTER PANEL 3D
 * =============================================================================
 * 
 * Floating panel anchored to a 3D position showing class information.
 * Uses @react-three/drei Html for DOM elements in 3D space.
 * 
 * ARCHITECTURE:
 * =============
 * - All data comes from class config (data-driven)
 * - Visual styling matches game UI theme using CSS variables
 * - Clicking panel selects the class
 * - No game logic - purely visual rendering
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { getDefaultLoadoutForClass, getScopedSkillsForClass } from '@/engine/classes';
import { getActionById } from '@/config/actions';
import styles from './CharacterPanel3D.module.css';

export default function CharacterPanel3D({ 
  classConfig, 
  isSelected = false,
  onClick,
  position = [0, 2.5, 0],
}) {
  // Get starting loadout icons from class config
  const loadoutIcons = useMemo(() => {
    try {
      const loadout = getDefaultLoadoutForClass(classConfig.id);
      const skills = getScopedSkillsForClass(classConfig.id);
      
      // Get first 4 skills from loadout (slot_1 through slot_4)
      const icons = [];
      for (let i = 1; i <= 4; i++) {
        const slotId = `slot_${i}`;
        const actionId = loadout[slotId];
        if (actionId) {
          const action = getActionById(actionId) || skills.find(s => s._skillId === actionId || s.id === actionId);
          if (action?.icon) {
            icons.push({ id: actionId, icon: action.icon, label: action.label || actionId });
          }
        }
      }
      return icons;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`[CharacterPanel3D] Failed to load icons for ${classConfig.id}:`, error);
      }
      return [];
    }
  }, [classConfig.id]);
  
  const classColor = classConfig.ui?.color || '#a89878';
  
  return (
    <Html
      position={position}
      center
      distanceFactor={10}
      occlude={false}
      transform={false}
      sprite={false}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'none',
      }}
    >
      <div 
        className={`${styles.panel} ${isSelected ? styles.selected : ''}`}
        onClick={onClick}
        style={{
          '--class-color': classColor,
        }}
      >
        {/* Class Name */}
        <h3 className={styles.className}>
          {classConfig.name}
        </h3>
        
        {/* Class Tags */}
        {classConfig.tags && classConfig.tags.length > 0 && (
          <div className={styles.tags}>
            {classConfig.tags.slice(0, 2).map(tag => (
              <span key={tag} className={styles.tag}>
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
        
        {/* Short Description */}
        <p className={styles.description}>
          {classConfig.lore?.shortDesc || classConfig.description}
        </p>
        
        {/* Stats Preview */}
        {classConfig.baseStats && (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>HP</span>
              <span className={styles.statValue}>{classConfig.baseStats.maxHealth}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>MP</span>
              <span className={styles.statValue}>{classConfig.baseStats.maxMana}</span>
            </div>
          </div>
        )}
        
        {/* Starting Skills */}
        {loadoutIcons.length > 0 && (
          <div className={styles.loadout}>
            {loadoutIcons.map(({ id, icon, label }) => (
              <div key={id} className={styles.skillIcon} title={label}>
                <img src={icon} alt={label} draggable={false} />
              </div>
            ))}
          </div>
        )}
        
        {/* Selection Indicator */}
        {isSelected && (
          <div className={styles.selectedBadge}>
            ✓ Selected
          </div>
        )}
      </div>
    </Html>
  );
}
