import { usePlayerState } from "@/hooks/usePlayerState";
import { useState, useEffect, memo, useMemo } from "react";
import styles from "./styles.module.css";
import arcaneRushIcon from '@/assets/icons/arcane-rush.svg';

const BUFF_INFO = {
  mana_body: {
    description: 'Your body is infused with pure mana, greatly increasing mana regeneration.',
    effect: '+10 Mana per second',
  },
  arcane_rush: {
    description: 'Surging with arcane energy, you knock back enemies on impact.',
    effect: 'Pushes enemies away',
  },
  health_potion: {
    description: 'A restorative potion courses through your veins, healing your wounds.',
    effect: '+8 Health per second',
  },
  food_buff: {
    description: 'An enchanted biscuit infuses you with arcane energy, restoring your mana.',
    effect: '+5 Mana per second',
  },
};

const BuffIcon = memo(function BuffIcon({ buff, now }) {
  const remaining = Math.max(0, (buff.expiresAt - now) / 1000);
  const progress = remaining / buff.duration;
  const [showTooltip, setShowTooltip] = useState(false);
  
  const buffInfo = BUFF_INFO[buff.id] || {};
  
  return (
    <div 
      className={styles["buff-wrapper"]}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={styles["buff-icon"]}>
        <img src={buff.icon} alt={buff.name} className={styles["buff-image"]} />
        <div 
          className={styles["buff-sweep"]} 
          style={{ '--progress': progress }}
        />
        <span className={styles["buff-timer"]}>
          {Math.ceil(remaining)}s
        </span>
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-header"]}>
            <span className={styles["tooltip-name"]}>{buff.name}</span>
            <span className={styles["tooltip-type"]}>Buff</span>
          </div>
          {buffInfo.description && (
            <p className={styles["tooltip-desc"]}>{buffInfo.description}</p>
          )}
          {buffInfo.effect && (
            <p className={styles["tooltip-effect"]}>{buffInfo.effect}</p>
          )}
          <p className={styles["tooltip-duration"]}>
            {Math.ceil(remaining)}s remaining
          </p>
          <div className={styles["tooltip-connector"]} />
        </div>
      )}
    </div>
  );
});

const ActiveBuffIcon = memo(function ActiveBuffIcon({ id, name, icon }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buffInfo = BUFF_INFO[id] || {};
  
  return (
    <div 
      className={styles["buff-wrapper"]}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`${styles["buff-icon"]} ${styles["buff-active"]}`}>
        <img src={icon} alt={name} className={styles["buff-image"]} />
        <div className={styles["buff-pulse"]} />
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-header"]}>
            <span className={styles["tooltip-name"]}>{name}</span>
            <span className={`${styles["tooltip-type"]} ${styles["tooltip-type-active"]}`}>Active</span>
          </div>
          {buffInfo.description && (
            <p className={styles["tooltip-desc"]}>{buffInfo.description}</p>
          )}
          {buffInfo.effect && (
            <p className={styles["tooltip-effect"]}>{buffInfo.effect}</p>
          )}
          <p className={styles["tooltip-active-hint"]}>
            Active while held
          </p>
          <div className={styles["tooltip-connector"]} />
        </div>
      )}
    </div>
  );
});

export default function BuffBar() {
  const { buffs, state, activeAction, STATES } = usePlayerState();
  const [now, setNow] = useState(Date.now());
  
  const isArcaneRushActive = state === STATES.MOVING && activeAction === 'skill_3';
  
  const hasTimedBuffs = buffs && buffs.length > 0;
  
  // Only run timer interval when there are timed buffs to update
  useEffect(() => {
    if (!hasTimedBuffs) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    
    return () => clearInterval(interval);
  }, [hasTimedBuffs]);
  
  const hasBuffs = hasTimedBuffs || isArcaneRushActive;
  
  if (!hasBuffs) return null;
  
  return (
    <div className={styles["buff-bar"]}>
      {isArcaneRushActive && (
        <ActiveBuffIcon 
          id="arcane_rush"
          name="Arcane Rush" 
          icon={arcaneRushIcon} 
        />
      )}
      
      {buffs.map(buff => (
        <BuffIcon key={buff.id} buff={buff} now={now} />
      ))}
    </div>
  );
}
