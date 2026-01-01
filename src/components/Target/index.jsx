import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'
import { usePlayerState } from '@/hooks/usePlayerState'

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
  
  // Left click - lock and primary attack (single click, no recast)
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    
    if (!isLocked) lockAndSetTarget()
    handleInput?.('primary_attack', true, true) // isClick = true
  }, [isLocked, lockAndSetTarget, handleInput])
  
  const handlePointerUp = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    handleInput?.('primary_attack', false)
  }, [handleInput])
  
  // Right click - lock and secondary attack (single click, no recast)
  const handleContextMenu = useCallback((e) => {
    e.stopPropagation()
    e.nativeEvent?.preventDefault?.()
    
    if (!isLocked) lockAndSetTarget()
    handleInput?.('secondary_attack', true, true) // isClick = true
  }, [isLocked, lockAndSetTarget, handleInput])
  
  // Track right mouse release globally
  useEffect(() => {
    const onMouseUp = (e) => {
      if (e.button === 2) {
        handleInput?.('secondary_attack', false)
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
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
