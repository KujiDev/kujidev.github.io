import styles from './styles.module.css';

export default function Settings({ keyMap, rebind }) {
    return (
        <div className={styles['settings-panel']}>
            <div className={styles['settings-title']}>Key Bindings</div>

            <div className={styles['keybind-list']}>
                {keyMap.map((bind, i) => (

                    <div key={i} className={styles['keybind-row']}>
                        <span className={styles['keybind-action']}>{bind.name}</span>
                        <button className={styles['keybind-key']} onClick={() => rebind(bind.name)}>{bind.keys.join(', ')}</button>
                    </div>

                ))}
            </div>
        </div>
    )
}