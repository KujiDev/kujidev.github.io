import { usePlayerState } from "@/hooks/usePlayerState";
import styles from "./styles.module.css";

export default function Orb({ type = "health", label = "Health" }) {
  const { mana, maxMana, health, maxHealth } = usePlayerState();
  
  // Calculate fill percentage based on type
  let fillPercent, currentValue;
  if (type === "mana") {
    fillPercent = Math.round((mana / maxMana) * 100);
    currentValue = Math.round(mana);
  } else {
    fillPercent = Math.round((health / maxHealth) * 100);
    currentValue = Math.round(health);
  }
  
  return (
    <div className={`${styles.orb} ${styles[type]}`}>
      <div 
        className={styles["orb-fill"]} 
        style={{ '--fill-percent': `${fillPercent}%` }}
      />
      <span className={styles["orb-label"]}>{label}</span>
      <span className={styles["orb-value"]}>{currentValue}</span>
    </div>
  );
}