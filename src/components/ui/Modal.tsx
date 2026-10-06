"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Rendu dans <body> pour échapper aux contextes d'empilement des cartes « clay ».
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1640]/45 p-3 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="clay clay-grain relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5 sm:p-7"
            initial={{ y: 40, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink/8 text-lg font-bold text-ink-soft hover:bg-ink/15"
            >
              ✕
            </button>
            {icon && <div className="-mt-2 mb-1 flex justify-center">{icon}</div>}
            <h2 className="pr-10 text-2xl font-bold">{title}</h2>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
