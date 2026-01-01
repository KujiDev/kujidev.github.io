import { useState, useEffect } from 'react'
import { useTarget } from '@/components/Target'
import Connector from '@/components/Connector'
import styles from './styles.module.css'

// Format health as integer like the Orb
const formatHealth = (value) => Math.round(value).toLocaleString()

// Buff/Debuff icon component
function StatusIcon({ status, now, isDebuff = false }) {
  const remaining = status.expiresAt ? Math.max(0, (status.expiresAt - now) / 1000) : null
  const progress = remaining !== null ? remaining / status.duration : 1
  
  return (
    <div className={`${styles.statusIcon} ${isDebuff ? styles.debuff : styles.buff}`}>
      <img src={status.icon} alt={status.name} className={styles.statusImage} />
      {status.duration && (
        <>
          <div 
            className={styles.statusSweep} 
            style={{ '--progress': progress }}
          />
          <span className={styles.statusTimer}>
            {Math.ceil(remaining)}s
          </span>
        </>
      )}
    </div>
  )
}

export default function TargetHealthBar() {
  const { target } = useTarget() || {}
  const [now, setNow] = useState(Date.now())
  
  // Update timer for buff durations
  const hasTimedStatus = target?.buffs?.some(b => b.expiresAt) || target?.debuffs?.some(d => d.expiresAt)
  
  useEffect(() => {
    if (!hasTimedStatus) return
    
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 100)
    
    return () => clearInterval(interval)
  }, [hasTimedStatus])
  
  if (!target) return null
  
  const healthPercent = (target.health / target.maxHealth) * 100
  const typeClass = styles[`type-${target.type}`] || ''
  const hasStatus = (target.buffs?.length > 0) || (target.debuffs?.length > 0)
  
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
            {formatHealth(target.health)} / {formatHealth(target.maxHealth)}
          </span>
        </div>
        
        <Connector position="right" />
      </div>
      
      {hasStatus && (
        <div className={styles.statusBar}>
          {target.buffs?.map((buff, i) => (
            <StatusIcon key={buff.id || i} status={buff} now={now} />
          ))}
          {target.debuffs?.map((debuff, i) => (
            <StatusIcon key={debuff.id || i} status={debuff} now={now} isDebuff />
          ))}
        </div>
      )}
    </div>
  )
}
