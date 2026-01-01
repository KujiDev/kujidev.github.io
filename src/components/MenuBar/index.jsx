import styles from './styles.module.css';
import Settings from '@/components/Settings';
import Achievements from '@/components/Achievements';

export default function MenuBar() {
  return (
    <div className={styles['menu-bar']}>
      <Achievements />
      <Settings />
    </div>
  );
}
