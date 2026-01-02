import { useState, useMemo, useRef } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import { useDraggable } from '@/hooks/useDragDrop';
import { useSlotMap } from '@/hooks/useSlotMap';
import styles from './styles.module.css';
import { getSpells, ELEMENTS } from '@/config/actions';
import bookIcon from '@/assets/icons/book.svg?raw';

const TABS = [
  { id: 'all', label: 'All', color: '#a89878' },
  { id: 'ice', label: 'Ice', color: ELEMENTS.ice.primary },
  { id: 'fire', label: 'Fire', color: ELEMENTS.fire.primary },
  { id: 'arcane', label: 'Arcane', color: ELEMENTS.arcane.primary },
  { id: 'mana', label: 'Mana', color: ELEMENTS.mana.primary },
];

function SpellCard({ action }) {
  const element = action.element ? ELEMENTS[action.element] : null;
  const { handlers, isDragging } = useDraggable(action);
  const { getSlotForAction } = useSlotMap();
  
  // Check if this spell is currently assigned to a slot
  const assignedSlot = getSlotForAction(action.id);
  
  return (
    <div 
      className={`${styles['spell-card']} ${isDragging ? styles['dragging'] : ''} ${assignedSlot ? styles['assigned'] : ''}`}
      {...handlers}
    >
      <div className={styles['spell-header']}>
        {action.icon && (
          <div 
            className={styles['spell-icon']}
            style={{ '--element-color': element?.primary || '#a89878' }}
          >
            <img src={action.icon} alt="" draggable={false} />
          </div>
        )}
        <div className={styles['spell-info']}>
          <span className={styles['spell-name']}>{action.label}</span>
          <div className={styles['spell-badges']}>
            {element && (
              <span 
                className={styles['spell-element']}
                style={{ '--element-color': element.primary }}
              >
                {element.name}
              </span>
            )}
            <span className={styles['spell-type']}>{action.type}</span>
            {assignedSlot && (
              <span className={styles['spell-assigned']}>Equipped</span>
            )}
          </div>
        </div>
        <div className={styles['drag-hint']}>⋮⋮</div>
      </div>
      
      <p className={styles['spell-desc']}>{action.description}</p>
      
      <div className={styles['spell-stats']}>
        {action.manaCost > 0 && (
          <span className={styles['stat-mana']}>
            <span className={styles['stat-label']}>Mana:</span> {action.manaCost}
          </span>
        )}
        {action.manaGain > 0 && (
          <span className={styles['stat-mana-gain']}>
            <span className={styles['stat-label']}>Mana:</span> +{action.manaGain}
          </span>
        )}
        {action.manaPerSecond > 0 && (
          <span className={styles['stat-mana']}>
            <span className={styles['stat-label']}>Drain:</span> {action.manaPerSecond}/s
          </span>
        )}
        {action.healthCost > 0 && (
          <span className={styles['stat-health']}>
            <span className={styles['stat-label']}>Health:</span> {action.healthCost}
          </span>
        )}
        {action.buff && (
          <>
            <span className={styles['stat-buff']}>
              <span className={styles['stat-label']}>Duration:</span> {action.buff.duration}s
            </span>
            {action.buff.manaRegenBonus > 0 && (
              <span className={styles['stat-mana-gain']}>
                <span className={styles['stat-label']}>Mana Regen:</span> +{action.buff.manaRegenBonus}/s
              </span>
            )}
            {action.buff.healthRegenBonus > 0 && (
              <span className={styles['stat-heal']}>
                <span className={styles['stat-label']}>Health Regen:</span> +{action.buff.healthRegenBonus}/s
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SpellBook() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const buttonRef = useRef(null);
  
  // Get only spells (not consumables)
  const allSpells = getSpells();
  
  const filteredSpells = useMemo(() => {
    if (activeTab === 'all') return allSpells;
    return allSpells.filter(a => a.element === activeTab);
  }, [activeTab, allSpells]);

  return (
    <>
      <MenuButton 
        ref={buttonRef}
        icon={<SvgIcon svg={bookIcon} />}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        label="Toggle spell book"
        tooltip="Spell Book"
      />

      <Drawer 
        isOpen={isOpen} 
        anchorRef={buttonRef} 
        width={380}
        portalId="spellbook-portal"
      >
        <DrawerTitle>Spell Book</DrawerTitle>
        
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
          {filteredSpells.length === 0 ? (
            <div className={styles['empty-state']}>No spells in this category</div>
          ) : (
            filteredSpells.map(action => (
              <SpellCard key={action.id} action={action} />
            ))
          )}
        </ScrollList>
      </Drawer>
    </>
  );
}
