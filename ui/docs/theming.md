# Theming

This project uses Material-UI (MUI) theming with support for light and dark modes.

## Overview

The theming system provides:
- Light and dark mode toggle
- Persistent theme preference (localStorage)
- System preference detection
- Customizable color palettes
- Component style overrides

## Theme Structure

```
src/theme/
├── ThemeProvider.tsx    # Context provider & toggle logic
├── lightTheme.ts        # Light theme configuration
├── darkTheme.ts         # Dark theme configuration
├── lightPalette.ts      # Light mode colors
├── darkPalette.ts       # Dark mode colors
├── typography.ts        # Font settings
├── components.ts        # MUI component overrides
├── ui-constants.ts      # Shared constants
└── index.ts             # Exports
```

## Using the Theme

### Theme Provider Setup

The `ThemeProvider` is already configured in `main.tsx`:

```typescript
// src/main.tsx
import { ThemeProvider } from './theme/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

### Accessing Theme Mode

Use the `useColorMode` hook:

```typescript
import { useColorMode } from '@/theme/ThemeProvider';

const MyComponent = () => {
  const { mode, toggleColorMode } = useColorMode();

  return (
    <div>
      <p>Current theme: {mode}</p>
      <button onClick={toggleColorMode}>
        Switch to {mode === 'light' ? 'dark' : 'light'}
      </button>
    </div>
  );
};
```

### Using Theme in Styles

```typescript
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        padding: theme.spacing(2),
      }}
    >
      Themed content
    </Box>
  );
};
```

## Theme Configuration

### Light Theme

`src/theme/lightTheme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';
import { lightPalette } from './lightPalette';
import { typography } from './typography';
import { components } from './components';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...lightPalette,
  },
  typography,
  components,
});
```

### Dark Theme

`src/theme/darkTheme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';
import { darkPalette } from './darkPalette';
import { typography } from './typography';
import { components } from './components';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
  typography,
  components,
});
```

## Customizing Colors

### Color Palette

Edit `src/theme/lightPalette.ts` or `darkPalette.ts`:

```typescript
export const lightPalette = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#fff',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#fff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
    primary: '#f0f0f0',
    secondary: '#e0e0e0',
    selected: '#e3f2fd',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
  error: {
    main: '#d32f2f',
  },
  warning: {
    main: '#ed6c02',
  },
  success: {
    main: '#2e7d32',
  },
  info: {
    main: '#0288d1',
  },
};
```

### Custom Palette Extensions

The theme extends MUI's default palette with custom properties:

```typescript
// Declared in src/main.tsx
declare module '@mui/material/styles' {
  interface TypeBackground {
    primary: string;
    secondary: string;
    selected: string;
  }

  interface Palette {
    unknown: {
      main: string;
      light: string;
    };
  }
}
```

Usage:
```typescript
<Box sx={{ bgcolor: 'background.primary' }}>
  Custom background
</Box>
```

## Typography

`src/theme/typography.ts`:

```typescript
export const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 500,
  },
};
```

## Component Overrides

`src/theme/components.ts`:

```typescript
import { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
    defaultProps: {
      disableElevation: true,
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
  },
};
```

## Theme Persistence

The theme preference is automatically saved to localStorage:

```typescript
// ThemeProvider.tsx
const getInitialMode = (): ColorMode => {
  // 1. Check localStorage
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;

  // 2. Check system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// Save on change
useEffect(() => {
  localStorage.setItem('theme', mode);
}, [mode]);
```

## Theme Toggle Component

The `ThemeToggle` component is already included:

```typescript
// src/components/ThemeToggle/index.tsx
import { useColorMode } from '@/theme/ThemeProvider';

export const ThemeToggle = () => {
  const { mode, toggleColorMode } = useColorMode();

  return (
    <IconButton onClick={toggleColorMode}>
      {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
    </IconButton>
  );
};
```

## CSS Variables

For CSS modules, use MUI's CSS variables:

```css
/* index.module.css */
.container {
  background-color: var(--mui-palette-background-default);
  color: var(--mui-palette-text-primary);
}
```

## Best Practices

### 1. Use `sx` prop for one-off styles

```typescript
<Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper' }}>
  Content
</Box>
```

### 2. Use theme tokens, not hardcoded colors

```typescript
// Good
<Typography color="text.secondary">...</Typography>

// Avoid
<Typography color="#666">...</Typography>
```

### 3. Use spacing function

```typescript
// Good
<Box sx={{ p: 2, m: 1 }}> // 16px, 8px

// Avoid
<Box sx={{ padding: '16px', margin: '8px' }}>
```

### 4. Test both themes

Always verify your components look good in both light and dark modes.

## Adding Custom Themes

To add a new theme (e.g., "high contrast"):

1. Create `highContrastPalette.ts`
2. Create `highContrastTheme.ts`
3. Update `ThemeProvider.tsx`:

```typescript
type ColorMode = 'light' | 'dark' | 'highContrast';

const themes = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
};
```
