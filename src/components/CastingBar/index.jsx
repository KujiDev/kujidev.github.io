import { useEffect, useState, useRef, useMemo } from 'react';
import { usePlayerState } from '@/hooks/useGame';
import { getActionById, ELEMENTS } from '@/config/actions';
import styles from './styles.module.css';

// Get element colors for an action
function getElementColors(action) {
    if (!action?.element) return null;
    return ELEMENTS[action.element] || null;
}

// Shatter overlay component
function ShatterOverlay({ actionId, progress }) {
    const action = getActionById(actionId);
    const percentage = Math.round(progress * 100);
    const element = getElementColors(action);
    
    return (
        <div className={styles['shatter-overlay']}>
            <div 
                className={`${styles['casting-bar']} ${styles['shatter']}`}
                style={element ? {
                    '--element-primary': element.primary,
                    '--element-secondary': element.secondary,
                    '--element-glow': element.glow,
                } : undefined}
            >
                {/* Skill icon */}
                {action?.icon && (
                    <div className={styles['skill-icon']}>
                        <img src={action.icon} alt="" />
                    </div>
                )}
                
                {/* Bar track */}
                <div className={styles['bar-track']}>
                    {/* Fill - frozen at interrupt point */}
                    <div 
                        className={`${styles['bar-fill']} ${styles['fill-interrupted']}`}
                        style={{ width: `${percentage}%` }}
                    />
                    
                    {/* Skill name */}
                    <span className={styles['skill-name']}>Interrupted!</span>
                </div>
                
                {/* Shatter fragments */}
                <div className={styles['shatter-fragments']}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={styles['fragment']} style={{ '--i': i }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Shatter animation state - consolidated to avoid multiple useState calls.
 * null = no shatter active, object = shatter in progress
 */
const INITIAL_SHATTER_STATE = null;

export default function CastingBar() {
    const { state, activeAction, castProgress, interruptCounter, interruptedAction, interruptedProgress, STATES } = usePlayerState();
    
    // Consolidated shatter state: { actionId, progress } or null
    const [shatter, setShatter] = useState(INITIAL_SHATTER_STATE);
    const lastInterruptCountRef = useRef(0);
    
    // Only show when casting or attacking (not idle/moving)
    const isActive = state === STATES.CASTING || state === STATES.ATTACKING;
    
    // Handle interruption - show shatter effect when counter changes
    useEffect(() => {
        if (interruptCounter > lastInterruptCountRef.current && interruptedAction) {
            lastInterruptCountRef.current = interruptCounter;
            setShatter({ actionId: interruptedAction, progress: interruptedProgress });
            
            // Hide shatter after animation
            const timer = setTimeout(() => {
                setShatter(INITIAL_SHATTER_STATE);
            }, 400);
            
            return () => clearTimeout(timer);
        }
    }, [interruptCounter, interruptedAction, interruptedProgress]);
    
    // Derive action and element for current casting
    const action = useMemo(() => 
        isActive && activeAction ? getActionById(activeAction) : null, 
        [isActive, activeAction]
    );
    const element = useMemo(() => getElementColors(action), [action]);
    const progress = castProgress ?? 0;
    const percentage = Math.round(progress * 100);
    
    return (
        <div className={styles['casting-bar-container']}>
            {/* Shatter overlay - shows above the new casting bar */}
            {shatter && (
                <ShatterOverlay actionId={shatter.actionId} progress={shatter.progress} />
            )}
            
            {/* Normal casting bar */}
            {isActive && activeAction && action && (
                <div 
                    className={styles['casting-bar']}
                    style={element ? {
                        '--element-primary': element.primary,
                        '--element-secondary': element.secondary,
                        '--element-glow': element.glow,
                    } : undefined}
                >
                    {/* Skill icon */}
                    {action?.icon && (
                        <div className={styles['skill-icon']}>
                            <img src={action.icon} alt="" />
                        </div>
                    )}
                    
                    {/* Bar track */}
                    <div className={styles['bar-track']}>
                        {/* Fill */}
                        <div 
                            className={styles['bar-fill']}
                            style={{ width: `${percentage}%` }}
                        />
                        
                        {/* Spark effect at end of bar */}
                        <div 
                            className={styles['bar-spark']}
                            style={{ left: `${percentage}%` }}
                        />
                        
                        {/* Skill name */}
                        <span className={styles['skill-name']}>{action?.label || 'Casting'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
