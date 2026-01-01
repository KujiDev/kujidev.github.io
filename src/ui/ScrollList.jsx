import styles from './shared.module.css';

/**
 * Scrollable list container with consistent styling.
 * Handles touch/trackpad scrolling properly with R3F.
 * 
 * @param {Object} props
 * @param {number} props.maxHeight - Max height before scrolling (default: 280)
 * @param {number} props.gap - Gap between items (default: 6)
 * @param {string} props.className - Additional class name
 * @param {React.ReactNode} props.children - List items
 */
export default function ScrollList({ 
  maxHeight = 280, 
  gap = 6, 
  className = '',
  children 
}) {
  return (
    <div 
      className={`${styles['scroll-list']} ${className}`}
      style={{ 
        maxHeight, 
        gap,
        paddingRight: 4,
      }}
    >
      {children}
    </div>
  );
}
