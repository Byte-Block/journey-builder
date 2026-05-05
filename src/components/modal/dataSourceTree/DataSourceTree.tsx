"use client";

import { ChevronRight } from "lucide-react";

import type { DataNode, LeafNode } from "@/data-sources/types";

import styles from "./DataSourceTree.module.css";

type Props = {
  tree: readonly DataNode[];
  selectedLeafId: string | null;
  onSelectLeaf: (leaf: LeafNode) => void;
};

export function DataSourceTree({ tree, selectedLeafId, onSelectLeaf }: Props) {
  return (
    <ul className={styles.list}>
      {tree.map((node) => (
        <Node
          key={node.id}
          node={node}
          selectedLeafId={selectedLeafId}
          onSelectLeaf={onSelectLeaf}
        />
      ))}
    </ul>
  );
}

type NodeProps = {
  node: DataNode;
  selectedLeafId: string | null;
  onSelectLeaf: (leaf: LeafNode) => void;
};

function Node({ node, selectedLeafId, onSelectLeaf }: NodeProps) {
  if (node.kind == "leaf") {
    const isSelected = node.id == selectedLeafId;
    return (
      <li>
        <button
          type="button"
          className={styles.leaf}
          aria-pressed={isSelected}
          onClick={() => onSelectLeaf(node)}
        >
          {node.label}
        </button>
      </li>
    );
  }

  return (
    <li>
      <details className={styles.group}>
        <summary className={styles.summary}>
          <ChevronRight aria-hidden className={styles.chevron} />
          <span className={styles.groupLabel}>{node.label}</span>
        </summary>
        <ul className={styles.children}>
          {node.children.map((child) => (
            <Node
              key={child.id}
              node={child}
              selectedLeafId={selectedLeafId}
              onSelectLeaf={onSelectLeaf}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}
