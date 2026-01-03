import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'
import { usePlayerState } from '@/hooks/useGame'
import { useInput } from '@/hooks/useInput'

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
  const { handleSlotInput } = usePlayerState()
  const { pressSlot, releaseSlot } = useInput()
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
  
  // Target emits slot-based intents only - game store resolves actions
  // Visual feedback (pressSlot) is decoupled from action execution
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    
    // Left mouse button
    if (e.button === 0) {
      if (!isLocked) lockAndSetTarget()
      pressSlot('slot_lmb')
      handleSlotInput?.('slot_lmb', true)
    }
    
    // Right mouse button
    if (e.button === 2) {
      if (!isLocked) lockAndSetTarget()
      pressSlot('slot_rmb')
      handleSlotInput?.('slot_rmb', true)
    }
  }, [isLocked, lockAndSetTarget, handleSlotInput, pressSlot])
  
  const handlePointerUp = useCallback((e) => {
    e.stopPropagation()
    // Left mouse button
    if (e.button === 0) {
      releaseSlot('slot_lmb')
      handleSlotInput?.('slot_lmb', false)
    }
    // Right mouse button
    if (e.button === 2) {
      releaseSlot('slot_rmb')
      handleSlotInput?.('slot_rmb', false)
    }
  }, [handleSlotInput, releaseSlot])
  
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
