import { usePlayerState } from "@/hooks/usePlayerState";
import { useState, useEffect } from "react";
import styles from "./styles.module.css";

const BuffIcon = ({ buff, now }) => {
  const remaining = Math.max(0, (buff.expiresAt - now) / 1000);
  const progress = remaining / buff.duration;
  
  return (
    <div className={styles["buff-icon"]} title={buff.name}>
      <img src={buff.icon} alt={buff.name} className={styles["buff-image"]} />
      <div 
        className={styles["buff-sweep"]} 
        style={{ '--progress': progress }}
      />
      <span className={styles["buff-timer"]}>
        {Math.ceil(remaining)}s
      </span>
    </div>
  );
};

export default function BuffBar() {
  const { buffs } = usePlayerState();
  const [now, setNow] = useState(Date.now());
  
  // Update timer every 100ms to keep countdown accurate
  useEffect(() => {
    if (!buffs || buffs.length === 0) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    
    return () => clearInterval(interval);
  }, [buffs]);
  
  if (!buffs || buffs.length === 0) return null;
  
  return (
    <div className={styles["buff-bar"]}>
      {buffs.map(buff => (
        <BuffIcon key={buff.id} buff={buff} now={now} />
      ))}
    </div>
  );
}
