# Contributing to the AAPM Framework

Thank you for your interest in contributing to the Autonomous Adaptive Pedagogical Matrix framework. This document outlines the process and requirements for contributions.

---

## ⚠️ Contributor License Agreement (CLA)

**Before any contribution can be accepted, you must agree to the Contributor License Agreement below.**

By submitting a pull request, issue, or any other contribution to this repository, you agree to the following terms:

### Grant of Rights

1. **Copyright Assignment.** You hereby assign to the AAPM Framework project (and its principal author, Cliff Eagle) all right, title, and interest in and to the copyright of your contribution, including all intellectual property rights therein.

2. **Patent License.** You hereby grant to the AAPM Framework project a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer your contribution, where such license applies only to those patent claims licensable by you that are necessarily infringed by your contribution alone or by combination of your contribution with the Licensed Work to which such contribution was submitted.

3. **Moral Rights.** To the extent that moral rights apply to your contribution, you waive and agree not to assert such moral rights against the AAPM Framework project or its licensees, to the extent permitted by applicable law.

4. **Original Work.** You represent that each of your contributions is your original creation and that you have the legal authority to grant the rights described in this agreement. If your employer has rights to intellectual property created by you, you represent that you have received permission to make contributions on behalf of that employer, or that your employer has waived such rights for your contributions.

5. **No Obligation.** You understand that the decision to include your contribution in any product or service is entirely at the discretion of the AAPM Framework project maintainers. You are not entitled to compensation for your contribution.

### How to Agree

By submitting a pull request, you are confirming that:

- You have read and agree to this Contributor License Agreement
- You have the legal right to grant the rights described above
- Your contribution is your own original work

If you cannot agree to these terms, please do not submit contributions.

---

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/cliff-eagle/aapm-framework/issues) to report bugs or suggest features
- Use the **New Persona Schema** issue template when proposing a new domain
- Provide as much context as possible, including reproduction steps for bugs

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` with a descriptive name
3. **Make your changes** following the conventions below
4. **Submit a pull request** with a clear description of what changed and why

### What We're Looking For

| Contribution Type | Priority |
|-------------------|----------|
| New Persona Schemas for underserved domains | 🟢 High |
| Improvements to documentation clarity | 🟢 High |
| Bug fixes in core type definitions | 🟢 High |
| New prompt templates with pedagogical grounding | 🟡 Medium |
| New ADRs documenting design decisions | 🟡 Medium |
| UI component implementations | 🟡 Medium |
| New recipes for vibecoding workflows | 🔵 Welcome |

### What We Won't Accept

- Changes that violate AAPM pedagogical principles (see `.cursorrules`)
- Features that increase the Affective Filter for learners
- Gamification mechanics applied universally (must respect Axis Z profiles)
- Hardcoded domain logic that should be schema-configurable
- Dependencies on specific AI providers without abstraction layers

---

## Code Conventions

### TypeScript

- Strict mode enabled
- All public interfaces must have JSDoc documentation
- All patent-critical interfaces must have `@patentCritical` JSDoc tags
- Use `type` for unions and intersections, `interface` for object shapes

### Documentation

- Use Mermaid for diagrams
- ADRs follow the format in `docs/adr/`
- Glossary terms must be defined in `docs/glossary.md`

### Persona Schemas

- Must validate against `schemas/persona.schema.json`
- Must include at least 3 Tier 2 locations and 2 Tier 3 scenarios
- Vocabulary matrix must reflect real domain priorities, not generic lists
- Cultural parameters must be researched, not assumed

### Commit Messages

- Use conventional commits: `feat:`, `fix:`, `docs:`, `schema:`, `chore:`
- Reference issues where applicable

---

## Code of Conduct

All contributors are expected to be respectful, constructive, and collaborative. We are building tools that serve language learners — people in vulnerable positions of cultural transition. Our conduct should reflect the empathy we expect from the system itself.

---

## Questions?

Open a [Discussion](https://github.com/cliff-eagle/aapm-framework/discussions) on the repository.
