import styles from './styles.module.css';

/**
 * Decorative connector bar with centered jewel orb
 * Used for tooltips, health bars, and other UI elements
 * 
 * @param {Object} props
 * @param {'top' | 'bottom' | 'left' | 'right'} props.position - Which side to attach to
 * @param {string} props.className - Additional class name
 */
export default function Connector({ position = 'bottom', className = '' }) {
  const isHorizontal = position === 'left' || position === 'right';
  
  return (
    <div 
      className={`${styles.connector} ${styles[position]} ${isHorizontal ? styles.horizontal : styles.vertical} ${className}`}
    >
      <div className={styles.bar} />
      <div className={styles.jewel} />
    </div>
  );
}
