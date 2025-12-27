
import styles from "./styles.module.css";

export const Slot = ({ keyBind, active, onMouseDown, onMouseUp, onMouseLeave, onKeyDown, onKeyUp }) => {
    return (
        <button 
            className={`${styles["skill-slot"]} ${active ? styles["pressed"] : ""}`}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
        >
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