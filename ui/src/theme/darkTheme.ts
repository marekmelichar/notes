// theme/darkTheme.ts
import {
  Components,
  createTheme,
  CssVarsTheme,
  responsiveFontSizes,
  Theme,
} from '@mui/material/styles';
import darkPalette from './darkPalette';
import { typography } from './typography';
import getComponents from './components';

const darkComponents = getComponents(darkPalette);

const darkIntermediateTheme = createTheme({
  cssVariables: true,
  palette: {
    ...darkPalette,
    mode: 'dark',
  },
  typography,
  components: darkComponents as Components<Omit<Theme, 'components' | 'palette'> & CssVarsTheme>,
});

export const darkTheme = responsiveFontSizes(darkIntermediateTheme, {});
