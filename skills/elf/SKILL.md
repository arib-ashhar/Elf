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

Use the current harness's native sub-agent/session mechanism if it provides one.

For **Claude Code**, use the `Task` tool to spawn each worker in a fresh sub-agent context. The Task tool is synchronous: it blocks until the sub-agent finishes and returns the result directly. There is no timeout-based polling loop. Call Task once per worker and collect the returned result; the same dependency gates and terminal-state contracts below still apply.

For **Codex**, first inspect the available tool catalog for the exact native delegation tools `multi_agent_v1__spawn_agent` and `multi_agent_v1__wait_agent`. When both are available, use them to create and manage fresh contexts; do not fall back merely because the tools are deferred or absent from the default visible tool summary.

Every spawn brief must identify the worker role and include the delegation contract. Track each returned agent ID, wait for the required dependency before assigning dependent work, and record the worker's result contract before proceeding. Do not claim isolated delegation unless a spawn call actually succeeded.

### Role aliases

Maintain a role-alias map as agents are spawned. Assign names in the form `PLANNER-1`, `CODER-1`, `CODER-2`, `REVIEWER-1`, `TEST-RUNNER-1`, incrementing the suffix when the same role is used more than once. Immediately after each spawn, print a summary line using the alias:

```
Spawned CODER-1 (01a0f276-a9b7-7f21-a511-d3a8c72342db)
```

Use aliases (not raw IDs) in all subsequent status output, wait announcements, and the final synthesis. The raw ID may be included in parentheses for traceability but must not be the primary identifier shown to the user.

### Wait-loop contract

After spawning workers, preserve every returned agent ID and repeatedly call
`multi_agent_v1__wait_agent` for the IDs that are required by the next step. A
completed wait call is not the same as a completed worker: a timeout or
`No agents completed yet` response is an interim result. Preserve the pending
IDs and wait again.

Continue local work during a timeout only when it is independent of the pending
worker results. Do not assign dependent work, synthesize results, or mark the
workflow `DONE` while a required agent is `pending_init` or `running`.

Handle terminal states explicitly:

- `completed`: collect and validate the worker's result contract.
- `failed`: retry with a corrected brief, replan, or report the failure.
- `blocked`: identify the missing dependency or report the blocker.
- `interrupted`, `shutdown`, or `not_found`: report the host failure and replan
  with a replacement worker before final synthesis; unresolved host failures
  prohibit `DONE`.

Only proceed to final synthesis after every required agent is terminal and all
required result contracts and acceptance checks have been collected.

If either native delegation tool is genuinely unavailable, execute the roles sequentially in the current session and explicitly report that fallback. If a spawn or wait call fails, report the actual tool failure and retry or replan; do not silently reinterpret a failed call as capability unavailability. Preserve the same contracts and decision gates in fallback mode.

## Default sequence

1. Ask the planner for a task graph and acceptance criteria.
2. Delegate independent coder work only when write sets do not overlap.
3. Run focused tests after implementation.
4. Ask the reviewer to inspect the resulting diff against the original intent.
5. Re-run affected tests after remediation.
6. Mark the workflow complete (`DONE`), clear active delegation state, and synthesize the outcome, changed files, validation, risks, and unfinished work.

Do not expose full worker traces in the parent context unless a specific detail is needed to resolve a conflict or failure. Do not claim completion when a required dependency failed or when acceptance criteria remain unchecked.
