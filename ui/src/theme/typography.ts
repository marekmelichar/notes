// const typography = {
//   fontFamily: [
//     // Preferred font family
//     'Source Sans',
//     // Fallback font families
//     '-apple-system',
//     'BlinkMacSystemFont',
//     '"Segoe UI"',
//     'Oxygen',
//     'Ubuntu',
//     'Cantarell',
//     '"Fira Sans"',
//     '"Droid Sans"',
//     'sans-serif',
//   ].join(','),
//   h1: {
//     fontSize: '2rem', // 37px
//   },
//   h2: {
//     fontSize: '1.5rem', // 26px
//   },
//   h3: {
//     fontSize: '1.375rem', // 22px
//   },
//   h4: {
//     fontSize: '1rem', // 16px
//   },
//   h5: {
//     fontSize: '0.875rem', // 14px
//   },
//   body1: {
//     fontSize: '1.1875rem', // 19px
//   },
//   body2: {
//     fontSize: '0.875rem', // 14px
//   },
//   subtitle2: {
//     fontSize: '0.75rem', // 12px
//   },
// };

// export default typography;

import { ThemeOptions } from '@mui/material/styles';

type TypographyOptions = ThemeOptions['typography'];

export const typography: TypographyOptions = {
  fontFamily: [
    // Preferred font family
    'Source Sans',
    // Fallback font families
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  h1: {
    fontWeight: 700,
    fontSize: '2.5rem',
    lineHeight: 1.2,
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.3,
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    lineHeight: 1.3,
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.4,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.4,
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.66,
  },
  button: {
    fontWeight: 600,
    fontSize: '0.875rem',
    lineHeight: 1.75,
    textTransform: 'none',
  },
};
