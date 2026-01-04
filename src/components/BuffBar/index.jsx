import { usePlayerState, useSlotMap } from "@/hooks/useGame";
import { getPixieActionById, getActionById, isChannelAction } from "@/config/actions";
import { PIXIE_SLOTS } from "@/config/slots";
import { useState, useEffect, memo, useMemo } from "react";
import styles from "./styles.module.css";

// BUFF_INFO provides tooltip text for buffs - keyed by status/buff ID
// TODO: Move this to statuses.json for full data-driven architecture
const BUFF_INFO = {
  mana_body: {
    description: 'Your body is infused with pure mana, greatly increasing mana regeneration.',
    effect: '+10 Mana per second',
  },
  arcane_rush: {
    description: 'Surging with arcane energy, you knock back enemies on impact.',
    effect: 'Pushes enemies away',
  },
  health_potion: {
    description: 'A restorative potion courses through your veins, healing your wounds.',
    effect: '+8 Health per second',
  },
  food_buff: {
    description: 'An enchanted biscuit infuses you with arcane energy, restoring your mana.',
    effect: '+5 Mana per second',
  },
};

const BuffIcon = memo(function BuffIcon({ buff, now }) {
  const remaining = Math.max(0, (buff.expiresAt - now) / 1000);
  const progress = remaining / buff.duration;
  const [showTooltip, setShowTooltip] = useState(false);
  
  const buffInfo = BUFF_INFO[buff.id] || {};
  
  return (
    <div 
      className={styles["buff-wrapper"]}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={styles["buff-icon"]}>
        <img src={buff.icon} alt={buff.name} className={styles["buff-image"]} />
        <div 
          className={styles["buff-sweep"]} 
          style={{ '--progress': progress }}
        />
        <span className={styles["buff-timer"]}>
          {Math.ceil(remaining)}s
        </span>
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-header"]}>
            <span className={styles["tooltip-name"]}>{buff.name}</span>
            <span className={styles["tooltip-type"]}>Buff</span>
          </div>
          {buffInfo.description && (
            <p className={styles["tooltip-desc"]}>{buffInfo.description}</p>
          )}
          {buffInfo.effect && (
            <p className={styles["tooltip-effect"]}>{buffInfo.effect}</p>
          )}
          <p className={styles["tooltip-duration"]}>
            {Math.ceil(remaining)}s remaining
          </p>
          <div className={styles["tooltip-connector"]} />
        </div>
      )}
    </div>
  );
});

const ActiveBuffIcon = memo(function ActiveBuffIcon({ id, name, icon }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buffInfo = BUFF_INFO[id] || {};
  
  return (
    <div 
      className={styles["buff-wrapper"]}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`${styles["buff-icon"]} ${styles["buff-active"]}`}>
        <img src={icon} alt={name} className={styles["buff-image"]} />
        <div className={styles["buff-pulse"]} />
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-header"]}>
            <span className={styles["tooltip-name"]}>{name}</span>
            <span className={`${styles["tooltip-type"]} ${styles["tooltip-type-active"]}`}>Active</span>
          </div>
          {buffInfo.description && (
            <p className={styles["tooltip-desc"]}>{buffInfo.description}</p>
          )}
          {buffInfo.effect && (
            <p className={styles["tooltip-effect"]}>{buffInfo.effect}</p>
          )}
          <p className={styles["tooltip-active-hint"]}>
            Active while held
          </p>
          <div className={styles["tooltip-connector"]} />
        </div>
      )}
    </div>
  );
});

// Buff type display info for pixies
const PIXIE_BUFF_INFO = {
  healthRegen: { label: 'Health Regen', suffix: '/sec' },
  manaRegen: { label: 'Mana Regen', suffix: '/sec' },
  maxHealth: { label: 'Max Health', suffix: '' },
  maxMana: { label: 'Max Mana', suffix: '' },
};

const PixieBuffIcon = memo(function PixieBuffIcon({ pixie }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buffInfo = PIXIE_BUFF_INFO[pixie.buff.type];
  
  return (
    <div 
      className={styles["buff-wrapper"]}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`${styles["buff-icon"]} ${styles["buff-passive"]}`}
        style={{ '--pixie-color': pixie.color }}
      >
        <img src={pixie.icon} alt={pixie.label} className={styles["buff-image"]} />
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-header"]}>
            <span className={styles["tooltip-name"]}>{pixie.label}</span>
            <span className={`${styles["tooltip-type"]} ${styles["tooltip-type-passive"]}`}>Passive</span>
          </div>
          <p className={styles["tooltip-desc"]}>{pixie.description}</p>
          <p className={styles["tooltip-effect"]} style={{ color: pixie.color }}>
            +{pixie.buff.value} {buffInfo.label}{buffInfo.suffix}
          </p>
          <div className={styles["tooltip-connector"]} />
        </div>
      )}
    </div>
  );
});

export default function BuffBar() {
  const { buffs, state, activeAction, STATES } = usePlayerState();
  const { slotMap } = useSlotMap();
  const [now, setNow] = useState(Date.now());
  
  // Data-driven: Get active channel action info from action data
  const activeChannelAction = useMemo(() => {
    if (state !== STATES.MOVING || !activeAction) return null;
    const action = getActionById(activeAction);
    return action && isChannelAction(action) ? action : null;
  }, [state, activeAction, STATES.MOVING]);
  
  // Get equipped pixies from slot map - use slotMap directly for stable reference
  const equippedPixies = useMemo(() => {
    return PIXIE_SLOTS
      .map(slot => slotMap?.[slot.id])
      .filter(Boolean)
      .map(id => getPixieActionById(id))
      .filter(Boolean);
  }, [slotMap]);
  
  const hasTimedBuffs = buffs && buffs.length > 0;
  const hasPixieBuffs = equippedPixies && equippedPixies.length > 0;
  
  // Only run timer interval when there are timed buffs to update
  useEffect(() => {
    if (!hasTimedBuffs) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    
    return () => clearInterval(interval);
  }, [hasTimedBuffs]);
  
  const hasBuffs = hasTimedBuffs || activeChannelAction || hasPixieBuffs;
  
  if (!hasBuffs) return null;
  
  return (
    <div className={styles["buff-bar"]}>
      {/* Passive pixie buffs */}
      {equippedPixies.map(pixie => (
        <PixieBuffIcon key={pixie.id} pixie={pixie} />
      ))}
      
      {/* Active channel ability buff - data-driven from action */}
      {activeChannelAction && (
        <ActiveBuffIcon 
          id={activeChannelAction._skillId || activeChannelAction.id}
          name={activeChannelAction.label} 
          icon={activeChannelAction.icon} 
        />
      )}
      
      {/* Timed buffs */}
      {buffs.map(buff => (
        <BuffIcon key={buff.id} buff={buff} now={now} />
      ))}
    </div>
  );
}
