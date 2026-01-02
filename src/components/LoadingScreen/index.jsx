import { useState, useEffect, useCallback } from 'react';
import { useProgress } from '@react-three/drei';
import { useKeyMap } from '../../hooks/useKeyMap';
import { useSlotMap } from '../../hooks/useSlotMap';
import { useAchievements } from '../../hooks/useAchievements';
import { usePixies } from '../../hooks/usePixies';
import styles from './styles.module.css';

const MIN_DISPLAY_TIME = 1000; // Minimum 1 second display
const SAVE_KEY = 'kuji_game_started';

// Check if user has previously started a game
const hasSavedProgress = () => localStorage.getItem(SAVE_KEY) === 'true';

// Mark that the game has been started
const markGameStarted = () => localStorage.setItem(SAVE_KEY, 'true');

// Clear the game started flag
const clearGameStarted = () => localStorage.removeItem(SAVE_KEY);

export default function LoadingScreen() {
  const { progress, active } = useProgress();
  const { resetToDefaults: resetKeyMap } = useKeyMap();
  const { resetToDefaults: resetSlotMap } = useSlotMap();
  const { resetToDefaults: resetAchievements } = useAchievements();
  const { resetToDefaults: resetPixies } = usePixies();
  
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [canContinue] = useState(() => hasSavedProgress());
  
  // Wait for font to load before showing content
  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontReady(true);
    });
  }, []);
  
  useEffect(() => {
    // Once loading is complete (progress >= 100 and not active)
    if (progress >= 100 && !active) {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);
      
      // Wait for minimum display time, then show buttons
      const timer = setTimeout(() => {
        setLoadingComplete(true);
      }, remainingTime);
      
      return () => clearTimeout(timer);
    }
  }, [progress, active, startTime]);
  
  const handleStartGame = useCallback(() => {
    // Clear game started flag and reset all game state
    clearGameStarted();
    resetKeyMap();
    resetSlotMap();
    resetAchievements();
    resetPixies();
    
    // Mark game as started and enter
    markGameStarted();
    setFadeOut(true);
    setTimeout(() => setShow(false), 500);
  }, [resetKeyMap, resetSlotMap, resetAchievements, resetPixies]);
  
  const handleContinue = useCallback(() => {
    // Just enter the game with existing progress
    setFadeOut(true);
    setTimeout(() => setShow(false), 500);
  }, []);
  
  if (!show) return null;
  
  return (
    <div className={`${styles.overlay} ${fadeOut ? styles.fadeOut : ''}`}>
      <div className={`${styles.container} ${fontReady ? styles.visible : ''}`}>
        {/* Magical orb with glow */}
        <div className={styles.orbContainer}>
          <div className={styles.orb}>
            <div className={styles.orbInner} />
            <div className={styles.orbShine} />
          </div>
          <div className={styles.orbGlow} />
          
          {/* Orbiting particles - reduced to 4 for performance */}
          <div className={styles.particles}>
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={styles.particle}
                style={{ '--index': i }}
              />
            ))}
          </div>
        </div>
        
        {/* Title */}
        <h1 className={styles.title}>Kuji</h1>
        
        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
            <div className={styles.progressGlow} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressJewels}>
            <div className={`${styles.jewel} ${progress >= 0 ? styles.active : ''}`} />
            <div className={`${styles.jewel} ${progress >= 50 ? styles.active : ''}`} />
            <div className={`${styles.jewel} ${progress >= 100 ? styles.active : ''}`} />
          </div>
        </div>
        
        {/* Loading text or buttons */}
        {!loadingComplete ? (
          <p className={styles.loadingText}>
            Channeling arcane energies...
          </p>
        ) : (
          <div className={styles.buttonContainer}>
            {canContinue && (
              <button 
                className={styles.menuButton}
                onClick={handleContinue}
              >
                Continue
              </button>
            )}
            <button 
              className={`${styles.menuButton} ${canContinue ? styles.menuButtonSecondary : ''}`}
              onClick={handleStartGame}
            >
              New Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
