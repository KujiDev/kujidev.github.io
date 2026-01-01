import { createContext, useCallback, useContext, useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSlotMap, getSlotType } from "./useSlotMap";
import { getDragType } from "@/config/actions";

const DragDropContext = createContext(null);

/**
 * Drag preview component - follows cursor/touch
 */
function DragPreview({ dragging, position }) {
  if (!dragging) return null;
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10000,
        opacity: 0.9,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
      }}
    >
      {dragging.icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: 'linear-gradient(180deg, rgba(60,45,30,0.95) 0%, rgba(25,18,10,0.98) 100%)',
            border: '2px solid #8a6a40',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255,180,80,0.3)',
          }}
        >
          <img 
            src={dragging.icon} 
            alt={dragging.label}
            style={{ width: 32, height: 32 }}
          />
        </div>
      )}
    </div>,
    document.body
  );
}

export function DragDropProvider({ children }) {
  const [dragging, setDragging] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dropTargets, setDropTargets] = useState(new Map());
  const { assignToSlot, swapSlots } = useSlotMap();
  
  /**
   * Start dragging an action
   * @param {Object} action - The action being dragged
   * @param {Object} startPos - { x, y } position
   * @param {string} [sourceSlot] - Optional slot ID if dragging from a slot
   */
  const startDrag = useCallback((action, startPos, sourceSlot = null) => {
    setDragging({ ...action, sourceSlot });
    setPosition(startPos);
  }, []);
  
  /**
   * Update drag position
   */
  const updateDrag = useCallback((pos) => {
    setPosition(pos);
  }, []);
  
  /**
   * End drag - check for drop target and validate type compatibility
   */
  const endDrag = useCallback((endPos) => {
    if (!dragging) return;
    
    // Find drop target at position
    let targetSlot = null;
    dropTargets.forEach((rect, slotId) => {
      if (
        endPos.x >= rect.left &&
        endPos.x <= rect.right &&
        endPos.y >= rect.top &&
        endPos.y <= rect.bottom
      ) {
        targetSlot = slotId;
      }
    });
    
    if (targetSlot) {
      const targetSlotType = getSlotType(targetSlot);
      const dragType = dragging.dragType;
      
      // Validate type compatibility
      const isCompatible = dragType === targetSlotType;
      
      if (isCompatible) {
        // If dragging from a slot to another slot, swap them
        if (dragging.sourceSlot && dragging.sourceSlot !== targetSlot) {
          swapSlots(dragging.sourceSlot, targetSlot);
        } else if (!dragging.sourceSlot) {
          // Dragging from SpellBook/Consumables panel to slot
          assignToSlot(targetSlot, dragging.id);
        }
        // If dropped on same slot, do nothing
      }
      // If not compatible, drop is rejected silently
    }
    
    setDragging(null);
  }, [dragging, dropTargets, assignToSlot, swapSlots]);
  
  /**
   * Cancel drag
   */
  const cancelDrag = useCallback(() => {
    setDragging(null);
  }, []);
  
  /**
   * Register a drop target (slot)
   */
  const registerDropTarget = useCallback((slotId, rect) => {
    setDropTargets(prev => {
      const next = new Map(prev);
      next.set(slotId, rect);
      return next;
    });
  }, []);
  
  /**
   * Unregister a drop target
   */
  const unregisterDropTarget = useCallback((slotId) => {
    setDropTargets(prev => {
      const next = new Map(prev);
      next.delete(slotId);
      return next;
    });
  }, []);
  
  /**
   * Check if a slot is being hovered during drag
   */
  const isSlotHovered = useCallback((slotId) => {
    if (!dragging) return false;
    const rect = dropTargets.get(slotId);
    if (!rect) return false;
    return (
      position.x >= rect.left &&
      position.x <= rect.right &&
      position.y >= rect.top &&
      position.y <= rect.bottom
    );
  }, [dragging, dropTargets, position]);
  
  const value = useMemo(() => ({
    dragging,
    isDragging: !!dragging,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    registerDropTarget,
    unregisterDropTarget,
    isSlotHovered,
  }), [
    dragging,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    registerDropTarget,
    unregisterDropTarget,
    isSlotHovered,
  ]);
  
  // Global mouse/touch move handlers during drag
  useEffect(() => {
    if (!dragging) return;
    
    const handleMove = (e) => {
      const pos = e.touches ? e.touches[0] : e;
      updateDrag({ x: pos.clientX, y: pos.clientY });
    };
    
    const handleEnd = (e) => {
      const pos = e.changedTouches ? e.changedTouches[0] : e;
      endDrag({ x: pos.clientX, y: pos.clientY });
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') cancelDrag();
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', cancelDrag);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', cancelDrag);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragging, updateDrag, endDrag, cancelDrag]);
  
  return (
    <DragDropContext.Provider value={value}>
      {children}
      <DragPreview dragging={dragging} position={position} />
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

/**
 * Hook for making an element draggable
 * Automatically determines dragType from action.type
 */
export function useDraggable(action) {
  const { startDrag, isDragging } = useDragDrop();
  const longPressTimer = useRef(null);
  const startPos = useRef(null);
  
  // Compute drag type from action
  const dragType = getDragType(action);
  
  const handlers = useMemo(() => ({
    onPointerDown: (e) => {
      if (!action) return;
      startPos.current = { x: e.clientX, y: e.clientY };
      
      // For touch, use long-press to initiate drag
      if (e.pointerType === 'touch') {
        longPressTimer.current = setTimeout(() => {
          startDrag({ ...action, dragType }, startPos.current);
        }, 300);
      }
    },
    
    onPointerMove: (e) => {
      if (!startPos.current || !action) return;
      
      // For mouse, start drag after small movement
      if (e.pointerType === 'mouse') {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          startDrag({ ...action, dragType }, { x: e.clientX, y: e.clientY });
          startPos.current = null;
        }
      }
    },
    
    onPointerUp: () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      startPos.current = null;
    },
    
    onPointerCancel: () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      startPos.current = null;
    },
  }), [action, startDrag, dragType]);
  
  return { handlers, isDragging };
}

/**
 * Hook for making an element a drop target
 */
export function useDropTarget(slotId) {
  const { registerDropTarget, unregisterDropTarget, isSlotHovered, isDragging } = useDragDrop();
  const ref = useRef(null);
  
  // Update drop target rect on layout changes
  useEffect(() => {
    if (!ref.current) return;
    
    const updateRect = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        registerDropTarget(slotId, rect);
      }
    };
    
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    return () => {
      unregisterDropTarget(slotId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [slotId, registerDropTarget, unregisterDropTarget]);
  
  const isHovered = isSlotHovered(slotId);
  
  return { ref, isHovered, isDragging };
}
