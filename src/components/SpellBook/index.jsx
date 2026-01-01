import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles.module.css';
import { ACTIONS, ELEMENTS } from '@/config/actions';

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8M8 11h6" />
  </svg>
);

const TABS = [
  { id: 'all', label: 'All', color: '#a89878' },
  { id: 'ice', label: 'Ice', color: ELEMENTS.ice.primary },
  { id: 'fire', label: 'Fire', color: ELEMENTS.fire.primary },
  { id: 'arcane', label: 'Arcane', color: ELEMENTS.arcane.primary },
  { id: 'mana', label: 'Mana', color: ELEMENTS.mana.primary },
  { id: 'healing', label: 'Consumables', color: ELEMENTS.healing.primary },
];

function SpellCard({ action }) {
  const element = action.element ? ELEMENTS[action.element] : null;
  
  return (
    <div className={styles['spell-card']}>
      <div className={styles['spell-header']}>
        {action.icon && (
          <div 
            className={styles['spell-icon']}
            style={{ '--element-color': element?.primary || '#a89878' }}
          >
            <img src={action.icon} alt="" />
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
          </div>
        </div>
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
        {action.requiresTarget && (
          <span className={styles['stat-target']}>Requires Target</span>
        )}
      </div>
    </div>
  );
}

export default function SpellBook() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const buttonRef = useRef(null);
  const [portalContainer] = useState(() => {
    const div = document.createElement('div');
    div.id = 'spellbook-portal';
    return div;
  });
  
  // Add/remove portal container from body
  useEffect(() => {
    document.body.appendChild(portalContainer);
    return () => document.body.removeChild(portalContainer);
  }, [portalContainer]);
  
  const allActions = Object.values(ACTIONS);
  
  const filteredActions = useMemo(() => {
    if (activeTab === 'all') return allActions;
    if (activeTab === 'healing') {
      return allActions.filter(a => a.element === 'healing');
    }
    return allActions.filter(a => a.element === activeTab);
  }, [activeTab, allActions]);

  return (
    <>
      <button 
        ref={buttonRef}
        className={`${styles['menu-button']} ${isOpen ? styles['active'] : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle spell book"
      >
        <BookIcon />
      </button>

      {isOpen && createPortal(
        <div 
          className={styles['spellbook-drawer']}
          style={{
            position: 'fixed',
            bottom: buttonRef.current 
              ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8 
              : 100,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className={styles['drawer-title']}>Spell Book</div>
          
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
          
          <div className={styles['spell-list']}>
            {filteredActions.length === 0 ? (
              <div className={styles['empty-state']}>No spells in this category</div>
            ) : (
              filteredActions.map(action => (
                <SpellCard key={action.id} action={action} />
              ))
            )}
          </div>
        </div>,
        portalContainer
      )}
    </>
  );
}
