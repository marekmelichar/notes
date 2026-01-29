import React from 'react';
import { Box, Typography, Paper, Switch, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleClose = () => navigate(-1);

  const getColorName = (key: string) => t(`Colors.${key}`);
  const { mode, toggleColorMode, primaryColor, setPrimaryColor, resetPrimaryColor } =
    useColorMode();

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrimaryColor(event.target.value);
  };

  const isDefaultColor = primaryColor === DEFAULT_PRIMARY_COLOR;

  return (
    <Box className={styles.container}>
      <Box className={styles.header}>
        <Typography variant="h4">{t('Common.Nav.Settings')}</Typography>
        <IconButton onClick={handleClose} aria-label={t('Common.Close')}>
          <CloseIcon />
        </IconButton>
      </Box>

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

      <Button variant="contained" onClick={handleClose} className={styles.okButton}>
        {t('Common.Ok')}
      </Button>
    </Box>
  );
};

export default SettingsPage;
