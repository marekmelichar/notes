import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useAppDispatch, useAppSelector, openTab, selectActiveTabId, selectIsMobile, selectNoteListHidden } from "@/store";
import type { Note } from "../../types";
import styles from "./index.module.css";

interface SortableNoteProps {
  note: Note;
  level: number;
}

export const SortableNote = ({ note, level }: SortableNoteProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedNoteId = useAppSelector(selectActiveTabId);
  const isMobile = useAppSelector(selectIsMobile);
  const noteListHidden = useAppSelector(selectNoteListHidden);
  const isSelected = selectedNoteId === note.id;
  const elementRef = React.useRef<HTMLDivElement | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `note-${note.id}`,
    data: { type: "note", note },
  });

  const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    elementRef.current = node;
  }, [setNodeRef]);

  // Scroll into view when selected (skip when note list is hidden)
  React.useEffect(() => {
    if (!isSelected || noteListHidden) return;
    const timer = requestAnimationFrame(() => {
      elementRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(timer);
  }, [isSelected, noteListHidden]);

  const step = isMobile ? 10 : 30;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: level > 0 ? step + level * step : 12,
    opacity: isDragging ? 0.5 : 1,
    "--indent-level": level,
  } as React.CSSProperties;

  const handleClick = () => {
    dispatch(openTab(note.id));
  };

  return (
    <Box
      ref={combinedRef}
      className={`${styles.noteTreeItem} ${isSelected ? styles.noteTreeItemActive : ""} ${isDragging ? styles.dragging : ""}`}
      style={style}
      onClick={handleClick}
    >
      <Box {...listeners} {...attributes} className={styles.dragHandle}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <DescriptionOutlinedIcon
        fontSize="small"
        className={styles.noteTreeIcon}
      />
      <Typography className={styles.noteTreeLabel} noWrap>
        {note.title || t("Common.Untitled")}
      </Typography>
    </Box>
  );
};
