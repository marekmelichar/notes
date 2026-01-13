# Styling Guide - EVP UI

## 📋 Table of Contents
1. [Overview](#overview)
2. [Common Styles Reference](#common-styles-reference)
3. [CSS Modules Strategy](#css-modules-strategy)
4. [MUI CSS Variables](#mui-css-variables)
5. [Decision Tree](#decision-tree)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## Overview

This project uses **CSS Modules** as the primary styling approach. All styles are either:
- CSS Module classes
- MUI native props
- MUI CSS variables
- `sx` prop for dynamic/calculated values only

**Avoid inline `sx` objects** for static styles to prevent unnecessary object recreation on every render. Use `sx` only for calculated values (e.g., `top: HEADER_HEIGHT + SIDEBAR_HEIGHT`).

---

## Global Styles

**Location**: `src/variables.module.css`

### Available Global Classes

#### `.customScrollbar`
Custom webkit scrollbar with dark mode support. Use by importing and combining with local classes:

```tsx
import styles from './index.module.css';
import variables from '@/variables.module.css';

// Single global class
<Box className={variables.customScrollbar}>

// Combined with local class
<Box className={`${styles.container} ${variables.customScrollbar}`}>
```

### When to Add Global Styles

Add a class to `variables.module.css` when:
- ✅ The pattern is used in **2+ components**
- ✅ The styling is **exactly the same** across uses
- ✅ It saves significant code duplication

Otherwise, keep styles in local `.module.css` files.

---

## CSS Modules Strategy

### File Structure
Each component has its own `.module.css` file:
```
ComponentName/
  ├── index.tsx
  └── index.module.css

or

ComponentName/
  ├── ComponentName.tsx
  └── ComponentName.module.css
```

### Import Pattern
```tsx
import styles from './index.module.css';

<Box className={styles.container}>...</Box>
```

---

## MUI CSS Variables

MUI automatically provides CSS variables for all theme values. These are accessible in CSS Modules:

### Palette Variables

#### Text Colors
- `--mui-palette-text-primary` - Primary text color
- `--mui-palette-text-secondary` - Secondary text color

#### Primary Colors
- `--mui-palette-primary-main` - Main brand color
- `--mui-palette-primary-light` - Light brand color
- `--mui-palette-primary-dark` - Dark brand color
- `--mui-palette-primary-contrastText` - Text on primary background

#### Secondary Colors
- `--mui-palette-secondary-main`
- `--mui-palette-secondary-light`
- `--mui-palette-secondary-dark`
- `--mui-palette-secondary-contrastText`

#### Status Colors
- `--mui-palette-error-main`, `--mui-palette-error-light`, `--mui-palette-error-dark`
- `--mui-palette-warning-main`, `--mui-palette-warning-light`, `--mui-palette-warning-dark`
- `--mui-palette-info-main`, `--mui-palette-info-light`, `--mui-palette-info-dark`
- `--mui-palette-success-main`, `--mui-palette-success-light`, `--mui-palette-success-dark`

#### Background Colors
- `--mui-palette-background-default` - Main page background
- `--mui-palette-background-primary` - Primary panels
- `--mui-palette-background-secondary` - Secondary panels
- `--mui-palette-background-paper` - Paper/modal backgrounds
- `--mui-palette-background-selected` - Selected items

#### Action Colors
- `--mui-palette-action-active` - Active state color
- `--mui-palette-action-hover` - Hover state background

#### Grey Scale
- `--mui-palette-grey-50` through `--mui-palette-grey-900`

### Custom Palette Properties
Any custom property in your palette (like `action.active`) is automatically converted:
```typescript
// lightPalette.ts
action: {
  active: '#384247',
}

// Becomes in CSS:
// --mui-palette-action-active
```

---

## Decision Tree

When styling a component, follow this decision tree:

```
┌─────────────────────────────────────────┐
│ What type of style do you need?        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Is it a dynamic/calculated value?                   │
│    (top: HEADER_HEIGHT + SIDEBAR_HEIGHT, etc.)         │
└─────────────────────────────────────────────────────────┘
                   ↓
              ✅ YES → Use sx prop with calculation
                   │  Example: <Box sx={{ top: HEADER_HEIGHT + SIDEBAR_HEIGHT }} />
                   │  Note: Do NOT use CSS custom properties for calculated values
                   │
              ❌ NO → Continue
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Is it a MUI native prop?                            │
│    (height, width, mt, mb, ml, mr, p, px, py, etc.)    │
└─────────────────────────────────────────────────────────┘
                   ↓
              ✅ YES → Use inline prop
                   │  Example: <Box height={64} mt={2} />
                   │
              ❌ NO → Continue
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Is it static/unchanging CSS?                        │
└─────────────────────────────────────────────────────────┘
                   ↓
              ✅ YES → Use CSS Module class
                   │  Example: <Box className={styles.container} />
                   │
              ❌ NO → Continue
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Does it depend on state/props?                      │
└─────────────────────────────────────────────────────────┘
                   ↓
              ✅ YES → Use conditional className
                   │  Example: <Box className={isActive ? styles.active : styles.inactive} />
                   │
              ❌ NO → Continue
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Does it need MUI component nested selectors?        │
│    (& .MuiTab-root, & .MuiButton-contained, etc.)      │
└─────────────────────────────────────────────────────────┘
                   ↓
              ✅ YES → Use :global() in CSS Module
                   │  Example: .tabs :global(.MuiTab-root) { ... }
```

---

## Best Practices

### ✅ DO

1. **Use CSS Modules for all static styles**
   ```tsx
   // ✅ Good
   <Box className={styles.header} />
   ```

2. **Use MUI native props for simple values**
   ```tsx
   // ✅ Good
   <Box height={HEADER_HEIGHT} mt={2} px={3} />
   ```

3. **Use relative units (rem, em) instead of pixels**
   ```css
   /* ✅ Good - Responsive and accessible */
   .container {
     padding: 1rem;
     margin-top: 1.5rem;
     font-size: 1rem;
     gap: 0.5rem;
   }
   
   /* ❌ Bad - Fixed pixel values */
   .container {
     padding: 16px;
     margin-top: 24px;
     font-size: 16px;
     gap: 8px;
   }
   ```

4. **Use conditional classNames for dynamic styles**
   ```tsx
   // ✅ Good
   <Typography className={isLoading ? styles.loading : styles.loaded}>
     {title}
   </Typography>
   ```

5. **Use MUI CSS variables in CSS Modules**
   ```css
   /* ✅ Good */
   .button {
     color: var(--mui-palette-text-secondary);
     background-color: var(--mui-palette-primary-main);
   }
   ```

6. **Use :global() for MUI component overrides**
   ```css
   /* ✅ Good */
   .tabs :global(.MuiTab-root) {
     text-transform: none;
     color: var(--mui-palette-text-primary);
   }
   ```

7. **Use `sx` prop for dynamic/calculated values**
   ```tsx
   // ✅ Good - Combine CSS Module for static styles with sx for calculated values
   <Box
     className={styles.loadingContainer}
     sx={{
       top: HEADER_HEIGHT + TRAIN_DRIVERS_HEADER_HEIGHT,
       left: SIDEBAR_WIDTH + TRAIN_DRIVERS_LEFT_SIDEBAR_WIDTH,
     }}
   />
   ```
   ```css
   /* index.module.css - Contains static properties */
   .loadingContainer {
     position: fixed;
     display: flex;
     justify-content: center;
     align-items: center;
     right: 0;
     bottom: 0;
   }
   ```

### ❌ DON'T

1. **Don't use `sx` prop for static styles**
   ```tsx
   // ❌ Bad - Creates new object every render
   <Box sx={{ marginTop: '1rem', color: 'primary.main' }} />
   
   // ✅ Good
   <Box className={styles.box} />
   ```

2. **Don't use CSS custom properties for calculated values**
   ```tsx
   // ❌ Bad - Breaks the dependency chain
   <Box
     className={styles.container}
     style={{
       '--loading-top': `${HEADER_HEIGHT + SIDEBAR_HEIGHT}px`,
     }}
   />
   ```
   ```css
   .container {
     top: var(--loading-top); /* ❌ Bad - Not clear this is calculated */
   }
   ```
   
   ```tsx
   // ✅ Good - Clear calculation is visible in component
   <Box
     className={styles.container}
     sx={{ top: HEADER_HEIGHT + SIDEBAR_HEIGHT }}
   />
   ```

3. **Don't use inline styles for static values**
   ```tsx
   // ❌ Bad
   <Box style={{ display: 'flex', gap: '1rem' }} />
   
   // ✅ Good
   <Box className={styles.flexContainer} />
   ```

4. **Don't use theme in components for colors**
   ```tsx
   // ❌ Bad
   const theme = useTheme();
   <Box sx={{ color: theme.palette.text.secondary }} />

   // ✅ Good
   <Box className={styles.text} />
   ```
   ```css
   .text {
     color: var(--mui-palette-text-secondary);
   }
   ```

5. **Don't use transform on hover**
   ```css
   /* ❌ Bad - Avoid transform effects on hover */
   .card:hover {
     transform: translateY(-2px);
   }

   /* ✅ Good - Use background-color or other subtle effects instead */
   .card:hover {
     background-color: var(--mui-palette-action-hover);
   }
   ```

---

## Examples

### Example 1: Simple Container
```tsx
// Component
import styles from './index.module.css';

export const Container = ({ children }) => (
  <Box className={styles.container} height={600}>
    {children}
  </Box>
);
```

```css
/* index.module.css */
.container {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: var(--mui-palette-background-paper);
}
```

### Example 2: Dynamic States
```tsx
// Component
import styles from './index.module.css';

export const Button = ({ loading, disabled }) => (
  <button 
    className={
      loading ? styles.loading : 
      disabled ? styles.disabled : 
      styles.button
    }
  >
    Submit
  </button>
);
```

```css
/* index.module.css */
.button {
  padding: 0.5rem 1rem;
  background-color: var(--mui-palette-primary-main);
  color: var(--mui-palette-primary-contrastText);
}

.loading {
  composes: button;
  opacity: 0.7;
  cursor: wait;
}

.disabled {
  composes: button;
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Example 3: MUI Component Overrides
```tsx
// Component
import styles from './index.module.css';

export const Navigation = () => (
  <Tabs className={styles.tabs}>
    <Tab label="Home" />
    <Tab label="About" />
  </Tabs>
);
```

```css
/* index.module.css */
.tabs :global(.MuiTab-root) {
  text-transform: none;
  font-weight: 500;
  color: var(--mui-palette-text-primary);
  min-width: 4.5rem;
}

.tabs :global(.MuiTab-root:hover) {
  background-color: var(--mui-palette-action-hover);
}

.tabs :global(.Mui-selected) {
  color: var(--mui-palette-primary-main);
}
```

### Example 4: Conditional Styles with Theme Variables
```tsx
// Component
import styles from './index.module.css';

export const SearchInput = ({ loading, value, onClear }) => (
  <OutlinedInput
    value={value}
    className={styles.searchInput}
    endAdornment={
      <Box className={styles.endAdornment}>
        {loading && (
          <CircularProgress 
            className={loading ? styles.spinnerVisible : styles.spinner}
            size={24}
          />
        )}
        {value && (
          <IconButton onClick={onClear} className={styles.clearButton}>
            <ClearIcon className={styles.clearIcon} />
          </IconButton>
        )}
      </Box>
    }
  />
);
```

```css
/* index.module.css */
.searchInput :global(.MuiOutlinedInput-root) {
  border-radius: 5rem;
}

.endAdornment {
  position: relative;
  height: 24px;
}

.spinner {
  position: absolute;
  top: 0;
  right: 0;
  transition: opacity 0.2s;
  opacity: 0;
}

.spinnerVisible {
  composes: spinner;
  opacity: 1;
}

.clearButton {
  position: absolute;
  top: -4px;
  right: -4px;
  color: var(--mui-palette-text-secondary);
}

.clearIcon {
  font-size: 1.5rem;
}
```

### Example 5: Layout with MUI Props
```tsx
// Component
import styles from './index.module.css';

export const Header = () => (
  <Box 
    className={styles.header} 
    height={64}
    px={2}
  >
    <Box className={styles.titleWrapper}>
      <Typography variant="h6">EVP UI</Typography>
    </Box>
    <Box className={styles.actions} ml="auto">
      <Button>Login</Button>
    </Box>
  </Box>
);
```

```css
/* index.module.css */
.header {
  display: flex;
  align-items: center;
  background-color: var(--mui-palette-background-primary);
}

.titleWrapper {
  margin-right: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
}
```

---

## Benefits

✅ **Performance**: No object creation on every render  
✅ **Type Safety**: CSS Modules provide typed class names  
✅ **Maintainability**: Styles are colocated but separate  
✅ **Theme Support**: MUI CSS variables auto-update with theme  
✅ **Developer Experience**: Clear separation of concerns  
✅ **Bundle Size**: Better tree-shaking and CSS extraction  

---

## Common Patterns

### Spacing (Always use `rem`)
```tsx
// Instead of sx={{ mt: 2, mb: 3, px: 4 }}
<Box mt={2} mb={3} px={4} />
```

```css
/* Use rem for spacing - NOT pixels */
.container {
  margin-top: 1rem;      /* ✅ Good */
  padding: 1.5rem;       /* ✅ Good */
  gap: 0.5rem;           /* ✅ Good */
  
  /* margin-top: 16px;   ❌ Avoid pixels */
  /* padding: 24px;      ❌ Avoid pixels */
}
```

### Colors from Theme
```css
/* Instead of sx={{ color: 'primary.main' }} */
.text {
  color: var(--mui-palette-primary-main);
}
```

### Hover States
```css
/* Instead of sx={{ '&:hover': { backgroundColor: 'action.hover' } }} */
.button:hover {
  background-color: var(--mui-palette-action-hover);
}
```

### Conditional Rendering
```tsx
// Instead of sx={{ display: isVisible ? 'block' : 'none' }}
<Box className={isVisible ? styles.visible : styles.hidden} />
```

### Unit Guidelines

**Use `rem` for:**
- Spacing (margin, padding, gap)
- Font sizes
- Border radius (for consistent scaling)
- Most layout dimensions

**Use `px` only for:**
- Border widths (1px, 2px)
- Box shadows (when precision matters)
- Fixed icon sizes (24px, 32px) - but prefer `rem` when possible

**Use `%` for:**
- Responsive widths
- Aspect ratios

**Example:**
```css
.card {
  padding: 1.5rem;           /* rem for spacing */
  margin-bottom: 2rem;       /* rem for spacing */
  border: 1px solid #ccc;    /* px for borders */
  border-radius: 0.5rem;     /* rem for consistent scaling */
  font-size: 1rem;           /* rem for text */
  width: 100%;               /* % for responsive */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* px for precision */
}
```