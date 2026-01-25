import React from 'react';
import { lighten, darken } from '@mui/material/styles';
import { useColorMode } from '@/theme/ThemeProvider';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  const { primaryColor } = useColorMode();

  // Generate color variants for the logo
  const mainColor = primaryColor;
  const darkColor = darken(primaryColor, 0.3);
  const lightColor = lighten(primaryColor, 0.3);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
    >
      {/* Note/document shape with folded corner */}
      <path
        d="M6 2h14l6 6v20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill={mainColor}
      />
      {/* Folded corner */}
      <path
        d="M20 2v6h6"
        fill="none"
        stroke={darkColor}
        strokeWidth="1.5"
      />
      <path
        d="M20 2l6 6h-5a1 1 0 0 1-1-1V2z"
        fill={lightColor}
      />
      {/* Text lines */}
      <rect x="8" y="12" width="12" height="2" rx="1" fill="white" opacity="0.9" />
      <rect x="8" y="17" width="10" height="2" rx="1" fill="white" opacity="0.7" />
      <rect x="8" y="22" width="8" height="2" rx="1" fill="white" opacity="0.5" />
    </svg>
  );
};
