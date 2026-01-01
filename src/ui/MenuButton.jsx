import { forwardRef } from 'react';
import styles from './shared.module.css';
import Connector from '@/components/Connector';

/**
 * Reusable icon button for menu toggles.
 * Used by Settings, Achievements, SpellBook, etc.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - SVG icon component or element
 * @param {boolean} props.isOpen - Whether the associated panel is open
 * @param {Function} props.onClick - Click handler
 * @param {string} props.label - Aria label for accessibility
 * @param {string} props.tooltip - Tooltip text to show on hover
 * @param {'scale' | 'rotate'} props.activeAnimation - Animation type when active
 * @param {string} props.className - Additional class name
 */
const MenuButton = forwardRef(function MenuButton({ 
  icon, 
  isOpen = false, 
  onClick, 
  label,
  tooltip,
  activeAnimation = 'scale',
  className = '',
}, ref) {
  const animationClass = activeAnimation === 'rotate' ? styles['rotate-active'] : '';
  
  return (
    <div className={styles['menu-button-wrapper']}>
      <button 
        ref={ref}
        className={`${styles['menu-button']} ${isOpen ? styles['active'] : ''} ${animationClass} ${className}`}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
      </button>
      {tooltip && (
        <div className={styles['menu-button-tooltip']}>
          <span className={styles['menu-button-tooltip-text']}>{tooltip}</span>
          <Connector position="bottom" />
        </div>
      )}
    </div>
  );
});

export default MenuButton;
