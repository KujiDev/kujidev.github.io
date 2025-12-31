import { useState } from 'react';
import Connector from '@/components/Connector';
import styles from "./styles.module.css";

export const Slot = ({ keyBind, icon, active, disabled, tooltip, ...handlers }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
        <div 
            className={styles["slot-wrapper"]}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <button 
                className={`${styles["skill-slot"]} ${active ? styles["pressed"] : ""} ${disabled ? styles["disabled"] : ""}`}
                disabled={disabled}
                {...handlers}
            >
                {icon && <img src={icon} alt="" className={styles["skill-icon"]} />}
                <span className={styles["key"]}>{keyBind}</span>
            </button>
            {tooltip && showTooltip && (
                <div className={styles["tooltip"]}>
                    <Connector position="bottom" />
                    <div className={styles["tooltip-header"]}>
                        <span className={styles["tooltip-name"]}>{tooltip.name}</span>
                        <div className={styles["tooltip-badges"]}>
                            {tooltip.element && (
                                <span 
                                    className={styles["tooltip-element"]}
                                    style={{ '--element-color': tooltip.element.primary }}
                                >
                                    {tooltip.element.name}
                                </span>
                            )}
                            {tooltip.type && <span className={styles["tooltip-type"]}>{tooltip.type}</span>}
                        </div>
                    </div>
                    {tooltip.description && (
                        <p className={styles["tooltip-desc"]}>{tooltip.description}</p>
                    )}
                    <div className={styles["tooltip-stats"]}>
                        {tooltip.manaCost > 0 && (
                            <span className={styles["tooltip-mana"]}>Mana: {tooltip.manaCost}</span>
                        )}
                        {tooltip.manaGain > 0 && (
                            <span className={styles["tooltip-mana-gain"]}>Mana: +{tooltip.manaGain}</span>
                        )}
                        {tooltip.manaPerSecond > 0 && (
                            <span className={styles["tooltip-mana"]}>Mana/sec: {tooltip.manaPerSecond}</span>
                        )}
                        {tooltip.healthCost > 0 && (
                            <span className={styles["tooltip-health"]}>Health: {tooltip.healthCost}</span>
                        )}
                        {tooltip.buff && (
                            <span className={styles["tooltip-buff"]}>Duration: {tooltip.buff.duration}s</span>
                        )}
                        {tooltip.requiresTarget && (
                            <span className={styles["tooltip-target"]}>Requires Target</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SkillBar({ children }) {
  return (
    <div className={styles["skill-bar"]}>
      {children}
    </div>
  );
}