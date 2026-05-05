"use client";

// Side-effect import — registers the four built-in DataSources with the
// registry before any consumer calls collectTree. The modal is the only
// production path that opens the registry, so owning the import here keeps
// registration co-located with use.
import "@/data-sources";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";

import { collectTree } from "@/data-sources/collect";
import type { DataNode, DataSourceContext, LeafNode } from "@/data-sources/types";
import type { AncestorIndex } from "@/domain/graph";
import type { GraphLookups } from "@/domain/lookups";
import type { Graph } from "@/domain/types";
import { fieldMappingFamily, mappingsAtom } from "@/state/atoms";
import { wouldCreateCycle, type ProposedMapping } from "@/state/cycles";

import { DataSourceTree } from "./dataSourceTree/DataSourceTree";
import { Modal } from "./Modal";
import styles from "./PrefillModal.module.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: Graph;
  lookups: GraphLookups;
  ancestors: AncestorIndex;
  targetNodeId: string;
  fieldKey: string;
};

export function PrefillModal({
  open,
  onOpenChange,
  graph,
  lookups,
  ancestors,
  targetNodeId,
  fieldKey,
}: Props) {
  const [tree, setTree] = useState<readonly DataNode[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<LeafNode | null>(null);
  const mappings = useAtomValue(mappingsAtom);
  const setMapping = useSetAtom(fieldMappingFamily({ nodeId: targetNodeId, fieldKey }));

  useEffect(() => {
    if (!fieldKey) {
      return;
    }
    const ctx: DataSourceContext = {
      graph,
      targetNodeId,
      ancestors,
      nodesById: lookups.nodesById,
      formsById: lookups.formsById,
    };
    let cancelled = false;
    void collectTree(ctx).then((next) => {
      if (!cancelled) {
        setTree(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fieldKey, graph, targetNodeId, ancestors, lookups]);

  const proposed: ProposedMapping | null = selectedLeaf
    ? { targetNodeId, targetFieldKey: fieldKey, ref: selectedLeaf.ref }
    : null;
  const wouldCycle = proposed ? wouldCreateCycle(mappings, graph, proposed) : false;
  const disabled = !selectedLeaf || wouldCycle;
  const tooltip = wouldCycle ? "This would create a circular dependency" : undefined;

  const handleSelect = () => {
    if (selectedLeaf == null || wouldCycle) {
      return;
    }
    setMapping(selectedLeaf.ref);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Select data element to map">
      <DataSourceTree
        tree={tree}
        selectedLeafId={selectedLeaf?.id ?? null}
        onSelectLeaf={setSelectedLeaf}
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.selectButton}
          disabled={disabled}
          title={tooltip}
          onClick={handleSelect}
        >
          SELECT
        </button>
      </div>
    </Modal>
  );
}
