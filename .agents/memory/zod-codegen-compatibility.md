---
name: OpenAPI Zod compatibility
description: A codegen compatibility constraint for numeric schemas in this workspace.
---

The generated Zod client currently targets APIs such as `zod.int()`, while the workspace catalog pins Zod 3.x, which does not expose that helper. Use `number` for integer-like OpenAPI fields unless the Zod generation setup is intentionally upgraded.

**Why:** An otherwise valid OpenAPI change can make codegen succeed but fail the required generated-library typecheck.

**How to apply:** After OpenAPI changes, run codegen immediately; if integer schemas trigger `zod.int` errors, prefer the compatible schema representation for this MVP.