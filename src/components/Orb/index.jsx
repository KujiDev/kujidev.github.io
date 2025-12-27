import styles from "./styles.module.css";

export default function Orb({ type = "health", label = "Health" }) {
  return (
    <div className={`${styles.orb} ${styles[type]}`}>
      <div className={styles["orb-fill"]} />
      <span className={styles["orb-label"]}>{label}</span>
    </div>
  );
}