// import '@mui/material/Button';
// import '@mui/material/styles';

// declare module '@mui/material/Button' {
//   interface ButtonPropsVariantOverrides {
//     subtle: true;
//   }
// }

// declare module '@mui/material/styles' {
//   interface TypeBackground {
//     paper_elevation_1: string;
//     paper_elevation_2: string;
//     paper_elevation_3: string;
//     paper_elevation_4: string;
//     paper_elevation_5: string;
//   }
// }

// src/theme/palette-augment.d.ts
import '@mui/material/styles';

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    subtle: true;
  }
}

declare module '@mui/material/styles' {
  interface ContainerColor {
    main: string;
    contrastText: string;
  }

  interface InverseColors {
    surface: string; // nove_inverseSurface
    contrastText: string; // nove_InverseOnSurface_contrastText
    primary: string; // new_inversePrimary
  }
  interface TypeBackground {
    paper1: string;
    paper2: string;
    paper3: string;
    paper4: string;
    paper5: string;
  }

  interface Palette {
    primaryContainer: ContainerColor; // nove_primaryContainer_*
    secondaryContainer: ContainerColor; // nove_secondaryContainer_*
    errorContainer: ContainerColor; // nove_errorContainer_*
    outline: string; // nove_outlined
    outlineVariant: string; // nove_outlinedVariant
    inverse: InverseColors;
  }

  interface PaletteOptions {
    primaryContainer?: Partial<ContainerColor>;
    secondaryContainer?: Partial<ContainerColor>;
    errorContainer?: Partial<ContainerColor>;
    outline?: string;
    outlineVariant?: string;
    inverse?: Partial<InverseColors>;
  }
}
