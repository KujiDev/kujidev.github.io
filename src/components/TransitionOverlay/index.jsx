/**
 * =============================================================================
 * TRANSITION OVERLAY - Fade to Black During Scene Changes
 * =============================================================================
 * 
 * Full-screen overlay that fades in/out during scene transitions.
 * Blocks all pointer events during transitions.
 * 
 * FEATURES:
 * - Smooth fade animations (controlled by sceneStore)
 * - Optional loading spinner
 * - Blocks all clicks/input during transition
 * - GPU-accelerated opacity transitions
 */

import React, { memo } from 'react';
import useSceneStore, {
  selectOverlayOpacity,
  selectOverlayVisible,
  selectIsTransitioning,
} from '@/stores/sceneStore';

// =============================================================================
// STYLES
// =============================================================================

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#000000',
  zIndex: 9999,
  pointerEvents: 'all',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  willChange: 'opacity',
};

const hiddenStyle = {
  ...overlayStyle,
  pointerEvents: 'none',
  visibility: 'hidden',
};

const spinnerContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
};

const spinnerStyle = {
  width: '48px',
  height: '48px',
  border: '3px solid rgba(255, 255, 255, 0.1)',
  borderTopColor: 'rgba(255, 255, 255, 0.8)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const loadingTextStyle = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  letterSpacing: '0.5px',
};

// =============================================================================
// KEYFRAMES (injected once)
// =============================================================================

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// =============================================================================
// COMPONENT
// =============================================================================

function TransitionOverlay({ showSpinner = true }) {
  const opacity = useSceneStore(selectOverlayOpacity);
  const visible = useSceneStore(selectOverlayVisible);
  const isTransitioning = useSceneStore(selectIsTransitioning);
  
  // Inject spinner keyframes
  React.useEffect(() => {
    injectStyles();
  }, []);
  
  // Don't render if not visible (optimization)
  if (!visible && opacity === 0) {
    // Still render but hidden to prevent layout shift
    return <div style={hiddenStyle} />;
  }
  
  const style = {
    ...overlayStyle,
    opacity,
    // Block pointer events when transitioning
    pointerEvents: isTransitioning ? 'all' : 'none',
  };
  
  return (
    <div style={style} aria-hidden="true">
      {showSpinner && opacity > 0.5 && (
        <div style={spinnerContainerStyle}>
          <div style={spinnerStyle} />
          <span style={loadingTextStyle}>Loading...</span>
        </div>
      )}
    </div>
  );
}

export default memo(TransitionOverlay);
