/**
 * Dynamic Theme Generator
 *
 * Creates a MUI theme dynamically based on mode (light/dark) and custom primary color.
 */

import {
  Components,
  createTheme,
  CssVarsTheme,
  responsiveFontSizes,
  Theme,
} from '@mui/material/styles';
import { typography } from './typography';
import lightPalette from './lightPalette';
import darkPalette from './darkPalette';
import getComponents from './components';
import { generatePaletteFromPrimary, DEFAULT_PRIMARY_COLOR } from './colorUtils';

/**
 * Creates a theme with custom primary color
 */
export function createDynamicTheme(
  mode: 'light' | 'dark',
  primaryColor: string = DEFAULT_PRIMARY_COLOR
): Theme {
  // Get base palette for the mode
  const basePalette = mode === 'light' ? lightPalette : darkPalette;

  // Generate colors from primary
  const generatedColors = generatePaletteFromPrimary(primaryColor, mode);

  // Merge generated colors with base palette
  // Preserves: background, error, text, outline, inverse
  // Overrides: primary, primaryContainer, secondary, secondaryContainer
  const mergedPalette = {
    ...basePalette,
    mode,
    primary: generatedColors.primary,
    primaryContainer: generatedColors.primaryContainer,
    secondary: generatedColors.secondary,
    secondaryContainer: generatedColors.secondaryContainer,
  };

  // Get component overrides with merged palette
  const components = getComponents(mergedPalette);

  // Create theme
  const intermediateTheme = createTheme({
    cssVariables: true,
    palette: mergedPalette,
    typography,
    components: components as Components<Omit<Theme, 'components' | 'palette'> & CssVarsTheme>,
  });

  return responsiveFontSizes(intermediateTheme, {});
}
