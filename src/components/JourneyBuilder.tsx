"use client";

import { useState } from "react";

import type { Graph } from "@/domain/types";

import { FormList } from "./FormList";
import styles from "./JourneyBuilder.module.css";

type Props = { graph: Graph };

// Top-level Client Component for the prefill UI. Owns the ephemeral
// selectedNodeId UI state and wires the form list. PrefillPanel (5.4) will
// read selectedNodeId via the same prop-passing pattern; promote to atom
// only when a sibling outside this tree needs read access.
export function JourneyBuilder({ graph }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <main className={styles.root}>
      <h1 className={styles.title}>{graph.name}</h1>
      <FormList
        graph={graph}
        selectedNodeId={selectedNodeId}
        onSelect={setSelectedNodeId}
      />
    </main>
  );
}
