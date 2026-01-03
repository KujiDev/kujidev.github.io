import { useState, useRef, useMemo, memo } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import { useDraggable, useDropTarget, useDragDrop } from '@/hooks/useDragDrop';
import { useSlotMap, usePixies } from '@/hooks/useGame';
import { PIXIE_SLOTS } from '@/config/slots';
import { getPixies } from '@/config/actions';
import styles from './styles.module.css';
import pixieIcon from '@/assets/icons/pixie.svg?raw';

// Buff type display info
const BUFF_INFO = {
  healthRegen: { label: 'Health Regen', suffix: '/sec', color: '#40ff80', name: 'Healing' },
  manaRegen: { label: 'Mana Regen', suffix: '/sec', color: '#40a0ff', name: 'Mana' },
  maxHealth: { label: 'Max Health', suffix: '', color: '#ff6040', name: 'Vitality' },
  maxMana: { label: 'Max Mana', suffix: '', color: '#a040ff', name: 'Arcane' },
};

const TABS = [
  { id: 'all', label: 'All', color: '#a89878' },
  { id: 'healthRegen', label: 'Healing', color: '#40ff80' },
  { id: 'manaRegen', label: 'Mana', color: '#40a0ff' },
  { id: 'maxMana', label: 'Arcane', color: '#a040ff' },
  { id: 'maxHealth', label: 'Vitality', color: '#ff6040' },
];

/**
 * PixieSlot - equipment slot for pixies using the drag system
 */
const PixieSlot = memo(function PixieSlot({ slotId, slotIndex }) {
  const { slotMap } = useSlotMap();
  const { PIXIES } = usePixies();
  const { ref: dropRef, isHovered, isDragging } = useDropTarget(slotId);
  const { startDrag } = useDragDrop();
  const startPos = useRef(null);
  
  const pixieId = slotMap?.[slotId] || null;
  const pixie = pixieId ? PIXIES[pixieId] : null;
  
  // Drag handlers for slot-to-slot dragging
  const handlePointerDown = (e) => {
    if (!pixie) return;
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  
  const handlePointerMove = (e) => {
    if (!startPos.current || !pixie) return;
    
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      startDrag(
        { id: pixie.id, icon: pixie.icon, label: pixie.label, dragType: 'pixie' },
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
      className={`${styles['pixie-slot']} ${isHovered && isDragging ? styles['slot-hover'] : ''} ${pixie ? styles['slot-filled'] : ''}`}
      style={pixie ? { '--element-color': pixie.color } : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {pixie ? (
        <img src={pixie.icon} alt={pixie.label} draggable={false} />
      ) : (
        <span className={styles['slot-number']}>{slotIndex + 1}</span>
      )}
    </div>
  );
});

/**
 * PixieCard - matches SpellCard pattern exactly
 * Now receives pixie actions (same shape as skill actions)
 */
const PixieCard = memo(function PixieCard({ pixie }) {
  const buffInfo = BUFF_INFO[pixie.buff.type];
  const { slotMap } = useSlotMap();
  
  // Create a draggable action object matching the spell pattern
  const action = useMemo(() => ({
    id: pixie.id,
    label: pixie.label,
    icon: pixie.icon,
    dragType: 'pixie',
  }), [pixie]);
  
  const { handlers, isDragging } = useDraggable(action);
  
  // Find which slot contains this pixie using slotMap directly
  const assignedSlot = useMemo(() => {
    const entry = Object.entries(slotMap || {}).find(([_, actionId]) => actionId === pixie.id);
    return entry ? entry[0] : null;
  }, [slotMap, pixie.id]);
  const slotNumber = assignedSlot ? PIXIE_SLOTS.findIndex(s => s.id === assignedSlot) + 1 : null;
  
  return (
    <div 
      className={`${styles['pixie-card']} ${isDragging ? styles['dragging'] : ''} ${assignedSlot ? styles['assigned'] : ''}`}
      {...handlers}
    >
      <div className={styles['pixie-header']}>
        {pixie.icon && (
          <div 
            className={styles['pixie-icon']}
            style={{ '--element-color': pixie.color }}
          >
            <img src={pixie.icon} alt="" draggable={false} />
          </div>
        )}
        <div className={styles['pixie-info']}>
          <span className={styles['pixie-name']}>{pixie.label}</span>
          <div className={styles['pixie-badges']}>
            <span 
              className={styles['pixie-element']}
              style={{ '--element-color': buffInfo.color }}
            >
              {buffInfo.name}
            </span>
            <span className={styles['pixie-type']}>Pixie</span>
            {slotNumber && (
              <span className={styles['pixie-assigned']}>Slot {slotNumber}</span>
            )}
          </div>
        </div>
        <div className={styles['drag-hint']}>⋮⋮</div>
      </div>
      
      <p className={styles['pixie-desc']}>{pixie.description}</p>
      
      <div className={styles['pixie-stats']}>
        <span className={styles['stat-buff']} style={{ color: buffInfo.color }}>
          <span className={styles['stat-label']}>{buffInfo.label}:</span> +{pixie.buff.value}{buffInfo.suffix}
        </span>
        <span className={styles['stat-passive']}>Passive Effect</span>
      </div>
    </div>
  );
});

export default function Pixies() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const buttonRef = useRef(null);
  const { collected, PIXIES } = usePixies();
  
  // Get all collected pixies as objects
  const allPixies = useMemo(() => 
    collected.map(id => PIXIES[id]).filter(Boolean),
    [collected, PIXIES]
  );
  
  // Filter by buff type
  const filteredPixies = useMemo(() => {
    if (activeTab === 'all') return allPixies;
    return allPixies.filter(p => p.buff.type === activeTab);
  }, [activeTab, allPixies]);

  return (
    <>
      <MenuButton 
        ref={buttonRef}
        icon={<SvgIcon svg={pixieIcon} />}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        label="Toggle pixies panel"
        tooltip="Pixies"
      />

      <Drawer 
        isOpen={isOpen} 
        anchorRef={buttonRef} 
        width={380}
        portalId="pixies-portal"
      >
        <DrawerTitle>Pixies</DrawerTitle>
        
        <div className={styles['equipment-section']}>
          <div className={styles['equipment-label']}>Equipped</div>
          <div className={styles['equipment-slots']}>
            {PIXIE_SLOTS.map((slot, index) => (
              <PixieSlot key={slot.id} slotId={slot.id} slotIndex={index} />
            ))}
          </div>
        </div>
        
        <div className={styles['tab-bar']}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles['tab']} ${activeTab === tab.id ? styles['tab-active'] : ''}`}
              style={{ '--tab-color': tab.color }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <ScrollList maxHeight={320} gap={8}>
          {filteredPixies.length === 0 ? (
            <div className={styles['empty-state']}>No pixies in this category</div>
          ) : (
            filteredPixies.map(pixie => (
              <PixieCard key={pixie.id} pixie={pixie} />
            ))
          )}
        </ScrollList>
      </Drawer>
    </>
  );
}
