import styles from './styles.module.css';
import { useKeyMap } from '@/hooks/useKeyMap';
import { ACTIONS } from '@/config/actions';

export default function Settings() {
    const { keyMap, getDisplayKey, startRebind, rebinding, resetToDefaults } = useKeyMap();
    const actions = Object.values(ACTIONS);

    return (
        <div className={styles['settings-panel']}>
            <div className={styles['settings-title']}>Key Bindings</div>

            <div className={styles['keybind-list']}>
                {actions.map((action) => (
                    <div key={action.id} className={styles['keybind-row']}>
                        <span className={styles['keybind-action']}>{action.label}</span>
                        <button 
                            className={`${styles['keybind-key']} ${rebinding === action.id ? styles['rebinding'] : ''}`}
                            onClick={() => startRebind(action.id)}
                        >
                            {rebinding === action.id ? '...' : getDisplayKey(action.id)}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}