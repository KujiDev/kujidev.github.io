import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'
import { usePlayerState } from '@/hooks/usePlayerState'
import { useSlotMap } from '@/hooks/useSlotMap'

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
  children 
}) {
  const { setTarget, lockedTargetId, lockTarget } = useTarget() || {}
  const { handleInput } = usePlayerState()
  const targetId = useRef(`${name}-${type}`).current
  const isHovered = useRef(false)
  const isLocked = lockedTargetId === targetId
  
  // Build target data object
  const targetData = useMemo(() => ({ 
    name, health, maxHealth, level, type 
  }), [name, health, maxHealth, level, type])
  
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
  
  // Left click - lock and use LMB slot action (single click, no recast)
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    
    if (!isLocked) lockAndSetTarget()
    if (lmbAction) handleInput?.(lmbAction, true, true) // isClick = true
  }, [isLocked, lockAndSetTarget, handleInput, lmbAction])
  
  const handlePointerUp = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (lmbAction) handleInput?.(lmbAction, false)
  }, [handleInput, lmbAction])
  
  // Right click - lock and use RMB slot action (single click, no recast)
  const handleContextMenu = useCallback((e) => {
    e.stopPropagation()
    e.nativeEvent?.preventDefault?.()
    
    if (!isLocked) lockAndSetTarget()
    if (rmbAction) handleInput?.(rmbAction, true, true) // isClick = true
  }, [isLocked, lockAndSetTarget, handleInput, rmbAction])
  
  // Track right mouse release globally
  useEffect(() => {
    const onMouseUp = (e) => {
      if (e.button === 2 && rmbAction) {
        handleInput?.(rmbAction, false)
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [handleInput, rmbAction])
  
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
