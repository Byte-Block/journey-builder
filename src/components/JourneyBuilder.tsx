"use client";

import { useMemo, useState } from "react";

import { buildAncestorIndex } from "@/domain/graph";
import type { Graph } from "@/domain/types";

import { FormList } from "./FormList";
import styles from "./JourneyBuilder.module.css";
import { PrefillPanel } from "./PrefillPanel";

type Props = { graph: Graph };

export function JourneyBuilder({ graph }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
