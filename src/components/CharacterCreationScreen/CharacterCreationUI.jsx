/**
 * =============================================================================
 * CHARACTER CREATION UI - UI Overlay Only (No Canvas)
 * =============================================================================
 * 
 * Pure UI overlay for character selection. The 3D scene is rendered by the
 * unified canvas in App.jsx, allowing seamless camera transitions.
 * 
 * This component:
 * - Shows class selection UI
 * - Displays class info panels
 * - Handles "Begin Adventure" button
 * - Fades out during transition
 */

import { useState, useCallback, useMemo } from 'react';
import { getClasses, getDefaultLoadoutForClass, getScopedSkillsForClass } from '@/engine/classes';
import { getActionById } from '@/config/actions';
import { useActiveClass } from '@/hooks/useGame';
import styles from './styles.module.css';
import sharedStyles from '@/ui/shared.module.css';

/**
 * Character Creation UI - overlays the unified canvas
 */
export default function CharacterCreationUI({ 
  selectedClassId, 
  onSelectClass,
  onComplete 
}) {
  const classes = useMemo(() => getClasses(), []);
  const { startNewGame } = useActiveClass();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId),
    [classes, selectedClassId]
  );
  
  // Get starting skills with icons for the selected class
  const loadoutIcons = useMemo(() => {
    if (!selectedClassId) return [];
    try {
      const loadout = getDefaultLoadoutForClass(selectedClassId);
      const skills = getScopedSkillsForClass(selectedClassId);
      
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
        console.warn(`[CharacterCreation] Failed to load skill icons for ${selectedClassId}:`, error);
      }
      return [];
    }
  }, [selectedClassId]);
  
  const handleSelectClass = useCallback((classId) => {
    onSelectClass?.(classId);
    
    if (import.meta.env.DEV) {
      const cls = classes.find(c => c.id === classId);
      console.log(`[DEBUG][CharacterCreation] Selected: ${classId} (${cls?.name || 'unknown'})`);
    }
  }, [classes, onSelectClass]);
  
  const handleConfirm = useCallback(() => {
    if (!selectedClassId || isConfirming) return;
    
    setIsConfirming(true);
    setIsTransitioning(true);
    
    if (import.meta.env.DEV) {
      const loadout = getDefaultLoadoutForClass(selectedClassId);
      console.log('[DEBUG][CharacterCreation] ============================================');
      console.log(`[DEBUG][CharacterCreation] selectedClass=${selectedClassId}`);
      console.log(`[DEBUG][CharacterCreation] Starting seamless transition...`);
      console.log('[DEBUG][CharacterCreation] ============================================');
    }
    
    // Initialize new game with selected class
    startNewGame(selectedClassId);
    
    // Complete immediately - the seamless transition handles the timing
    onComplete(selectedClassId);
  }, [selectedClassId, startNewGame, onComplete, isConfirming]);
  
  return (
    <div className={styles.overlay} style={{ background: 'transparent' }}>
      {/* UI Overlay - hide during transition for seamless effect */}
      <div className={`${styles.uiOverlay} ${isTransitioning ? styles.uiHidden : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Choose Your Class</h1>
          <p className={styles.subtitle}>
            Click on a character to select, then begin your adventure
          </p>
        </div>
        
        {/* Spacer to push content down */}
        <div style={{ flex: 1 }} />
        
        {/* Side panels container */}
        <div className={styles.sidePanels}>
          {/* Left panel - Lore */}
          {selectedClass && (
            <div 
              className={styles.lorePanel}
              style={{ '--class-color': selectedClass.ui?.color || '#a89878' }}
            >
              <h3 className={styles.lorePanelTitle}>
                {selectedClass.name}
              </h3>
              <p className={styles.lorePanelText}>
                {selectedClass.lore?.fullDesc || selectedClass.description || 'A mysterious adventurer ready to face the unknown.'}
              </p>
            </div>
          )}
          
          {/* Right panel - Stats & Skills */}
          {selectedClass && (
            <div 
              className={styles.classInfoPanel}
              style={{ '--class-color': selectedClass.ui?.color || '#a89878' }}
            >
              <h3 className={styles.panelClassName}>
                {selectedClass.name}
              </h3>
              
              {selectedClass.tags && selectedClass.tags.length > 0 && (
                <div className={styles.panelTags}>
                  {selectedClass.tags.slice(0, 2).map(tag => (
                    <span key={tag} className={styles.panelTag}>
                      {tag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              <p className={styles.panelDescription}>
                {selectedClass.lore?.shortDesc || selectedClass.description}
              </p>
              
              {selectedClass.baseStats && (
                <div className={styles.panelStats}>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>HP</span>
                    <span className={styles.panelStatValue}>{selectedClass.baseStats.maxHealth}</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>MP</span>
                    <span className={styles.panelStatValue}>{selectedClass.baseStats.maxMana}</span>
                  </div>
                </div>
              )}
              
              {loadoutIcons.length > 0 && (
                <div className={styles.panelLoadout}>
                  {loadoutIcons.map(({ id, icon, label }) => (
                    <div key={id} className={styles.panelSkillIcon} title={label}>
                      <img src={icon} alt={label} draggable={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Confirm button - bottom center */}
        <div className={styles.bottomActions}>
          <div className={styles.characterButtons}>
            {classes.map(cls => (
              <button
                key={cls.id}
                className={`${styles.characterButton} ${selectedClassId === cls.id ? styles.characterButtonSelected : ''}`}
                onClick={() => handleSelectClass(cls.id)}
                style={{ '--class-color': cls.ui?.color || '#a89878' }}
              >
                {cls.name}
              </button>
            ))}
          </div>
          
          <button
            className={sharedStyles['button-primary-lg']}
            onClick={handleConfirm}
            disabled={!selectedClassId || isConfirming}
          >
            {isConfirming ? 'Creating Character...' : 'Begin Adventure'}
          </button>
        </div>
      </div>
    </div>
  );
}
