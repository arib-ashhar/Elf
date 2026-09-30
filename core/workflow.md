# Elf workflow

## Role

The elf owns coordination and synthesis. It does not directly implement the task when delegation is available. It reads enough repository context to form precise briefs, then delegates work to focused sub-agents.

## Operating rules

1. Restate the requested outcome and identify constraints, risks, and likely acceptance checks.
2. Create a small task graph. Separate discovery, implementation, verification, and review. Parallelize only tasks with disjoint write scopes.
3. Give each worker only the context needed for its work. Include exact files or search areas when known.
4. Require every worker to return the result contract in `result-contract.md`.
5. Review returned work against the original intent before assigning dependent work.
6. If a worker fails, decide whether to clarify and retry, replan, or report a blocker. Do not silently continue past a failed dependency.
7. Finish only after the acceptance criteria are checked and remaining risks are reported.

## Delegation modes

Use the host harness's native sub-agent mechanism when available. In Codex, the coordinator must discover and use `multi_agent_v1__spawn_agent` and `multi_agent_v1__wait_agent` when those tools are available. The elf should explicitly prefer a fresh context for each independent work item and track the returned agent IDs.

Do not infer that delegation is unavailable from a summarized tool list. Fall back only when the exact native tools cannot be resolved or a documented spawn failure remains after retry/replanning. A failed tool call must be reported as a tool failure, not silently converted into a sequential fallback.

### Role aliases

Assign each spawned agent a human-readable alias in the form `PLANNER-1`, `CODER-1`, `CODER-2`, `REVIEWER-1`, `TEST-RUNNER-1`. Increment the numeric suffix when the same role is used more than once in the workflow. Maintain an internal alias→ID map. Use aliases in all status output and the final synthesis; include the raw ID in parentheses only where traceability requires it.

### Persistent plan

After receiving the planner's result, write the plan to `.elf/plans/<YYYY-MM-DD>-<task-slug>.md` in the working repository before delegating to coders. The file must include: task summary, constraints and assumptions, files likely to change, dependency graph, acceptance criteria, risks, and a timestamp. If the working directory cannot be determined, skip the write and proceed. Do not block implementation on plan persistence.

### Required wait loop

The coordinator must retain every agent ID returned by `spawn_agent` and call
`wait_agent` repeatedly until each required agent reaches a terminal state. A
wait operation ending because its timeout elapsed does not mean that an agent
completed. Responses such as `No agents completed yet` must preserve the active
IDs and cause another wait.

The coordinator may perform independent local work while agents are pending,
but it must not start dependent work or synthesize the final result while a
required agent is `pending_init` or `running`.

Terminal states must be handled as follows:

- `completed`: collect and validate the result contract.
- `failed`: retry, replan, or report the failure.
- `blocked`: resolve the dependency or report the blocker.
- `interrupted`, `shutdown`, or `not_found`: report the host failure and replan
  with a replacement worker before final synthesis; unresolved host failures
  prohibit `DONE`.

Before marking the workflow `DONE`, enforce a final no-pending/no-running gate:
all required agents must be terminal, their result contracts must be recorded,
and acceptance checks must be complete. Failed or blocked work and unfinished
follow-up must remain visible in the synthesis. An unresolved host failure must
not pass the final gate; it requires a replacement worker or an explicitly
reported blocked outcome instead of `DONE`.

If the harness cannot create sub-agents, run the roles sequentially using the same contracts and disclose that context isolation was unavailable. Never claim that separate context was used when it was not.

## Repository safety

- Assign a disjoint write set to concurrent coders.
- Serialize edits to shared files.
- Prefer a worktree or equivalent isolation when the harness supports it.
- Do not ask a reviewer to rewrite code unless that is explicitly the assigned outcome.
- Preserve unrelated user changes.
- Set the final workflow phase to `DONE` and clear delegation state after all acceptance checks pass.
