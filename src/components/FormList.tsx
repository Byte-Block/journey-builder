"use client";

import { Database } from "lucide-react";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";

import { topologicalSort } from "@/domain/graph";
import { buildLookups } from "@/domain/lookups";
import type { Graph, GraphNode } from "@/domain/types";

import { createWarnOnce } from "./internal/warn-once";
import styles from "./FormList.module.css";

type Props = {
  graph: Graph;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

const warnSkipped = createWarnOnce();

const isFormNode = (node: GraphNode): boolean => {
  if (node.type == "form") {
    return true;
  }
  warnSkipped(node.id, `[FormList] skipping non-form node ${node.id} (type=${node.type})`);
  return false;
};

type Item = { nodeId: string; label: string };

export function FormList({ graph, selectedNodeId, onSelect }: Props) {
  const items = useMemo<Item[]>(() => {
    const { nodesById } = buildLookups(graph);
    const orderedIds = topologicalSort(graph);

    let formNodes: GraphNode[];

    if (orderedIds == null) {
      console.warn("[FormList] topologicalSort returned null; falling back to insertion order");
      formNodes = graph.nodes.filter(isFormNode);
    } else {
      formNodes = orderedIds
        .map((id) => nodesById.get(id))
        .filter((n): n is GraphNode => n != null)
        .filter(isFormNode);
    }

    return formNodes.map((node) => ({ nodeId: node.id, label: node.data.name }));
  }, [graph]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(
    selectedNodeId ?? items[0]?.nodeId ?? null,
  );

  const optionRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const moveFocus = (nodeId: string) => {
    setFocusedNodeId(nodeId);
    optionRefs.current.get(nodeId)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (items.length == 0 || focusedNodeId == null) {
      return;
    }
    const currentIndex = items.findIndex((i) => i.nodeId == focusedNodeId);
    if (currentIndex == -1) {
      return;
    }

    if (e.key == "ArrowDown") {
      e.preventDefault();
      const next = items[(currentIndex + 1) % items.length];
      if (next) {
        moveFocus(next.nodeId);
      }
      return;
    }
    if (e.key == "ArrowUp") {
      e.preventDefault();
      const prev = items[(currentIndex - 1 + items.length) % items.length];
      if (prev) {
        moveFocus(prev.nodeId);
      }
      return;
    }
    if (e.key == "Home") {
      e.preventDefault();
      const first = items[0];
      if (first) {
        moveFocus(first.nodeId);
      }
      return;
    }
    if (e.key == "End") {
      e.preventDefault();
      const last = items[items.length - 1];
      if (last) {
        moveFocus(last.nodeId);
      }
      return;
    }
    if (e.key == "Enter" || e.key == " ") {
      e.preventDefault();
      onSelect(focusedNodeId);
    }
  };

  return (
    <ul className={styles.list} role="listbox" aria-label="Forms" onKeyDown={handleKeyDown}>
      {items.map(({ nodeId, label }) => {
        const isSelected = nodeId == selectedNodeId;
        const isFocused = nodeId == focusedNodeId;
        return (
          <li
            key={nodeId}
            ref={(el) => {
              if (el) {
                optionRefs.current.set(nodeId, el);
              } else {
                optionRefs.current.delete(nodeId);
              }
            }}
            className={styles.row}
            role="option"
            aria-selected={isSelected}
            tabIndex={isFocused ? 0 : -1}
            onClick={() => {
              setFocusedNodeId(nodeId);
              onSelect(nodeId);
            }}
          >
            <Database aria-hidden className={styles.icon} />
            <span className={styles.label}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
