"use client";

import { useAtom } from "jotai";
import { Database, X } from "lucide-react";
import { useMemo } from "react";

import type { GraphLookups } from "@/domain/lookups";
import type { FieldAtom } from "@/state/atoms";

import { getRefLabel } from "../internal/ref-label";
import styles from "./PrefillFieldRow.module.css";

type Props = {
  fieldKey: string;
  fieldAtom: FieldAtom;
  lookups: GraphLookups;
  onOpenModal: (fieldKey: string) => void;
};

export function PrefillFieldRow({ fieldKey, fieldAtom, lookups, onOpenModal }: Props) {
  const [ref, setRef] = useAtom(fieldAtom);
  const refLabel = useMemo(() => (ref == null ? null : getRefLabel(ref, lookups)), [ref, lookups]);

  if (ref == null) {
    return (
      <button
        type="button"
        className={styles.empty}
        onClick={() => onOpenModal(fieldKey)}
        aria-label={`Map ${fieldKey} field`}
      >
        <Database aria-hidden className={styles.icon} />
        <span className={styles.label}>{fieldKey}</span>
      </button>
    );
  }

  return (
    <div className={styles.mapped}>
      <Database aria-hidden className={styles.icon} />
      <span className={styles.label}>
        {fieldKey}: {refLabel}
      </span>
      <button
        type="button"
        className={styles.clearButton}
        onClick={() => setRef(null)}
        aria-label={`Clear ${fieldKey} mapping`}
      >
        <X aria-hidden className={styles.clearIcon} />
      </button>
    </div>
  );
}
