
import styles from "./styles.module.css";

export const Slot = ({ keyBind, icon, active, disabled, ...handlers }) => {
    return (
        <button 
            className={`${styles["skill-slot"]} ${active ? styles["pressed"] : ""} ${disabled ? styles["disabled"] : ""}`}
            disabled={disabled}
            {...handlers}
        >
            {icon && <img src={icon} alt="" className={styles["skill-icon"]} />}
            <span className={styles["key"]}>{keyBind}</span>
        </button>
    );
}

export default function SkillBar({ children }) {
  return (
    <div className={styles["skill-bar"]}>
      {children}
    </div>
  );
}