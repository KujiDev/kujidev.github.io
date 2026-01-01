import { useState, useRef } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import styles from './styles.module.css';
import { useAchievements, RARITY_COLORS } from '@/hooks/useAchievements';
import trophyIcon from '@/assets/icons/trophy.svg?raw';

export default function Achievements() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const { getAllAchievements, getProgress } = useAchievements();
  
  const achievements = getAllAchievements();
  const progress = getProgress();

  return (
    <>
      <MenuButton 
        ref={buttonRef}
        icon={<SvgIcon svg={trophyIcon} />}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        label="Toggle achievements"
        tooltip="Achievements"
      />

      <Drawer 
        isOpen={isOpen} 
        anchorRef={buttonRef} 
        width={320}
        portalId="achievements-portal"
      >
        <div className={styles['drawer-header']}>
          <DrawerTitle>Achievements</DrawerTitle>
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

        <ScrollList maxHeight={280} gap={6}>
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
        </ScrollList>
      </Drawer>
    </>
  );
}
