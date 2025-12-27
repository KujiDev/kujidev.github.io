
import styles from "./styles.module.css";

export const Slot = ({ keyBind, active }) => {
    return (
        <button className={`${styles["skill-slot"]} ${active ? styles["pressed"] : ""}`}>
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