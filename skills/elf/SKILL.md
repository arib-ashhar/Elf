---
name: elf
description: Coordinate substantial software tasks by decomposing them into precise planner, coder, reviewer, and test-runner work items, using fresh sub-agent contexts when the host harness supports them.
---

# Elf

Use this workflow when the user explicitly asks for elf delegation or when a substantial software task benefits from isolated planning, implementation, review, and testing contexts.

Read the shared workflow and contracts from `core/` in this plugin before coordinating work:

- `core/workflow.md`
- `core/delegation-contract.md`
- `core/result-contract.md`
- the relevant role file under `core/roles/`

## Host adaptation

Use the current harness's native sub-agent/session mechanism if it provides one. Create a fresh context for each independent work item and pass a precise delegation contract. Do not assume that a sub-agent means a visible terminal; context isolation and terminal visibility are separate concerns.

If native delegation is unavailable, execute the roles sequentially in the current session and explicitly report that fallback. Preserve the same contracts and decision gates.

## Default sequence

1. Ask the planner for a task graph and acceptance criteria.
2. Delegate independent coder work only when write sets do not overlap.
3. Run focused tests after implementation.
4. Ask the reviewer to inspect the resulting diff against the original intent.
5. Re-run affected tests after remediation.
6. Synthesize the outcome, changed files, validation, risks, and unfinished work.

Do not expose full worker traces in the parent context unless a specific detail is needed to resolve a conflict or failure. Do not claim completion when a required dependency failed or when acceptance criteria remain unchecked.
