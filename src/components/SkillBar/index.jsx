import { useState, useRef, memo, forwardRef } from 'react';
import Connector from '@/components/Connector';
import { useDropTarget, useDragDrop } from '@/hooks/useDragDrop';
import { getSlotType } from '@/hooks/useSlotMap';
import styles from "./styles.module.css";

export const Slot = memo(forwardRef(function Slot({ 
  slotId,
  actionId,
  keyBind, 
  icon, 
  active, 
  disabled, 
  tooltip, 
  ...handlers 
}, forwardedRef) {
    const [showTooltip, setShowTooltip] = useState(false);
    const { ref: dropRef, isHovered, isDragging } = useDropTarget(slotId);
    const { startDrag } = useDragDrop();
    const longPressTimer = useRef(null);
    const startPos = useRef(null);
    
    // Get slot type for drag compatibility
    const slotType = getSlotType(slotId);
    
    // Combine refs
    const setRefs = (el) => {
      dropRef.current = el;
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else forwardedRef.current = el;
      }
    };
    
    // Drag handlers for slot-to-slot dragging
    const handlePointerDown = (e) => {
      if (!actionId || !icon) return; // Can't drag empty slot
      startPos.current = { x: e.clientX, y: e.clientY };
      
      // For touch, use long-press to initiate drag
      if (e.pointerType === 'touch') {
        longPressTimer.current = setTimeout(() => {
          startDrag(
            { id: actionId, icon, label: tooltip?.name || actionId, dragType: slotType },
            startPos.current,
            slotId // Pass source slot ID
          );
        }, 300);
      }
    };
    
    const handlePointerMove = (e) => {
      if (!startPos.current || !actionId || !icon) return;
      
      // For mouse, start drag after small movement
      if (e.pointerType === 'mouse') {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          startDrag(
            { id: actionId, icon, label: tooltip?.name || actionId, dragType: slotType },
            { x: e.clientX, y: e.clientY },
            slotId // Pass source slot ID
          );
          startPos.current = null;
        }
      }
    };
    
    const handlePointerUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      startPos.current = null;
    };
    
    return (
        <div 
            ref={setRefs}
            className={styles["slot-wrapper"]}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <button 
                className={`${styles["skill-slot"]} ${active ? styles["pressed"] : ""} ${disabled ? styles["disabled"] : ""} ${isHovered && isDragging ? styles["drop-hover"] : ""}`}
                disabled={disabled}
                {...handlers}
            >
                {icon && <img src={icon} alt="" className={styles["skill-icon"]} />}
                <span className={styles["key"]}>{keyBind}</span>
            </button>
            {tooltip && showTooltip && !isDragging && (
                <div className={styles["tooltip"]}>
                    <Connector position="bottom" />
                    <div className={styles["tooltip-header"]}>
                        <span className={styles["tooltip-name"]}>{tooltip.name}</span>
                        <div className={styles["tooltip-badges"]}>
                            {tooltip.element && (
                                <span 
                                    className={styles["tooltip-element"]}
                                    style={{ '--element-color': tooltip.element.primary }}
                                >
                                    {tooltip.element.name}
                                </span>
                            )}
                            {tooltip.type && <span className={styles["tooltip-type"]}>{tooltip.type}</span>}
                        </div>
                    </div>
                    {tooltip.description && (
                        <p className={styles["tooltip-desc"]}>{tooltip.description}</p>
                    )}
                    <div className={styles["tooltip-stats"]}>
                        {tooltip.manaCost > 0 && (
                            <span className={styles["tooltip-mana"]}>Mana: {tooltip.manaCost}</span>
                        )}
                        {tooltip.manaGain > 0 && (
                            <span className={styles["tooltip-mana-gain"]}>Mana: +{tooltip.manaGain}</span>
                        )}
                        {tooltip.manaPerSecond > 0 && (
                            <span className={styles["tooltip-mana"]}>Mana/sec: {tooltip.manaPerSecond}</span>
                        )}
                        {tooltip.healthCost > 0 && (
                            <span className={styles["tooltip-health"]}>Health: {tooltip.healthCost}</span>
                        )}
                        {tooltip.buff && (
                            <span className={styles["tooltip-buff"]}>Duration: {tooltip.buff.duration}s</span>
                        )}
                        {tooltip.buff?.healthRegenBonus > 0 && (
                            <span className={styles["tooltip-heal"]}>Heal/sec: +{tooltip.buff.healthRegenBonus}</span>
                        )}
                        {tooltip.buff?.manaRegenBonus > 0 && (
                            <span className={styles["tooltip-mana-gain"]}>Mana/sec: +{tooltip.buff.manaRegenBonus}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}));

export function ConsumableSlot({ children }) {
  return (
    <div className={styles["consumable-slot"]}>
      {children}
    </div>
  );
}

export default function SkillBar({ children }) {
  return (
    <div className={styles["skill-bar"]}>
      {children}
    </div>
  );
}