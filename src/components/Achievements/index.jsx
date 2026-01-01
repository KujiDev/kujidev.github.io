import { useState } from 'react';
import styles from './styles.module.css';
import { useAchievements, RARITY_COLORS } from '@/hooks/useAchievements';

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0012 0V2Z" />
  </svg>
);

export default function Achievements() {
  const [isOpen, setIsOpen] = useState(false);
  const { getAllAchievements, getProgress } = useAchievements();
  
  const achievements = getAllAchievements();
  const progress = getProgress();

  return (
    <>
      <button
        className={`${styles['menu-button']} ${isOpen ? styles['active'] : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle achievements"
      >
        <TrophyIcon />
      </button>

      {isOpen && (
        <div 
          className={styles['achievements-drawer']}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className={styles['drawer-header']}>
            <div className={styles['drawer-title']}>Achievements</div>
            <div className={styles['drawer-progress']}>
              {progress.unlocked}/{progress.total}
            </div>
          </div>

          <div className={styles['progress-bar']}>
            <div 
              className={styles['progress-fill']} 
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className={styles['achievement-list']}>
            {achievements.map((achievement) => {
              const rarity = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
              return (
                <div 
                  key={achievement.id} 
                  className={`${styles['achievement-row']} ${achievement.unlocked ? styles['unlocked'] : styles['locked']}`}
                  style={{ '--rarity-color': rarity.primary, '--rarity-glow': rarity.glow }}
                >
                  <div className={styles['achievement-icon']}>
                    {achievement.icon}
                  </div>
                  <div className={styles['achievement-info']}>
                    <span className={styles['achievement-name']}>{achievement.name}</span>
                    <span className={styles['achievement-desc']}>{achievement.description}</span>
                  </div>
                  {achievement.unlocked && (
                    <div className={styles['achievement-check']}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
