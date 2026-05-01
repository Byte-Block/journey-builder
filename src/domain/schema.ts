import { z } from "zod";

// Field-type tag for form fields (the discriminator).
export const AvantosTypeSchema = z.enum([
  "short-text",
  "multi-line-text",
  "multi-select",
  "checkbox-group",
  "button",
  "object-enum",
]);

// Single form field (e.g. "email", "name").
export const FieldDefSchema = z
  .object({
    avantos_type: AvantosTypeSchema,
    title: z.string().optional(),
    type: z.string(),
    format: z.string().optional(),
  })
  .loose();

// Form definition — fields, JS hooks, prefill mapping rules.
export const FormDefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    is_reusable: z.boolean().optional(),

    field_schema: z.object({
      type: z.literal("object"),
      properties: z.record(z.string(), FieldDefSchema),
      required: z.array(z.string()).default([]),
    }),

    ui_schema: z.unknown().optional(),

    // dl_prefill_* rules — production's prefill persistence; mock has {}.
    default_input_mapping: z.record(z.string(), z.unknown()).default({}),

    default_output_mapping: z.record(z.string(), z.unknown()).optional(),
    dynamic_field_config: z.record(z.string(), z.unknown()).default({}),
    custom_javascript: z.string().optional(),
    custom_javascript_execute_on_load: z.boolean().optional(),
    custom_javascript_functions: z.string().optional(),
    custom_javascript_triggering_fields: z.array(z.string()).nullish(),
    embedded_js: z.array(z.unknown()).nullish(),
    imported_js_function_config: z.unknown().nullish(),
    created_at: z.string().optional(),
    created_by: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose();

// DAG node types. We only render "form".
export const NodeTypeSchema = z.enum([
  "form",
  "branch",
  "trigger",
  "configuration",
  "forEach",
  "action",
  "statusGate",
  "calculator",
  "dynamicTask",
]);

// A node in the DAG (one form instance: Form A, Form B, ...).
export const NodeSchema = z
  .object({
    id: z.string(),
    type: NodeTypeSchema,
    position: z.object({ x: z.number(), y: z.number() }),
    hidden: z.boolean().default(false),
    data: z
      .object({
        id: z.string(),
        component_key: z.string(),
        component_id: z.string(), // FK into forms[]
        component_type: z.string(),
        name: z.string(),
        // Redundant with top-level edges[]; we trust prerequisites for traversal.
        prerequisites: z.array(z.string()).default([]),
        permitted_roles: z.array(z.string()).default([]),
        input_mapping: z.record(z.string(), z.unknown()).default({}),
        sla_duration: z.object({ number: z.number(), unit: z.string() }).optional(),
        approval_required: z.boolean().optional(),
        approval_roles: z.array(z.string()).optional(),
      })
      .loose(),
  })
  .loose();

// A directed edge between nodes (source → target).
export const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
});

// The full graph response — nodes, edges, form defs, branches, triggers.
export const GraphSchema = z
  .object({
    tenant_id: z.string(),
    nodes: z.array(NodeSchema).default([]),
    edges: z.array(EdgeSchema).default([]),
    forms: z.array(FormDefSchema).default([]),
    branches: z.array(z.unknown()).default([]),
    triggers: z.array(z.unknown()).default([]),

    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),

    blueprint_id: z.string().optional(),
    blueprint_name: z.string().optional(),
    version_id: z.string().optional(),
    version_number: z.string().optional(),
    version_notes: z.string().optional(),
    status: z.enum(["draft", "published", "historical", "archived"]).optional(),

    component_task_priorities: z.record(z.string(), z.string()).optional(),
    custom_javascript_function_id: z.string().optional(),
    custom_status_configuration: z.unknown().optional(),
    state_model_schema: z.unknown().optional(),
    promoted_data_order: z.array(z.string()).nullish(),

    $schema: z.url().optional(),
  })
  .loose();

// RFC 7807 problem details — production sends application/problem+json on errors.
export const ProblemDetailsSchema = z
  .object({
    type: z.url().optional(),
    title: z.string().optional(),
    status: z.number().optional(),
    detail: z.string().optional(),
    instance: z.string().optional(),
  })
  .loose();
