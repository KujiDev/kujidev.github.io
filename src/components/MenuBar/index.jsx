import styles from './styles.module.css';
import Settings from '@/components/Settings';
import Achievements from '@/components/Achievements';
import SpellBook from '@/components/SpellBook';

export default function MenuBar() {
  return (
    <div className={styles['menu-bar']}>
      <SpellBook />
      <Achievements />
      <Settings />
    </div>
  );
}
