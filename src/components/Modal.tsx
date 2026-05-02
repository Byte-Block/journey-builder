"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

// Reusable modal shell wrapping Radix Dialog. Future MUI swap is a one-file
// change — keep consumers (PrefillModal etc.) calling <Modal>, not Radix
// directly. Title is required for a11y; description is optional context for
// screen readers. Radix manages focus trap, escape handling, overlay-click
// dismissal, and aria roles automatically.
//
// Close affordances (Cancel, SELECT, X) are the consumer's responsibility —
// this shell renders only the chrome every modal needs.
export function Modal({ open, onOpenChange, title, description, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className={styles.description}>{description}</Dialog.Description>
          ) : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
