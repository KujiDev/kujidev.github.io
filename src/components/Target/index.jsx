import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react'
import { usePlayerState } from '@/hooks/usePlayerState'

// Context to share target state between 3D scene and HUD
const TargetContext = createContext(null)

export const useTarget = () => useContext(TargetContext)

export function TargetProvider({ children }) {
  const [target, setTarget] = useState(null)
  const [lockedTargetId, setLockedTargetId] = useState(null)
  
  // Lock a target (for mobile tap or click-to-lock)
  const lockTarget = (id) => setLockedTargetId(id)
  
  // Unlock the target
  const unlockTarget = () => {
    setLockedTargetId(null)
    setTarget(null)
  }
  
  // Check if we have a valid target
  const hasTarget = useCallback(() => {
    return target !== null
  }, [target])
  
  return (
    <TargetContext.Provider value={{ target, setTarget, lockedTargetId, lockTarget, unlockTarget, hasTarget }}>
      {children}
    </TargetContext.Provider>
  )
}

/**
 * Wraps a 3D model to make it targetable.
 * - Desktop: hover to target, move away to untarget
 * - Mobile: tap to lock target, tap elsewhere to unlock
 * - Left click: primary attack
 * - Right click: secondary attack
 * - Updates reactively when health/props change
 */
export default function Target({ 
  name = 'Unknown', 
  health = 100, 
  maxHealth = 100,
  level,
  type = 'enemy', // 'enemy', 'elite', 'boss', 'friendly'
  children 
}) {
  const { setTarget, lockedTargetId, lockTarget } = useTarget() || {}
  const { handleInput } = usePlayerState()
  const targetId = useRef(`${name}-${type}`).current
  const isTargeted = useRef(false)
  const isLocked = lockedTargetId === targetId
  
  // Update target data reactively when props change and this target is active
  useEffect(() => {
    if ((isTargeted.current || isLocked) && setTarget) {
      setTarget({ name, health, maxHealth, level, type })
    }
  }, [name, health, maxHealth, level, type, isLocked, setTarget])
  
  const handlePointerEnter = (e) => {
    e.stopPropagation()
    // Don't override a locked target with hover
    if (lockedTargetId && lockedTargetId !== targetId) return
    
    isTargeted.current = true
    if (setTarget) {
      setTarget({ name, health, maxHealth, level, type })
    }
  }
  
  const handlePointerLeave = (e) => {
    e.stopPropagation()
    isTargeted.current = false
    
    // Don't clear if this target is locked
    if (isLocked) return
    
    if (setTarget) {
      setTarget(null)
    }
  }
  
  // Left click - primary attack (hold to keep casting)
  const handlePointerDown = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return
    e.stopPropagation()
    
    // Lock target on first click, then attack
    if (!isLocked) {
      lockTarget?.(targetId)
      setTarget?.({ name, health, maxHealth, level, type })
    }
    
    // Start primary attack
    handleInput?.('primary_attack', true)
  }
  
  const handlePointerUp = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return
    e.stopPropagation()
    
    // Release primary attack
    handleInput?.('primary_attack', false)
  }
  
  // Right click - secondary attack (hold to keep casting)
  const handleContextMenu = (e) => {
    e.stopPropagation()
    e.nativeEvent?.preventDefault?.()
    
    // Lock target on first click, then attack
    if (!isLocked) {
      lockTarget?.(targetId)
      setTarget?.({ name, health, maxHealth, level, type })
    }
    
    // Start secondary attack
    handleInput?.('secondary_attack', true)
  }
  
  // Track right mouse button release globally (since onContextMenu only fires once)
  useEffect(() => {
    const handleMouseUp = (e) => {
      if (e.button === 2) {
        handleInput?.('secondary_attack', false)
      }
    }
    
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleInput])
  
  return (
    <group
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {children}
    </group>
  )
}
