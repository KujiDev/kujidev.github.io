import { useTarget } from '@/components/Target'
import Connector from '@/components/Connector'
import styles from './styles.module.css'

export default function TargetHealthBar() {
  const { target } = useTarget() || {}
  
  if (!target) return null
  
  const healthPercent = Math.round((target.health / target.maxHealth) * 100)
  const typeClass = styles[`type-${target.type}`] || ''
  
  return (
    <div className={`${styles.container} ${typeClass}`}>
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
      
      <div className={styles.frame}>
        <Connector position="left" />
        
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
        
        <Connector position="right" />
      </div>
    </div>
  )
}
