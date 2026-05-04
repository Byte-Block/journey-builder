"use client";

import { useMemo, useState } from "react";

import { buildAncestorIndex } from "@/domain/graph";
import type { Graph } from "@/domain/types";

import { FormList } from "./FormList";
import styles from "./JourneyBuilder.module.css";
import { PrefillPanel } from "./PrefillPanel";

type Props = { graph: Graph };

// Top-level Client Component for the prefill UI. Owns the ephemeral
// selectedNodeId UI state and wires the form list + prefill panel. Promote
// selectedNodeId to atom only when a sibling outside this tree needs read access.
export function JourneyBuilder({ graph }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Built once per graph; downstream sources read from this in O(1).
  const ancestors = useMemo(() => buildAncestorIndex(graph), [graph]);

  return (
    <main className={styles.root}>
      <h1 className={styles.title}>{graph.name}</h1>
      <div className={styles.split}>
        <FormList graph={graph} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} />
        <PrefillPanel graph={graph} selectedNodeId={selectedNodeId} ancestors={ancestors} />
      </div>
    </main>
  );
}
