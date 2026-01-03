# UI System

## Overview

This document describes the game's UI architecture, styling conventions, and component reuse patterns.

---

## CSS Variables

All UI components use the game's CSS variables defined in `src/index.css` for consistent styling:

### Typography
```css
--font-xs: 0.6875rem;   /* 11px - Badges, small labels */
--font-sm: 0.75rem;     /* 12px - Secondary text, stats */
--font-base: 0.8125rem; /* 13px - Body text, keybinds */
--font-md: 0.875rem;    /* 14px - Descriptions, tooltips */
--font-lg: 0.9375rem;   /* 15px - Names, headings */
--font-xl: 1.0625rem;   /* 17px - Titles, important names */

--weight-normal: 400;
--weight-semibold: 600;
--weight-bold: 700;
```

### Colors
```css
/* Gold/Bronze text colors */
--color-gold: #e8d6a8;
--color-gold-light: #f0e6c8;
--color-gold-dark: #c4b896;
--color-muted: #a89878;
--color-dim: #8a7a60;
--color-subtle: #6a5a48;

/* UI backgrounds */
--bg-dark: rgba(18,12,6,0.95);
--bg-panel: rgba(25,18,10,0.9);
--bg-card: rgba(35,25,15,0.9);
--bg-hover: rgba(45,32,18,0.95);
--bg-active: rgba(55,38,20,0.95);

/* Borders (gold/bronze frame) */
--border-dark: #2a1c0d;
--border-mid: #3d2a15;
--border-light: #5a4525;
--border-highlight: #6b5530;
--border-glow: #8a6a40;
```

### Shadows & Highlights
```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
--shadow-md: 0 4px 12px rgba(0,0,0,0.5);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.6);
--shadow-inset: inset 0 1px 3px rgba(0,0,0,0.5);
--shadow-glow-gold: 0 0 12px rgba(255,180,80,0.25);

--highlight-subtle: rgba(255,220,160,0.08);
--highlight-medium: rgba(255,220,160,0.15);
--highlight-strong: rgba(255,220,160,0.25);
```

---

## Shared UI Components

Located in `src/ui/`:

| Component | Purpose |
|-----------|---------|
| `Drawer` | Portal-based panel that appears above a trigger button |
| `DrawerTitle` | Standard drawer title with underline decoration |
| `MenuButton` | Icon button used to toggle drawers/panels |
| `ScrollList` | Scrollable container for lists |
| `SvgIcon` | SVG icon wrapper with consistent sizing |

---

## Panel Styling Pattern

All game panels follow this pattern:

```css
.panel {
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-dark) 100%);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: 
    var(--shadow-md),
    inset 0 1px 0 var(--highlight-subtle);
  color: var(--color-gold);
  font-family: 'Philosopher', 'Palatino Linotype', Georgia, serif;
}

.panel:hover {
  border-color: var(--border-highlight);
  box-shadow: 
    var(--shadow-md),
    var(--shadow-glow-gold),
    inset 0 1px 0 var(--highlight-medium);
}
```

---

## R3F Character Selection Panels

The CharacterCreationScreen uses the same styling system for 3D-anchored panels:

### Components

| Component | Purpose |
|-----------|---------|
| `CharacterSelectionScene` | R3F Canvas wrapper |
| `ClassPreviewModel` | 3D model with idle animation and selection highlight |
| `CharacterPanel3D` | HTML panel anchored to 3D position via drei's Html |

### Styling Consistency

- Uses same CSS variables as 2D UI
- `CharacterPanel3D.module.css` imports game theme variables
- Hover/selected states use `--border-glow`, `--shadow-glow-gold`
- Font family matches `Philosopher` from game theme

### Data-Driven Flow

```
class.json → getClasses() → CharacterSelectionScene → CharacterDisplay
                                     │
                                     ├─► ClassPreviewModel (model.path)
                                     └─► CharacterPanel3D (name, stats, loadout icons)
```

---

## Selection Highlights

### Model Highlights (3D)

```javascript
// Bronze/gold theme matching game UI
const HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#c4b896',      // --color-gold-dark
  emissive: '#6b5530',   // --border-highlight
  emissiveIntensity: 0.8,
});

const HOVER_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#e8d6a8',      // --color-gold
  emissive: '#8a6a40',   // --border-glow
  emissiveIntensity: 0.4,
});
```

### Button Highlights (2D)

```css
.confirmButton {
  background: linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-dark) 100%);
  border: 1px solid var(--border-glow);
  box-shadow: var(--shadow-md), var(--shadow-glow-gold);
}
```

---

## Best Practices

1. **Always use CSS variables** - Never hardcode colors
2. **Match font family** - Use `Philosopher` for headings, default for body
3. **Consistent shadows** - Use `--shadow-md` for panels, `--shadow-sm` for cards
4. **Warm gold/bronze palette** - No cold blues or grays in main UI
5. **Inset highlights** - Add subtle inner glow on hover/active states
