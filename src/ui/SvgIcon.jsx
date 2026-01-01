import { useMemo, memo } from 'react';

/**
 * Renders an imported SVG string inline so currentColor works.
 * Import SVGs with ?raw suffix: import icon from './icon.svg?raw'
 * 
 * @param {Object} props
 * @param {string} props.svg - Raw SVG string (import with ?raw)
 * @param {string} props.className - Optional class name for the SVG
 */

const SvgIcon = memo(function SvgIcon({ svg, className = '' }) {
  const svgData = useMemo(() => {
    if (!svg) return null;
    
    // Parse SVG and extract attributes + innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    
    if (!svgEl) return null;
    
    // Extract all attributes except width/height
    const attrs = {};
    for (const attr of svgEl.attributes) {
      if (attr.name !== 'width' && attr.name !== 'height') {
        // Convert to camelCase for React
        const name = attr.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        attrs[name] = attr.value;
      }
    }
    
    return { attrs, innerHTML: svgEl.innerHTML };
  }, [svg]);

  if (!svgData) return null;

  return (
    <svg 
      {...svgData.attrs}
      className={className}
      dangerouslySetInnerHTML={{ __html: svgData.innerHTML }}
    />
  );
});

export default SvgIcon;
