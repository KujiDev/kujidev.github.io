/**
 * =============================================================================
 * CHARACTER CREATION SCREEN
 * =============================================================================
 * 
 * Allows player to select a class when starting a new game.
 * Features a 3D campfire scene with class models.
 * 
 * ARCHITECTURE:
 * =============
 * - R3F scene shows Town/Campfire with class models
 * - Reads available classes from engine (data-driven)
 * - React only renders visual props - no game logic
 * - On confirm: calls startNewGame(classId) and navigates to game
 * 
 * FLOW:
 * =====
 * LoadingScreen (New Game) → CharacterCreationScreen → GameScene
 */

import { useState, useCallback, useMemo, Suspense } from 'react';
import { getClasses, getDefaultLoadoutForClass, getScopedSkillsForClass } from '@/engine/classes';
import { getActionById } from '@/config/actions';
import { useActiveClass } from '@/hooks/useGame';
import CharacterSelectionScene from './CharacterSelectionScene';
import styles from './styles.module.css';
import sharedStyles from '@/ui/shared.module.css';

/**
 * Loading fallback for 3D scene
 */
function SceneLoadingFallback() {
  return (
    <div className={styles.sceneFallback}>
      <div className={styles.fallbackSpinner}></div>
      <p>Loading character models...</p>
    </div>
  );
}

/**
 * Main character creation screen
 */
export default function CharacterCreationScreen({ onComplete }) {
  const classes = useMemo(() => getClasses(), []);
  const { startNewGame } = useActiveClass();
  
  // Default to first available class
  const [selectedClassId, setSelectedClassId] = useState(() => classes[0]?.id || 'wizard');
  const [isConfirming, setIsConfirming] = useState(false);
  
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
      
      // Get skills from loadout slots
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
    setSelectedClassId(classId);
    
    if (import.meta.env.DEV) {
      const cls = classes.find(c => c.id === classId);
      console.log(`[DEBUG][CharacterCreation] Selected: ${classId} (${cls?.name || 'unknown'})`);
    }
  }, [classes]);
  
  const handleConfirm = useCallback(() => {
    if (!selectedClassId || isConfirming) return;
    
    setIsConfirming(true);
    
    // Debug logging
    if (import.meta.env.DEV) {
      const loadout = getDefaultLoadoutForClass(selectedClassId);
      const loadoutSlots = Object.keys(loadout).length;
      
      console.log('[DEBUG][CharacterCreation] ============================================');
      console.log(`[DEBUG][CharacterCreation] selectedClass=${selectedClassId}`);
      console.log(`[DEBUG][CharacterCreation] className=${selectedClass?.name}`);
      console.log(`[DEBUG][CharacterCreation] defaultLoadout=${JSON.stringify(loadout)}`);
      console.log(`[DEBUG][CharacterCreation] loadoutSlots=${loadoutSlots}`);
      console.log('[DEBUG][CharacterCreation] ============================================');
    }
    
    // Initialize new game with selected class
    startNewGame(selectedClassId);
    
    // Navigate to game scene
    onComplete(selectedClassId);
  }, [selectedClassId, selectedClass, startNewGame, onComplete, isConfirming]);
  
  return (
    <div className={styles.overlay}>
      {/* R3F Campfire Scene */}
      <div className={styles.sceneContainer}>
        <Suspense fallback={<SceneLoadingFallback />}>
          <CharacterSelectionScene
            selectedClassId={selectedClassId}
            onSelectClass={handleSelectClass}
          />
        </Suspense>
      </div>
      
      {/* Overlay UI */}
      <div className={styles.uiOverlay}>
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
              {/* Class Name */}
              <h3 className={styles.panelClassName}>
                {selectedClass.name}
              </h3>
              
              {/* Tags */}
              {selectedClass.tags && selectedClass.tags.length > 0 && (
                <div className={styles.panelTags}>
                  {selectedClass.tags.slice(0, 2).map(tag => (
                    <span key={tag} className={styles.panelTag}>
                      {tag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Description */}
              <p className={styles.panelDescription}>
                {selectedClass.lore?.shortDesc || selectedClass.description}
              </p>
              
              {/* Stats */}
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
              
              {/* Starting Skills */}
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
