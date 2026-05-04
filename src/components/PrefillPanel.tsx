"use client";

import { useMemo, useState } from "react";

import type { AncestorIndex } from "@/domain/graph";
import { buildLookups } from "@/domain/lookups";
import { fieldMappingFamily } from "@/state/atoms";
import type { Graph } from "@/domain/types";

import { createWarnOnce } from "./internal/warn-once";
import { PrefillFieldRow } from "./PrefillFieldRow";
import { PrefillModal } from "./PrefillModal";
import styles from "./PrefillPanel.module.css";

type Props = {
  graph: Graph;
  selectedNodeId: string | null;
  ancestors: AncestorIndex;
};

// Once-per-process warns for missing graph entries — selectedNodeId only
// flows from FormList which emits known node ids, so a miss means stale
// state worth surfacing without spamming the log.
const warnOnce = createWarnOnce();

// Right pane of the journey builder. Renders header + one PrefillFieldRow
// per field of the selected form. The row owns its own atom subscription
// (atom-as-prop) so cell updates don't ripple across siblings.
export function PrefillPanel({ graph, selectedNodeId, ancestors }: Props) {
  const lookups = useMemo(() => buildLookups(graph), [graph]);
  // Field key whose modal is open, or null when no modal is showing.
  const [modalFor, setModalFor] = useState<string | null>(null);

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

  if (fields == null || selectedNodeId == null) {
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
          <li key={fieldKey}>
            <PrefillFieldRow
              fieldKey={fieldKey}
              fieldAtom={fieldMappingFamily({ nodeId: selectedNodeId, fieldKey })}
              lookups={lookups}
              onOpenModal={setModalFor}
            />
          </li>
        ))}
      </ul>
      {modalFor != null ? (
        <PrefillModal
          key={modalFor}
          open
          onOpenChange={() => setModalFor(null)}
          graph={graph}
          lookups={lookups}
          ancestors={ancestors}
          targetNodeId={selectedNodeId}
          fieldKey={modalFor}
        />
      ) : null}
    </section>
  );
}
