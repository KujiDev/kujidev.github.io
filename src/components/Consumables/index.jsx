import { useState, useMemo, useRef } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import { useDraggable } from '@/hooks/useDragDrop';
import { useSlotMap } from '@/hooks/useSlotMap';
import styles from './styles.module.css';
import { getConsumables, ELEMENTS } from '@/config/actions';
import potionIcon from '@/assets/icons/potion.svg?raw';

const TABS = [
  { id: 'all', label: 'All', color: '#a89878' },
  { id: 'potion', label: 'Potions', color: ELEMENTS.healing.primary },
  { id: 'food', label: 'Food', color: '#c9a55a' },
];

function ConsumableCard({ action }) {
  const element = action.element ? ELEMENTS[action.element] : null;
  const { handlers, isDragging } = useDraggable(action);
  const { getSlotForAction } = useSlotMap();
  
  // Check if this consumable is currently assigned to a slot
  const assignedSlot = getSlotForAction(action.id);
  
  return (
    <div 
      className={`${styles['consumable-card']} ${isDragging ? styles['dragging'] : ''} ${assignedSlot ? styles['assigned'] : ''}`}
      {...handlers}
    >
      <div className={styles['consumable-header']}>
        {action.icon && (
          <div 
            className={styles['consumable-icon']}
            style={{ '--element-color': element?.primary || '#a89878' }}
          >
            <img src={action.icon} alt="" draggable={false} />
          </div>
        )}
        <div className={styles['consumable-info']}>
          <span className={styles['consumable-name']}>{action.label}</span>
          <div className={styles['consumable-badges']}>
            <span className={styles['consumable-type']}>{action.type}</span>
            {assignedSlot && (
              <span className={styles['consumable-assigned']}>Equipped</span>
            )}
          </div>
        </div>
        <div className={styles['drag-hint']}>⋮⋮</div>
      </div>
      
      <p className={styles['consumable-desc']}>{action.description}</p>
      
      <div className={styles['consumable-stats']}>
        {action.buff && (
          <>
            <span className={styles['stat-buff']}>
              <span className={styles['stat-label']}>Duration:</span> {action.buff.duration}s
            </span>
            {action.buff.healthRegenBonus > 0 && (
              <span className={styles['stat-heal']}>
                <span className={styles['stat-label']}>Health Regen:</span> +{action.buff.healthRegenBonus}/s
              </span>
            )}
            {action.buff.manaRegenBonus > 0 && (
              <span className={styles['stat-mana-gain']}>
                <span className={styles['stat-label']}>Mana Regen:</span> +{action.buff.manaRegenBonus}/s
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Consumables() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const buttonRef = useRef(null);
  
  // Get only consumables
  const allConsumables = getConsumables();
  
  const filteredConsumables = useMemo(() => {
    if (activeTab === 'all') return allConsumables;
    // Filter by id pattern (potion, food)
    return allConsumables.filter(a => a.id.includes(activeTab));
  }, [activeTab, allConsumables]);

  return (
    <>
      <MenuButton 
        ref={buttonRef}
        icon={<SvgIcon svg={potionIcon} />}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        label="Toggle consumables"
        tooltip="Consumables"
      />

      <Drawer 
        isOpen={isOpen} 
        anchorRef={buttonRef} 
        width={340}
        portalId="consumables-portal"
      >
        <DrawerTitle>Consumables</DrawerTitle>
        
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

        <p className={styles['hint']}>Drag to consumable slots only</p>
        
        <ScrollList maxHeight={280} gap={8}>
          {filteredConsumables.length === 0 ? (
            <div className={styles['empty-state']}>No consumables in this category</div>
          ) : (
            filteredConsumables.map(action => (
              <ConsumableCard key={action.id} action={action} />
            ))
          )}
        </ScrollList>
      </Drawer>
    </>
  );
}
