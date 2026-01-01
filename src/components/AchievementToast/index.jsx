import { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { useAchievements, RARITY_COLORS } from '@/hooks/useAchievements';

export default function AchievementToast() {
  const { currentToast, dismissToast } = useAchievements();
  const [phase, setPhase] = useState('hidden'); // hidden, entering, visible, exiting
  
  useEffect(() => {
    if (currentToast) {
      setPhase('entering');
      
      const enterTimer = setTimeout(() => {
        setPhase('visible');
      }, 400);
      
      const exitTimer = setTimeout(() => {
        setPhase('exiting');
      }, 3600);
      
      const hideTimer = setTimeout(() => {
        setPhase('hidden');
      }, 4000);
      
      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setPhase('hidden');
    }
  }, [currentToast]);

  if (!currentToast || phase === 'hidden') return null;

  const rarity = RARITY_COLORS[currentToast.rarity] || RARITY_COLORS.common;

  return (
    <div 
      className={`${styles.toast} ${styles[phase]}`}
      style={{ '--rarity-color': rarity.primary, '--rarity-glow': rarity.glow }}
      onClick={dismissToast}
    >
      <div className={styles['toast-icon']}>{currentToast.icon}</div>
      
      <div className={styles['toast-content']}>
        <div className={styles['toast-label']}>Achievement Unlocked</div>
        <div className={styles['toast-name']}>{currentToast.name}</div>
        <div className={styles['toast-desc']}>{currentToast.description}</div>
      </div>
      
      <div className={styles['toast-progress']}>
        <div className={styles['toast-progress-fill']} />
      </div>
    </div>
  );
}
