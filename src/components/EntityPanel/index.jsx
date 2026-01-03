/**
 * =============================================================================
 * ENTITY PANEL - Generic Data-Driven Entity Drawer
 * =============================================================================
 * 
 * A single component that renders any entity panel (spells, consumables, pixies)
 * based purely on configuration data. No hardcoded behavior per entity type.
 * 
 * ARCHITECTURE:
 * =============
 * - Reads panel config from JSON
 * - Gets entities from actions API
 * - Renders cards and filters generically
 * - Slot sections are optional and config-driven
 */

import { useState, useRef, useMemo, memo } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import { useDraggable, useDropTarget, useDragDrop } from '@/hooks/useDragDrop';
import { useSlotMap, usePixies } from '@/hooks/useGame';
import { useClassContent } from '@/hooks/useClassContent';
import { getPixieActionById, ELEMENTS } from '@/config/actions';
import { ALL_SLOTS } from '@/config/slots';
import styles from './styles.module.css';

// =============================================================================
// BUFF INFO - For displaying buff stats
// =============================================================================

const BUFF_INFO = {
  healthRegen: { label: 'Health Regen', suffix: '/sec', color: '#40ff80', name: 'Healing' },
  manaRegen: { label: 'Mana Regen', suffix: '/sec', color: '#40a0ff', name: 'Mana' },
  maxHealth: { label: 'Max Health', suffix: '', color: '#ff6040', name: 'Vitality' },
  maxMana: { label: 'Max Mana', suffix: '', color: '#a040ff', name: 'Arcane' },
  healthRegenBonus: { label: 'Health Regen', suffix: '/s', color: '#40ff80', name: 'Healing' },
  manaRegenBonus: { label: 'Mana Regen', suffix: '/s', color: '#40a0ff', name: 'Mana' },
};

// =============================================================================
// ENTITY SLOT - Generic slot for any entity type
// =============================================================================

const EntitySlot = memo(function EntitySlot({ slotId, slotIndex, entityType, getEntityById }) {
  const { slotMap } = useSlotMap();
  const { ref: dropRef, isHovered, isDragging } = useDropTarget(slotId);
  const { startDrag } = useDragDrop();
  const startPos = useRef(null);
  
  const entityId = slotMap?.[slotId] || null;
  const entity = entityId ? getEntityById(entityId) : null;
  
  const handlePointerDown = (e) => {
    if (!entity) return;
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  
  const handlePointerMove = (e) => {
    if (!startPos.current || !entity) return;
    
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      startDrag(
        { id: entity.id, icon: entity.icon, label: entity.label, dragType: entityType },
        { x: e.clientX, y: e.clientY },
        slotId
      );
      startPos.current = null;
    }
  };
  
  const handlePointerUp = () => {
    startPos.current = null;
  };
  
  return (
    <div
      ref={dropRef}
      className={`${styles['entity-slot']} ${isHovered && isDragging ? styles['slot-hover'] : ''} ${entity ? styles['slot-filled'] : ''}`}
      style={entity ? { '--element-color': entity.color || ELEMENTS[entity.element]?.primary } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {entity ? (
        <img src={entity.icon} alt={entity.label} draggable={false} />
      ) : (
        <span className={styles['slot-number']}>{slotIndex + 1}</span>
      )}
    </div>
  );
});

// =============================================================================
// ENTITY CARD - Generic card for any entity type
// =============================================================================

const EntityCard = memo(function EntityCard({ entity, panel }) {
  const element = entity.element ? ELEMENTS[entity.element] : null;
  const { handlers, isDragging } = useDraggable(entity);
  const { getSlotForAction } = useSlotMap();
  
  const assignedSlot = getSlotForAction(entity.id);
  const elementColor = entity.color || element?.primary || '#a89878';
  
  // Get buff info if entity has a buff
  const buffInfo = entity.buff?.type ? BUFF_INFO[entity.buff.type] : null;
  
  return (
    <div 
      className={`${styles['entity-card']} ${isDragging ? styles['dragging'] : ''} ${assignedSlot ? styles['assigned'] : ''}`}
      {...handlers}
    >
      <div className={styles['entity-header']}>
        {entity.icon && (
          <div 
            className={styles['entity-icon']}
            style={{ '--element-color': elementColor }}
          >
            <img src={entity.icon} alt="" draggable={false} />
          </div>
        )}
        <div className={styles['entity-info']}>
          <span className={styles['entity-name']}>{entity.label}</span>
          <div className={styles['entity-badges']}>
            {element && (
              <span 
                className={styles['entity-element']}
                style={{ '--element-color': element.primary }}
              >
                {element.name}
              </span>
            )}
            {buffInfo && !element && (
              <span 
                className={styles['entity-element']}
                style={{ '--element-color': buffInfo.color }}
              >
                {buffInfo.name}
              </span>
            )}
            <span className={styles['entity-type']}>{entity.type}</span>
            {assignedSlot && (
              <span className={styles['entity-assigned']}>Equipped</span>
            )}
          </div>
        </div>
        <div className={styles['drag-hint']}>⋮⋮</div>
      </div>
      
      <p className={styles['entity-desc']}>{entity.description}</p>
      
      <div className={styles['entity-stats']}>
        {/* Mana cost */}
        {entity.manaCost > 0 && (
          <span className={styles['stat-mana']}>
            <span className={styles['stat-label']}>Mana:</span> {entity.manaCost}
          </span>
        )}
        {/* Mana gain */}
        {entity.manaGain > 0 && (
          <span className={styles['stat-mana-gain']}>
            <span className={styles['stat-label']}>Mana:</span> +{entity.manaGain}
          </span>
        )}
        {/* Mana drain */}
        {entity.manaPerSecond > 0 && (
          <span className={styles['stat-mana']}>
            <span className={styles['stat-label']}>Drain:</span> {entity.manaPerSecond}/s
          </span>
        )}
        {/* Health cost */}
        {entity.healthCost > 0 && (
          <span className={styles['stat-health']}>
            <span className={styles['stat-label']}>Health:</span> {entity.healthCost}
          </span>
        )}
        {/* Buff duration */}
        {entity.buff?.duration > 0 && (
          <span className={styles['stat-buff']}>
            <span className={styles['stat-label']}>Duration:</span> {entity.buff.duration}s
          </span>
        )}
        {/* Buff value (for pixies and consumables) */}
        {entity.buff?.value > 0 && buffInfo && (
          <span className={styles['stat-buff']} style={{ color: buffInfo.color }}>
            <span className={styles['stat-label']}>{buffInfo.label}:</span> +{entity.buff.value}{buffInfo.suffix}
          </span>
        )}
        {/* Consumable buff bonuses */}
        {entity.buff?.healthRegenBonus > 0 && (
          <span className={styles['stat-heal']}>
            <span className={styles['stat-label']}>Health Regen:</span> +{entity.buff.healthRegenBonus}/s
          </span>
        )}
        {entity.buff?.manaRegenBonus > 0 && (
          <span className={styles['stat-mana-gain']}>
            <span className={styles['stat-label']}>Mana Regen:</span> +{entity.buff.manaRegenBonus}/s
          </span>
        )}
        {/* Passive indicator for pixies */}
        {entity.activationType === 'passive' && (
          <span className={styles['stat-passive']}>Passive Effect</span>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// FILTER LOGIC
// =============================================================================

/**
 * Apply a filter config to an entity.
 */
function matchesFilter(entity, filter, slotMap, slotPrefix) {
  if (!filter.match) return true; // 'all' filter
  
  const { field, value, contains } = filter.match;
  
  // Special field: _equipped
  if (field === '_equipped') {
    const isEquipped = slotPrefix && Object.entries(slotMap || {})
      .some(([slotId, actionId]) => slotId.startsWith(slotPrefix) && actionId === entity.id);
    return isEquipped === value;
  }
  
  // Contains check (substring)
  if (contains) {
    return String(entity[field] || '').includes(contains);
  }
  
  // Exact match for nested fields (e.g., buff.type)
  if (field.includes('.')) {
    const parts = field.split('.');
    let val = entity;
    for (const part of parts) {
      val = val?.[part];
    }
    return val === value;
  }
  
  // Direct field match
  return entity[field] === value;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function EntityPanel({ panel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(panel.filters[0]?.id || 'all');
  const buttonRef = useRef(null);
  const { slotMap } = useSlotMap();
  const { collected, PIXIES } = usePixies();
  
  // Get class-scoped entities - THE ONLY SOURCE OF TRUTH
  const { skills, consumables, pixies } = useClassContent();
  
  // Get entity lookup function based on type
  const getEntityById = useMemo(() => {
    if (panel.entityType === 'pixie') {
      return (id) => PIXIES[id];
    }
    // For skills/consumables, we don't need a special lookup
    return () => null;
  }, [panel.entityType, PIXIES]);
  
  // Get all entities for this panel type from class-scoped data
  const allEntities = useMemo(() => {
    // Map entityType to class-scoped arrays
    switch (panel.entityType) {
      case 'skill':
        return skills;
      case 'consumable':
        return consumables;
      case 'pixie':
        // For pixies, filter to only collected ones
        return pixies.filter(p => collected.includes(p.id));
      default:
        return [];
    }
  }, [panel.entityType, skills, consumables, pixies, collected]);
  
  // Filter based on active tab
  const activeFilter = panel.filters.find(f => f.id === activeTab);
  const slotPrefix = panel.slots?.slotPrefix || null;
  
  const filteredEntities = useMemo(() => {
    if (!activeFilter) return allEntities;
    return allEntities.filter(e => matchesFilter(e, activeFilter, slotMap, slotPrefix));
  }, [allEntities, activeFilter, slotMap, slotPrefix]);
  
  // Get slots for this panel if configured
  const panelSlots = useMemo(() => {
    if (!panel.slots?.show) return [];
    return ALL_SLOTS.filter(s => s.id.startsWith(panel.slots.slotPrefix));
  }, [panel.slots]);
  
  return (
    <>
      <MenuButton 
        ref={buttonRef}
        icon={<SvgIcon svg={panel.resolvedIcon} />}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        label={`Toggle ${panel.label.toLowerCase()}`}
        tooltip={panel.label}
      />

      <Drawer 
        isOpen={isOpen} 
        anchorRef={buttonRef} 
        width={panel.width || 360}
        portalId={`${panel.id}-portal`}
      >
        <DrawerTitle>{panel.label}</DrawerTitle>
        
        {/* Slot section if configured */}
        {panelSlots.length > 0 && (
          <div className={styles['slot-section']}>
            <div className={styles['slot-grid']}>
              {panelSlots.map((slot, index) => (
                <EntitySlot
                  key={slot.id}
                  slotId={slot.id}
                  slotIndex={index}
                  entityType={panel.entityType}
                  getEntityById={getEntityById}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Filter tabs */}
        <div className={styles['tab-bar']}>
          {panel.filters.map(filter => (
            <button
              key={filter.id}
              className={`${styles['tab']} ${activeTab === filter.id ? styles['tab-active'] : ''}`}
              style={{ '--tab-color': filter.color }}
              onClick={() => setActiveTab(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        {/* Hint text if configured */}
        {panel.hint && (
          <p className={styles['hint']}>{panel.hint}</p>
        )}
        
        {/* Entity list */}
        <ScrollList maxHeight={panel.slots?.show ? 280 : 320} gap={8}>
          {filteredEntities.length === 0 ? (
            <div className={styles['empty-state']}>{panel.emptyMessage}</div>
          ) : (
            filteredEntities.map(entity => (
              <EntityCard key={entity.id} entity={entity} panel={panel} />
            ))
          )}
        </ScrollList>
      </Drawer>
    </>
  );
}
