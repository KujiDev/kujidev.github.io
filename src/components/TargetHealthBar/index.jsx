import { useTarget } from '@/components/Target'
import Connector from '@/components/Connector'
import styles from './styles.module.css'

/**
 * Target health bar - matches casting bar style.
 * Name displayed above, bar with level icon box.
 */
export default function TargetHealthBar() {
  const { target } = useTarget() || {}
  
  if (!target) return null
  
  const healthPercent = Math.round((target.health / target.maxHealth) * 100)
  const typeClass = styles[`type-${target.type}`] || ''
  
  return (
    <div className={`${styles.container} ${typeClass}`}>
      {/* Name label above the bar */}
      <div className={styles.nameLabel}>
        {target.level && (
          <span className={styles.level}>Lv.{target.level}</span>
        )}
        <span className={styles.name}>{target.name}</span>
        {target.type === 'elite' && (
          <span className={styles.eliteBadge}>Elite</span>
        )}
        {target.type === 'boss' && (
          <span className={styles.bossBadge}>Boss</span>
        )}
      </div>
      
      {/* Health bar frame - casting bar style */}
      <div className={styles.frame}>
        {/* Left side connector with jewel */}
        <Connector position="left" />
        
        {/* Health bar track */}
        <div className={styles.barTrack}>
          <div 
            className={styles.barFill}
            style={{ width: `calc(${healthPercent}% - 2px)` }}
          />
          <div className={styles.barShine} />
          <span className={styles.healthText}>
            {target.health.toLocaleString()} / {target.maxHealth.toLocaleString()}
          </span>
        </div>
        
        {/* Right side connector with jewel */}
        <Connector position="right" />
      </div>
    </div>
  )
}
