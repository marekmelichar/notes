import React, { useRef, useState } from 'react';
import { Box, Button, IconButton, Popover, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import styles from './index.module.css';
import gbFlag from './flags/gb.svg';
import czFlag from './flags/cz.svg';

const languages = [
  { code: 'en', label: 'English', flag: gbFlag },
  { code: 'cs', label: 'Čeština', flag: czFlag },
];

export const LanguageSwitch = () => {
  const { t } = useTranslation();
  const anchorElRef = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(i18n.language);

  const open = isOpen;

  const handleToggle = (event: React.MouseEvent<HTMLElement>) => {
    anchorElRef.current = isOpen ? null : event.currentTarget;
    setIsOpen(!isOpen);
  };

  const handleSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    anchorElRef.current = null;
    setIsOpen(false);
  };

  const currentLang = languages.find((l) => language.startsWith(l.code));

  return (
    <Box className={styles.container}>
      <IconButton
        onClick={handleToggle}
        className={styles.button}
        aria-label={t("Common.SwitchLanguage")}
        data-testid="language-switch-button"
        data-language={currentLang?.code}
      >
        <img src={currentLang?.flag} alt="" className={styles.flagButton} />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorElRef.current}
        onClose={() => {
          anchorElRef.current = null;
          setIsOpen(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        className={styles.popover}
        data-testid="language-switch-popover"
      >
        <Stack>
          {languages.map(({ code, label, flag }) => {
            const isSelected = i18n.language.startsWith(code);

            return (
              <Button
                key={code}
                variant="text"
                onClick={() => handleSelect(code)}
                className={isSelected ? styles.languageButtonSelected : styles.languageButton}
                data-testid={`language-option-${code}`}
                data-selected={isSelected}
              >
                <img src={flag} alt="" className={styles.flagIcon} />
                <Typography className={styles.languageLabel}>{label}</Typography>
              </Button>
            );
          })}
        </Stack>
      </Popover>
    </Box>
  );
};
