import { z } from "zod";
import {
  AvantosTypeSchema,
  FieldDefSchema,
  FormDefSchema,
  NodeSchema,
  EdgeSchema,
  GraphSchema,
  ProblemDetailsSchema,
} from "./schema";

// Field-type tag for form fields.
export type AvantosType = z.infer<typeof AvantosTypeSchema>;

// Single form field (e.g. "email", "name").
export type FieldDef = z.infer<typeof FieldDefSchema>;

// Form definition — fields, JS hooks, prefill mapping rules.
export type FormDef = z.infer<typeof FormDefSchema>;

// A node in the DAG (one form instance: Form A, Form B, ...).
export type GraphNode = z.infer<typeof NodeSchema>;

// A directed edge between nodes (source → target).
export type Edge = z.infer<typeof EdgeSchema>;

// The full graph response — nodes, edges, form defs, branches, triggers.
export type Graph = z.infer<typeof GraphSchema>;

// RFC 7807 error response.
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// What a field maps to in the prefill model. Convertible to dl_prefill_* rules
export type PrefillRef =
  | { type: "form_field"; nodeId: string; fieldKey: string }
  | { type: "global"; scope: string; key: string };

// Persisted prefill shape: nodeId → fieldKey → PrefillRef.
export type MappingMap = Record<string, Record<string, PrefillRef>>;
