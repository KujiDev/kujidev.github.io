import { useState, useRef } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList } from '@/ui';
import styles from './styles.module.css';
import { useKeyMap } from '@/hooks/useKeyMap';
import { useSlotMap, ALL_SLOTS } from '@/hooks/useSlotMap';

const GearIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

// Friendly labels for slots
const SLOT_LABELS = {
  slot_1: 'Skill Slot 1',
  slot_2: 'Skill Slot 2',
  slot_3: 'Skill Slot 3',
  slot_4: 'Skill Slot 4',
  slot_lmb: 'Primary Attack',
  slot_rmb: 'Secondary Attack',
  slot_consumable_1: 'Consumable 1',
  slot_consumable_2: 'Consumable 2',
};

export default function Settings() {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const { getDisplayKey, startRebind, rebinding, resetToDefaults } = useKeyMap();
    const { getActionObjectForSlot } = useSlotMap();

    return (
        <>
            <MenuButton 
                ref={buttonRef}
                icon={<GearIcon />}
                isOpen={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                label="Toggle settings"
                tooltip="Key Bindings"
                activeAnimation="rotate"
            />

            <Drawer 
                isOpen={isOpen} 
                anchorRef={buttonRef} 
                width={300}
                portalId="settings-portal"
            >
                <DrawerTitle>Key Bindings</DrawerTitle>

                <ScrollList maxHeight={320} gap={6}>
                    {ALL_SLOTS.map((slot) => {
                        const action = getActionObjectForSlot(slot.id);
                        return (
                            <div key={slot.id} className={styles['keybind-row']}>
                                <div className={styles['keybind-info']}>
                                    <span className={styles['keybind-slot']}>{SLOT_LABELS[slot.id]}</span>
                                    {action && (
                                        <span className={styles['keybind-action']}>{action.label}</span>
                                    )}
                                </div>
                                <button 
                                    className={`${styles['keybind-key']} ${rebinding === slot.id ? styles['rebinding'] : ''}`}
                                    onClick={() => startRebind(slot.id)}
                                >
                                    {rebinding === slot.id ? '...' : getDisplayKey(slot.id)}
                                </button>
                            </div>
                        );
                    })}
                </ScrollList>

                <button className={styles['reset-button']} onClick={resetToDefaults}>
                    Reset to Defaults
                </button>
            </Drawer>
        </>
    )
}