import styles from './styles.module.css';
import Settings from '@/components/Settings';
import Achievements from '@/components/Achievements';
import EntityPanel from '@/components/EntityPanel';
import { useClassPanels } from '@/hooks/useClassContent';

export default function MenuBar() {
  // Get class-scoped panels - THE ONLY SOURCE OF TRUTH
  const panels = useClassPanels();
  
  return (
    <div className={styles['menu-bar']}>
      {/* Entity panels - data-driven from class config */}
      {panels.map(panel => (
        <EntityPanel key={panel.id} panel={panel} />
      ))}
      
      {/* System panels - always present */}
      <Achievements />
      <Settings />
    </div>
  );
}
