import React from "react";
import { useDroppable } from "@dnd-kit/core";
import styles from "./index.module.css";

export const UnfiledDropZone = ({ children }: { children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: "unfiled",
    data: { type: "unfiled", folderId: null },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.unfiledSection} ${isOver ? styles.dropTarget : ""}`}
      data-droppable-id="unfiled"
    >
      {children}
    </div>
  );
};
