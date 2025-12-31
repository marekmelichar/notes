import {
  Components,
  createTheme,
  CssVarsTheme,
  responsiveFontSizes,
  Theme,
} from '@mui/material/styles';
import { typography } from './typography';
import lightPalette from './lightPalette';
import getComponents from './components';

const lightComponents = getComponents(lightPalette);

const lightIntermediateTheme = createTheme({
  cssVariables: true,
  palette: {
    ...lightPalette,
    mode: 'light',
  },
  typography,
  components: lightComponents as Components<Omit<Theme, 'components' | 'palette'> & CssVarsTheme>,
});

export const lightTheme = responsiveFontSizes(lightIntermediateTheme, {});
