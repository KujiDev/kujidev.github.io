import { usePlayerState } from "@/hooks/usePlayerState";
import styles from "./styles.module.css";

export default function Orb({ type = "health", label = "Health" }) {
  const { mana, maxMana } = usePlayerState();
  
  // Calculate fill percentage based on type
  const fillPercent = type === "mana" 
    ? Math.round((mana / maxMana) * 100) 
    : 100; // Health is always full for now
  
  return (
    <div className={`${styles.orb} ${styles[type]}`}>
      <div 
        className={styles["orb-fill"]} 
        style={{ '--fill-percent': `${fillPercent}%` }}
      />
      <span className={styles["orb-label"]}>{label}</span>
      {type === "mana" && (
        <span className={styles["orb-value"]}>{Math.round(mana)}</span>
      )}
    </div>
  );
}