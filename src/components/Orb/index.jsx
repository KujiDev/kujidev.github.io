import { useState } from "react";
import { usePlayerState } from "@/hooks/usePlayerState";
import styles from "./styles.module.css";

export default function Orb({ type = "health", label = "Health" }) {
  const { mana, maxMana, health, maxHealth, regenInfo } = usePlayerState();
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Calculate fill percentage based on type
  let fillPercent, currentValue, regen;
  if (type === "mana") {
    fillPercent = Math.round((mana / maxMana) * 100);
    currentValue = Math.round(mana);
    regen = regenInfo.mana;
  } else {
    fillPercent = Math.round((health / maxHealth) * 100);
    currentValue = Math.round(health);
    regen = regenInfo.health;
  }

  // Format regen value with sign
  const formatRegen = (val) => {
    if (val >= 0) return `+${val}`;
    return val.toString();
  };
  
  return (
    <div 
      className={styles.wrapper}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`${styles.orb} ${styles[type]}`}>
        <div 
          className={styles["orb-fill"]} 
          style={{ '--fill-percent': `${fillPercent}%` }}
        />
        <span className={styles["orb-label"]}>{label}</span>
        <span className={styles["orb-value"]}>{currentValue}</span>
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-title"]}>{label} Regeneration</div>
          <div className={styles["tooltip-row"]}>
            <span>Base</span>
            <span className={styles["tooltip-value"]}>{formatRegen(regen.base)}/s</span>
          </div>
          {regen.buff > 0 && (
            <div className={styles["tooltip-row"]}>
              <span>Buff Bonus</span>
              <span className={`${styles["tooltip-value"]} ${styles.bonus}`}>{formatRegen(regen.buff)}/s</span>
            </div>
          )}
          {type === "mana" && regen.drain > 0 && (
            <div className={styles["tooltip-row"]}>
              <span>Active Drain</span>
              <span className={`${styles["tooltip-value"]} ${styles.drain}`}>-{regen.drain}/s</span>
            </div>
          )}
          <div className={`${styles["tooltip-row"]} ${styles.total}`}>
            <span>Total</span>
            <span className={`${styles["tooltip-value"]} ${regen.net >= 0 ? styles.positive : styles.negative}`}>
              {formatRegen(regen.net)}/s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}