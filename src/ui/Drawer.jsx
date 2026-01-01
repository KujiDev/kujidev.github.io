import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './shared.module.css';

/**
 * Portal-based drawer panel that appears above a trigger button.
 * Handles portal creation/cleanup and positioning.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the drawer is visible
 * @param {React.RefObject} props.anchorRef - Ref to the button that triggers this drawer
 * @param {number} props.width - Drawer width in pixels
 * @param {string} props.portalId - Unique ID for the portal container
 * @param {string} props.className - Additional class name for the drawer
 * @param {React.ReactNode} props.children - Drawer content
 */
export default function Drawer({ 
  isOpen, 
  anchorRef, 
  width = 300, 
  portalId = 'drawer-portal',
  className = '',
  children 
}) {
  const [portalContainer] = useState(() => {
    const div = document.createElement('div');
    div.id = portalId;
    return div;
  });
  
  useEffect(() => {
    document.body.appendChild(portalContainer);
    return () => document.body.removeChild(portalContainer);
  }, [portalContainer]);
  
  if (!isOpen) return null;
  
  const bottom = anchorRef?.current 
    ? window.innerHeight - anchorRef.current.getBoundingClientRect().top + 8 
    : 100;
  
  return createPortal(
    <div 
      className={`${styles.drawer} ${className}`}
      style={{
        position: 'fixed',
        bottom,
        left: '50%',
        transform: 'translateX(-50%)',
        width,
      }}
    >
      {children}
    </div>,
    portalContainer
  );
}

/**
 * Standard drawer title with underline decoration.
 */
export function DrawerTitle({ children }) {
  return (
    <div className={styles['drawer-title']}>
      {children}
    </div>
  );
}
