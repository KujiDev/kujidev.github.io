import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'
import { usePlayerState, useSlotMap } from '@/hooks/useGame'

const TargetContext = createContext(null)

export const useTarget = () => useContext(TargetContext)

export function TargetProvider({ children }) {
  const [target, setTarget] = useState(null)
  const [lockedTargetId, setLockedTargetId] = useState(null)
  
  const lockTarget = useCallback((id) => setLockedTargetId(id), [])
  const unlockTarget = useCallback(() => {
    setLockedTargetId(null)
    setTarget(null)
  }, [])
  const hasTarget = useCallback(() => target !== null, [target])
  
  const value = useMemo(() => ({
    target,
    setTarget,
    lockedTargetId,
    lockTarget,
    unlockTarget,
    hasTarget,
  }), [target, lockedTargetId, lockTarget, unlockTarget, hasTarget])
  
  return (
    <TargetContext.Provider value={value}>
      {children}
    </TargetContext.Provider>
  )
}

export default function Target({ 
  name = 'Unknown', 
  health = 100, 
  maxHealth = 100,
  level,
  type = 'enemy',
  buffs = [],
  debuffs = [],
  children 
}) {
  const { setTarget, lockedTargetId, lockTarget } = useTarget() || {}
  const { handleInput, mouseButtonActionsRef } = usePlayerState()
  const targetId = useRef(`${name}-${type}`).current
  const isHovered = useRef(false)
  const isLocked = lockedTargetId === targetId
  
  // Build target data object
  const targetData = useMemo(() => ({ 
    name, health, maxHealth, level, type, buffs, debuffs 
  }), [name, health, maxHealth, level, type, buffs, debuffs])
  
  // Update target data reactively when props change
  useEffect(() => {
    if ((isHovered.current || isLocked) && setTarget) {
      setTarget(targetData)
    }
  }, [targetData, isLocked, setTarget])
  
  // Get actions from slot map - with fallback
  const slotMap = useSlotMap()
  const lmbAction = slotMap?.getActionForSlot?.('slot_lmb') ?? 'primary_attack'
  const rmbAction = slotMap?.getActionForSlot?.('slot_rmb') ?? 'secondary_attack'
  
  // Lock target and set data
  const lockAndSetTarget = useCallback(() => {
    lockTarget?.(targetId)
    setTarget?.(targetData)
  }, [lockTarget, setTarget, targetId, targetData])
  
  const handlePointerEnter = useCallback((e) => {
    e.stopPropagation()
    if (lockedTargetId && lockedTargetId !== targetId) return
    
    isHovered.current = true
    setTarget?.(targetData)
  }, [lockedTargetId, targetId, setTarget, targetData])
  
  const handlePointerLeave = useCallback((e) => {
    e.stopPropagation()
    isHovered.current = false
    if (!isLocked) setTarget?.(null)
  }, [isLocked, setTarget])
  
  // Left click - lock and use LMB slot action (held down = recast)
  // Right click - also handled here to set mouseButtonActionsRef BEFORE mouseup fires
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    
    // Left mouse button
    if (e.button === 0) {
      if (!isLocked) lockAndSetTarget()
      if (lmbAction) {
        if (mouseButtonActionsRef) mouseButtonActionsRef.current[0] = lmbAction
        handleInput?.(lmbAction, true)
      }
    }
    
    // Right mouse button - set the action here so mouseup can clear it
    if (e.button === 2) {
      if (!isLocked) lockAndSetTarget()
      if (rmbAction) {
        if (mouseButtonActionsRef) mouseButtonActionsRef.current[2] = rmbAction
        handleInput?.(rmbAction, true)
      }
    }
  }, [isLocked, lockAndSetTarget, handleInput, lmbAction, rmbAction, mouseButtonActionsRef])
  
  const handlePointerUp = useCallback((e) => {
    e.stopPropagation()
    // Left mouse button
    if (e.button === 0 && lmbAction) {
      handleInput?.(lmbAction, false)
      if (mouseButtonActionsRef) mouseButtonActionsRef.current[0] = null
    }
    // Right mouse button
    if (e.button === 2 && rmbAction) {
      handleInput?.(rmbAction, false)
      if (mouseButtonActionsRef) mouseButtonActionsRef.current[2] = null
    }
  }, [handleInput, lmbAction, rmbAction, mouseButtonActionsRef])
  
  // Right click context menu - just prevent default, action handled in pointerdown
  const handleContextMenu = useCallback((e) => {
    e.stopPropagation()
    e.nativeEvent?.preventDefault?.()
  }, [])
  
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
