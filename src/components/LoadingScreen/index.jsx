import { useState, useEffect, useCallback } from 'react';
import { useProgress } from '@react-three/drei';
import styles from './styles.module.css';

const MIN_DISPLAY_TIME = 1000; // Minimum 1 second display
const SAVE_KEY = 'kuji_game_started';

// Check if user has previously started a game
const hasSavedProgress = () => localStorage.getItem(SAVE_KEY) === 'true';

// Mark that the game has been started
export const markGameStarted = () => localStorage.setItem(SAVE_KEY, 'true');

// Clear the game started flag
export const clearGameStarted = () => localStorage.removeItem(SAVE_KEY);

/**
 * Loading Screen Component
 * 
 * FLOW:
 * - New Game → onNewGame callback (navigates to CharacterCreation)
 * - Continue → onContinue callback (navigates to Game)
 * 
 * @param {Object} props
 * @param {Function} props.onNewGame - Called when "New Game" is clicked
 * @param {Function} props.onContinue - Called when "Continue" is clicked
 */
export default function LoadingScreen({ onNewGame, onContinue }) {
  const { progress, active } = useProgress();
  
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
  
  const handleStartNewGame = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[LOADING SCREEN] New Game selected - navigating to Character Creation');
    }
    
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      onNewGame?.();
    }, 500);
  }, [onNewGame]);
  
  const handleContinue = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[LOADING SCREEN] Continue selected - loading saved game');
    }
    
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      onContinue?.();
    }, 500);
  }, [onContinue]);
  
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
              onClick={handleStartNewGame}
            >
              New Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
