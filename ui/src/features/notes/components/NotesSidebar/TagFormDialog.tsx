import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { DEFAULT_ITEM_COLOR } from "@/theme/colorUtils";
import styles from "./index.module.css";

interface TagFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  initialName?: string;
  initialColor?: string;
  mode: "create" | "edit";
}

export const TagFormDialog = ({
  open,
  onClose,
  onSubmit,
  initialName = "",
  initialColor = DEFAULT_ITEM_COLOR,
  mode,
}: TagFormDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  // Sync internal state when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setName(initialName);
      setColor(initialColor);
    }
  }, [open, initialName, initialColor]);

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), color);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} data-testid={`tag-${mode}-dialog`}>
      <DialogTitle>
        {mode === "create" ? t("Tags.CreateTag") : t("Tags.EditTag")}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t("Tags.TagName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className={styles.dialogTextFieldWithMargin}
          data-testid="tag-name-input"
        />
        <Box className={styles.colorPickerRow}>
          <Typography>{t("Tags.Color")}</Typography>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={styles.colorPicker}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid="tag-form-cancel">{t("Common.Cancel")}</Button>
        <Button onClick={handleSubmit} variant="contained" data-testid="tag-form-submit">
          {mode === "create" ? t("Common.Create") : t("Common.Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
