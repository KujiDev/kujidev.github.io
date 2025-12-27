import styles from "./styles.module.css";

export default function Hud ({ children }) {
    return (
        <div className={styles.hud}>
            {children}
        </div>
    )
}