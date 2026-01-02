import styles from './styles.module.css';
import Settings from '@/components/Settings';
import Achievements from '@/components/Achievements';
import SpellBook from '@/components/SpellBook';
import Consumables from '@/components/Consumables';
import Pixies from '@/components/Pixies';

export default function MenuBar() {
  return (
    <div className={styles['menu-bar']}>
      <SpellBook />
      <Consumables />
      <Pixies />
      <Achievements />
      <Settings />
    </div>
  );
}
