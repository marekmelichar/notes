import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { createDynamicTheme } from './createDynamicTheme';
import { DEFAULT_PRIMARY_COLOR, isValidHexColor } from './colorUtils';

type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  resetPrimaryColor: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useColorMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useColorMode must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const getInitialMode = (): ColorMode => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getInitialPrimaryColor = (): string => {
    const saved = localStorage.getItem('primaryColor');
    if (saved && isValidHexColor(saved)) return saved;
    return DEFAULT_PRIMARY_COLOR;
  };

  const [mode, setMode] = useState<ColorMode>(getInitialMode);
  const [primaryColor, setPrimaryColorState] = useState<string>(getInitialPrimaryColor);

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setPrimaryColor = (color: string) => {
    if (isValidHexColor(color)) {
      setPrimaryColorState(color);
    }
  };

  const resetPrimaryColor = () => {
    setPrimaryColorState(DEFAULT_PRIMARY_COLOR);
  };

  const theme = useMemo(
    () => createDynamicTheme(mode, primaryColor),
    [mode, primaryColor]
  );

  return (
    <ThemeContext.Provider
      value={{ mode, toggleColorMode, primaryColor, setPrimaryColor, resetPrimaryColor }}
    >
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
