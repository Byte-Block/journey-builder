"use client";

import { Database } from "lucide-react";
import { useMemo } from "react";

import { buildLookups } from "@/domain/lookups";
import type { Graph } from "@/domain/types";

import { createWarnOnce } from "./internal/warn-once";
import styles from "./PrefillPanel.module.css";

type Props = {
  graph: Graph;
  selectedNodeId: string | null;
};

// Once-per-process warns for missing graph entries — selectedNodeId only
// flows from FormList which emits known node ids, so a miss means stale
// state worth surfacing without spamming the log.
const warnOnce = createWarnOnce();

// Right pane of the journey builder. Renders header + one row per field of
// the selected form. State-specific row styling (empty / mapped / clear) is
// 5.5's job; this stub just iterates and labels.
export function PrefillPanel({ graph, selectedNodeId }: Props) {
  const lookups = useMemo(() => buildLookups(graph), [graph]);

  const fields = useMemo<readonly string[] | null>(() => {
    if (selectedNodeId == null) {
      return null;
    }
    const node = lookups.nodesById.get(selectedNodeId);
    if (!node) {
      warnOnce(selectedNodeId, `[PrefillPanel] node ${selectedNodeId} not in graph`);
      return null;
    }
    const formId = node.data.component_id;
    const form = lookups.formsById.get(formId);
    if (!form) {
      warnOnce(formId, `[PrefillPanel] form ${formId} not in graph.forms`);
      return null;
    }
    // Object.keys preserves insertion order — matches the JSON's schema order.
    return Object.keys(form.field_schema.properties);
  }, [lookups, selectedNodeId]);

  if (fields == null) {
    return null;
  }

  return (
    <section className={styles.panel} aria-label="Prefill">
      <header className={styles.header}>
        <h2 className={styles.title}>Prefill</h2>
        <p className={styles.subtitle}>Prefill fields for this form</p>
      </header>
      <ul className={styles.rows}>
        {fields.map((fieldKey) => (
          <li key={fieldKey} className={styles.row}>
            <Database aria-hidden className={styles.icon} />
            <span className={styles.label}>{fieldKey}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
