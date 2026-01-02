import { useState, useRef } from 'react';
import { MenuButton, Drawer, DrawerTitle, ScrollList, SvgIcon } from '@/ui';
import styles from './styles.module.css';
import { useKeyMap } from '@/hooks/useKeyMap';
import { useSlotMap, SKILL_SLOTS, MOUSE_SLOTS, CONSUMABLE_SLOTS } from '@/hooks/useSlotMap';
import gearIcon from '@/assets/icons/gear.svg?raw';

// Only show slots that have keybindings (exclude pixie slots)
const KEYBINDABLE_SLOTS = [...SKILL_SLOTS, ...MOUSE_SLOTS, ...CONSUMABLE_SLOTS];

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
                icon={<SvgIcon svg={gearIcon} />}
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
                    {KEYBINDABLE_SLOTS.map((slot) => {
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