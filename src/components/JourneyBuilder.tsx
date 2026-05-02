"use client";

import { useMemo } from "react";

import type { Graph } from "@/domain/types";

import styles from "./JourneyBuilder.module.css";

type Props = { graph: Graph };

// Stub for P5.2 — proves the graph parsed server-side made it to the client.
// FormList (5.3), PrefillPanel (5.4), and the modal flow (5.6–5.8) replace
// this body in subsequent steps.
export function JourneyBuilder({ graph }: Props) {
  const formCount = useMemo(
    () => graph.nodes.filter((n) => n.type == "form").length,
    [graph],
  );
  return (
    <main className={styles.root}>
      <h1 className={styles.title}>{graph.name}</h1>
      <p>
        {formCount} {formCount == 1 ? "form" : "forms"}
      </p>
    </main>
  );
}
