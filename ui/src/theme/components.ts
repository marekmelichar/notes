import { alpha } from '@mui/system';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getComponents = (palette: any) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {},
      a: {
        color: palette.primary.main,
      },
    },
  },
  MuiButton: {
    variants: [
      {
        props: { variant: 'subtle' },
        style: {
          color: palette.primary.main,
          border: '1px solid transparent',
          backgroundColor: alpha(palette.secondaryContainer.main, 0.16),
          borderRadius: '0.5rem',
          '&:hover': {
            backgroundColor: alpha(palette.secondaryContainer.main, 0.24),
          },
        },
      },
    ],
    styleOverrides: {
      root: {
        textTransform: 'none',
        boxShadow: 'none',
        borderRadius: '0.5rem',
        fontWeight: 600,
        '&:hover': {
          boxShadow: 'none',
        },
        '&.MuiButton-sizeLarge': {
          padding: '12px 24px',
        },
        '&.MuiButton-sizeMedium': {
          padding: '8px 16px',
        },
        '&.MuiButton-sizeSmall': {
          padding: '4px 12px',
          fontSize: '0.875rem',
        },
        '&.MuiButton-contained': {
          color: palette.primary.contrastText,
          border: `1px solid ${palette.primary.main}`,
          backgroundColor: palette.primary.main,
          borderRadius: '5rem',
        },
        '&.MuiButton-outlined': {
          color: palette.text.secondary,
          borderColor: palette.outlineVariant,
          '&:hover': {
            backgroundColor: palette.background.paper2,
          },
        },
        '&.Mui-disabled': {
          opacity: 0.6,
        },
      },
    },
  },
  MuiInputAdornment: {
    styleOverrides: {
      root: {
        '&.MuiInputAdornment-positionEnd': {
          marginRight: '16px',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '4px',
        border: '1px solid transparent',
        '& .MuiChip-deleteIcon': {
          '&:hover': {
            opacity: 0.75,
          },
        },
      },
      colorDefault: {
        color: palette.primary.main,
        backgroundColor: alpha(palette.secondaryContainer.main, 0.16),
        '& .MuiChip-deleteIcon': {
          color: palette.primary.main,
          '&:hover': {
            color: alpha(palette.primary.main, 0.75),
          },
        },
      },
      sizeSmall: {
        padding: '4px',
        height: '20px',
        '& .MuiChip-label': {
          lineHeight: 1,
          fontSize: '11px',
          padding: 0,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      root: {
        '& .MuiDialog-paper': {
          borderRadius: '2rem',
        },
      },
    },
  },
  MuiFormControl: {
    styleOverrides: {
      root: {},
    },
  },
  MuiFormControlLabel: {
    styleOverrides: {
      root: {},
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        '&.MuiOutlinedInput-root': {
          backgroundColor: palette.background.paper5,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          border: `1px solid transparent`,
        },
        backgroundColor: palette.background.paper5,
        '& .MuiOutlinedInput-notchedOutline': {
          border: `1px solid ${palette.background.paper5}`,
          borderRadius: '0.5rem',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          border: `1px solid transparent`,
        },
        '&:active .MuiOutlinedInput-notchedOutline': {
          border: `1px solid transparent`,
        },
      },
    },
  },
});

export default getComponents;
