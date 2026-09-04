# Thermoscope AI

Thermoscope AI is a satellite intelligence command center that turns thermal anomaly observations into explainable classifications, persistence signals, risk scores, alerts, and incident briefs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/thermoscope-ai/src/App.tsx` — responsive command-center UI and routed pages.
- `artifacts/thermoscope-ai/src/index.css` — visual tokens, map surface, texture, and motion.
- `artifacts/api-server/src/routes/thermoscope.ts` — deterministic FIRMS-style demo pipeline and API routes.
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and validation schemas.
- `lib/db/src/schema/thermoscope.ts` — PostgreSQL schema for observations, incidents, context, classifications, risk scores, persistent sources, and alerts.

## Architecture decisions

- The first release uses a fixed, seeded demo dataset so SIH judging flows are repeatable and clearly labeled DEMO.
- The classification layer is a transparent prototype service with feature contributions, not a claimed trained XGBoost model.
- Risk scoring follows the brief's weighted 0–100 formula and returns the full component breakdown for every incident.
- The API remains modular so FIRMS/Overpass live adapters can replace the demo source without changing the frontend contract.

## Product

- Dashboard overview with actual anomaly metrics, priority queue, map, and curated SIH scenario shortcuts.
- Incident investigation with classification, confidence, persistence, nearby context, history, explanation, and risk breakdown.
- Map explorer with filters, pan/zoom, layer toggle, markers, and risk legend.
- Persistent sources, alert status triage, analytics, data-grounded Copilot, printable incident reports, and system health.

## User preferences

No additional preferences recorded.

## Gotchas

- Keep DEMO/LIVE labeling explicit; the current source and OSM context are demo data.
- Regenerate API hooks after changing `lib/api-spec/openapi.yaml`.
- The app and API workflows are managed artifacts; use their existing workflow names when restarting.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
