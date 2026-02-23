# Implementation Checklist — Per-Module Quality Gate

> A strict, binary checklist for every AAPM module. Each item is either done or not done.
> A vibecoding tool must pass this gate before any module is considered production-ready.

---

## Pre-Implementation (Run Before Writing Code)

- [ ] Read the relevant ADR(s) for this module completely
- [ ] Read the corresponding `docs/` section completely
- [ ] Read all imported types from `packages/core/src/types.ts` and the module's `types.ts`
- [ ] Read `.cursorrules` for the three unbreakable pedagogical rules
- [ ] Identify all external dependencies — confirm each has an adapter package or is planned
- [ ] Identify all events this module must emit and consume — confirm bus types exist
- [ ] Write the `IMPLEMENTATION.md` file before writing any `.ts` files

---

## Implementation (Run After Writing Code)

- [ ] Every exported function has a **precondition block** that throws on invalid input
- [ ] Every exported function has a **postcondition block** that asserts invariants before returning
- [ ] No function imports a concrete external service — all external calls go through **injected interfaces**
- [ ] Every function that touches learner data threads `learnerId` and `correlationId` through its logs
- [ ] The **Null Object pattern** is implemented for every optional dependency
- [ ] The `register(bus, deps)` pattern is used — module exports a cleanup function for runtime deregistration
- [ ] All async operations have error handling that classifies errors as `retryable` or `non-retryable`

---

## Testing (Run After Writing Tests)

- [ ] **Preconditions**: every precondition block has a test case
- [ ] **Postconditions**: at least one test deliberately triggers a postcondition violation
- [ ] **Happy path**: at least one test with valid input and expected output verified against a fixture
- [ ] **Sad path**: at least one test per error type (LLM failure, DB failure, invalid LLM output)
- [ ] **Bus emission**: at least one test asserts the correct event type was emitted
- [ ] **Null Object**: at least one test exercises the Null Object path without crashing
- [ ] `vitest run` passes with zero failures
- [ ] `npx aapm validate` runs without errors on all schemas in `schemas/examples/`

---

## Documentation (Run Before Committing)

- [ ] Every exported function has a **JSDoc comment** following the masterclass template
- [ ] `IMPLEMENTATION.md` exists in the module directory with all 9 sections populated
- [ ] `CHANGELOG.md` has an entry with **Pedagogical Impact** field
- [ ] Any new interfaces are added to the relevant ADR or a new ADR is created
- [ ] Any workaround used is added to `AAPM_ROUTER.md`

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [IMPLEMENTATION_MASTERCLASS.md](../IMPLEMENTATION_MASTERCLASS.md) | Full engineering standards reference |
| [VIBECODE_ENTRY.md](../VIBECODE_ENTRY.md) | Master vibecoding prompt |
| [aam-charter.md](aam-charter.md) | AAM philosophy + event bus spec |
| [dependency-graph.md](dependency-graph.md) | Build order enforcement |
