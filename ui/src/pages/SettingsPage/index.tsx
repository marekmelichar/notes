import React from 'react';
import { Box, Typography, Paper, Switch, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useColorMode } from '@/theme/ThemeProvider';
import { DEFAULT_PRIMARY_COLOR } from '@/theme/colorUtils';
import styles from './index.module.css';

const COLOR_PRESETS = [
  { key: 'Blue', value: '#007ACC' },
  { key: 'Purple', value: '#7C3AED' },
  { key: 'Green', value: '#059669' },
  { key: 'Orange', value: '#EA580C' },
  { key: 'Pink', value: '#DB2777' },
  { key: 'Teal', value: '#0D9488' },
];

const SettingsPage = () => {
  const { t } = useTranslation();

  const getColorName = (key: string) => t(`Colors.${key}`);
  const { mode, toggleColorMode, primaryColor, setPrimaryColor, resetPrimaryColor } =
    useColorMode();

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrimaryColor(event.target.value);
  };

  const isDefaultColor = primaryColor === DEFAULT_PRIMARY_COLOR;

  return (
    <Box className={styles.container}>
      <Typography variant="h4" gutterBottom>
        {t('Common.Nav.Settings')}
      </Typography>

      <Paper className={styles.paper}>
        <Box className={styles.section}>
          <Typography variant="h6" className={styles.sectionTitle}>
            {t('SettingsPage.Appearance')}
          </Typography>

          <Box className={styles.settingRow}>
            <Typography>{t('Common.DarkMode')}</Typography>
            <Switch checked={mode === 'dark'} onChange={toggleColorMode} />
          </Box>

          <Box>
            <Typography>{t('SettingsPage.PrimaryColor')}</Typography>
            <Box className={styles.colorPresets}>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`${styles.colorButton} ${
                    primaryColor === preset.value ? styles.colorButtonSelected : ''
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => setPrimaryColor(preset.value)}
                  aria-label={getColorName(preset.key)}
                />
              ))}
            </Box>

            <Box className={styles.customColorRow}>
              <Typography variant="body2">{t('SettingsPage.CustomColor')}</Typography>
              <input
                type="color"
                value={primaryColor}
                onChange={handleColorChange}
                className={styles.colorInput}
              />
            </Box>

            {!isDefaultColor && (
              <Button
                variant="outlined"
                size="small"
                onClick={resetPrimaryColor}
                className={styles.resetButton}
              >
                {t('SettingsPage.ResetToDefault')}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
