"use client";

import { useEffect, useRef } from "react";
import styles from "./EditModal.module.css";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Open modals, newest last, so a modal opened from another one behaves as the top layer
const openModals: object[] = [];

export default function EditModal({ isOpen, onClose, title, children }: EditModalProps) {
  const id = useRef({});
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const self = id.current;
    openModals.push(self);
    document.body.style.overflow = "hidden";

    // Escape only closes the modal on top
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === self) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      openModals.splice(openModals.indexOf(self), 1);
      if (openModals.length === 0) document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
