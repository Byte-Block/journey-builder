# Journey Builder

Visual editor for form-prefill mappings on top of a DAG of forms — pick a form, see its fields, map each to data from any upstream form (direct or transitive) or a global property.

DAG-aware end-to-end: forms render in topological order, mapping cycles are prevented at edit time, and graph traversal correctness is verified by property-based tests.

Designed for extensibility: a plugin registry for new data sources, and per-feature state atoms that don't leak into a central store. Adding a new data source requires no edits to existing code; a dedicated test mechanically enforces this contract.

> **Status: in development.** This README is a placeholder.

> Node 22.22.2 (see `.nvmrc`).

## Quick start

Two terminals:

```bash
# Terminal 1 — local mock API server (sibling directory)
git clone https://github.com/mosaic-avantos/frontendchallengeserver.git ../frontend-mock-server
cd ../frontend-mock-server
npm install && npm start         # http://localhost:3000
```

```bash
# Terminal 2 — Next.js app
nvm use                          # switches to Node 22.22.2 via .nvmrc
npm install
npm run dev                      # serves on http://localhost:3001 (3000 is taken by the mock)
```

## Scripts

| Script                                                | What                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                         | Next.js dev server                                  |
| `npm run lint`                                        | ESLint (Next.js + Prettier compat)                  |
| `npm run format` / `npm run format:check`             | Prettier                                            |
| `npm run typecheck`                                   | `tsc --noEmit`, strict + `noUncheckedIndexedAccess` |
| `npm test` / `npm run test:watch` / `npm run test:ui` | Vitest                                              |
| `npm run coverage`                                    | Vitest with v8 coverage report                      |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict + `noUncheckedIndexedAccess`)
- **Jotai** for state (atoms + atomFamily, single-key localStorage persistence)
- **Zod** for runtime validation of the graph response
- **Radix UI** for accessible primitives (modal focus trap, ARIA, escape-to-close)
- **Lucide** for icons
- **Vitest** + **React Testing Library** + **msw** + **vitest-axe** for tests
