/**
 * Color Utilities for Dynamic Theme Generation
 *
 * Generates complementary colors from a primary color using MUI's color utilities.
 */

import { darken, lighten, getContrastRatio } from '@mui/material/styles';

export const DEFAULT_PRIMARY_COLOR = '#007ACC';

/** Default color for newly created tags and folders */
export const DEFAULT_ITEM_COLOR = '#6366f1';

export interface GeneratedColors {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  primaryContainer: {
    main: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondaryContainer: {
    main: string;
    contrastText: string;
  };
}

/**
 * Validates if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Gets contrast text color (white or black) based on background luminance
 */
function getContrastText(background: string): string {
  return getContrastRatio(background, '#fff') >= 4.5 ? '#fff' : '#000';
}

/**
 * Generates a full color palette from a single primary color
 */
export function generatePaletteFromPrimary(
  primaryColor: string,
  mode: 'light' | 'dark'
): GeneratedColors {
  // Validate input
  if (!isValidHexColor(primaryColor)) {
    primaryColor = DEFAULT_PRIMARY_COLOR;
  }

  // Generate primary variants
  const primaryLight = lighten(primaryColor, 0.3);
  const primaryDark = darken(primaryColor, 0.3);
  const primaryContrastText = getContrastText(primaryColor);

  // Generate secondary color (slightly shifted from primary)
  const secondaryMain =
    mode === 'light' ? darken(primaryColor, 0.2) : lighten(primaryColor, 0.2);
  const secondaryLight = lighten(secondaryMain, 0.3);
  const secondaryDark = darken(secondaryMain, 0.3);
  const secondaryContrastText = getContrastText(secondaryMain);

  // Generate container colors (softer versions for backgrounds)
  const primaryContainerMain =
    mode === 'light' ? lighten(primaryColor, 0.85) : darken(primaryColor, 0.6);
  const primaryContainerContrastText =
    mode === 'light' ? darken(primaryColor, 0.4) : lighten(primaryColor, 0.4);

  const secondaryContainerMain =
    mode === 'light' ? lighten(secondaryMain, 0.7) : darken(secondaryMain, 0.5);
  const secondaryContainerContrastText =
    mode === 'light' ? darken(secondaryMain, 0.4) : lighten(secondaryMain, 0.4);

  return {
    primary: {
      main: primaryColor,
      light: primaryLight,
      dark: primaryDark,
      contrastText: primaryContrastText,
    },
    primaryContainer: {
      main: primaryContainerMain,
      contrastText: primaryContainerContrastText,
    },
    secondary: {
      main: secondaryMain,
      light: secondaryLight,
      dark: secondaryDark,
      contrastText: secondaryContrastText,
    },
    secondaryContainer: {
      main: secondaryContainerMain,
      contrastText: secondaryContainerContrastText,
    },
  };
}
