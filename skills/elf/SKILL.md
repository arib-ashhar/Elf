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

Use the current harness's native sub-agent/session mechanism if it provides one. For Codex, first inspect the available tool catalog for the exact native delegation tools `multi_agent_v1__spawn_agent` and `multi_agent_v1__wait_agent`. When both are available, use them to create and manage fresh contexts; do not fall back merely because the tools are deferred or absent from the default visible tool summary.

Every spawn brief must identify the worker role and include the delegation contract. Track each returned agent ID, wait for the required dependency before assigning dependent work, and record the worker's result contract before proceeding. Do not claim isolated delegation unless a spawn call actually succeeded.

If either native delegation tool is genuinely unavailable, execute the roles sequentially in the current session and explicitly report that fallback. If a spawn or wait call fails, report the actual tool failure and retry or replan; do not silently reinterpret a failed call as capability unavailability. Preserve the same contracts and decision gates in fallback mode.

## Default sequence

1. Ask the planner for a task graph and acceptance criteria.
2. Delegate independent coder work only when write sets do not overlap.
3. Run focused tests after implementation.
4. Ask the reviewer to inspect the resulting diff against the original intent.
5. Re-run affected tests after remediation.
6. Mark the workflow complete (`DONE`), clear active delegation state, and synthesize the outcome, changed files, validation, risks, and unfinished work.

Do not expose full worker traces in the parent context unless a specific detail is needed to resolve a conflict or failure. Do not claim completion when a required dependency failed or when acceptance criteria remain unchecked.
