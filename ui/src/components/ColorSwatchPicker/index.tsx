import React from 'react';
import { Box } from '@mui/material';
import styles from './index.module.css';

export const PRESET_COLORS = [
  '#f44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03a9f4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
  '#607D8B', '#6366f1',
];

interface ColorSwatchPickerProps {
  colors?: string[];
  selected?: string;
  size?: 'small' | 'medium';
  onSelect: (color: string) => void;
}

export const ColorSwatchPicker = ({
  colors = PRESET_COLORS,
  selected,
  size = 'medium',
  onSelect,
}: ColorSwatchPickerProps) => {
  return (
    <Box className={`${styles.grid} ${size === 'small' ? styles.gridSmall : ''}`}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={`${styles.swatch} ${size === 'small' ? styles.swatchSmall : ''} ${selected === color ? styles.swatchSelected : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </Box>
  );
};
