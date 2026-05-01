import type { ReactNode } from "react";
import { styles } from "../styles/appStyles";

type ActionModalProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function ActionModal({
  title,
  closeLabel,
  onClose,
  children,
}: ActionModalProps) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        style={styles.modalCard}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.modalSheetHandle} />
        <div style={styles.modalHeader}>
          <h2 style={styles.sectionTitle}>{title}</h2>
          <button style={styles.button} onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
