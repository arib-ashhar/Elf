<p align="center">
  <img src="assets/Elf.png" width="220" alt="Elf orchestration agent">
</p>

<h1 align="center">Elf</h1>

A harness-agnostic, skill-driven workflow for delegating software tasks to focused sub-agents.

The elf decomposes a request, delegates bounded work to planner, coder, reviewer, and test-runner roles, and synthesizes the results. Each role should run in its own sub-agent context when the host harness supports sub-agents.

## Supported harnesses

- Codex: install the plugin using the Codex plugin flow. The Codex manifest is in `.codex-plugin/plugin.json`.
- Claude Code: install the repository as a Claude Code plugin. The Claude manifest is in `.claude-plugin/plugin.json`.

The shared workflow lives in `core/` and is deliberately independent of vendor-specific tool names or commands.

## Install from the GitHub marketplace

The repository includes marketplace catalogs for each harness:

- Codex: `.agents/plugins/marketplace.json`
- Claude Code: `.claude-plugin/marketplace.json`

### Codex

```bash
codex plugin marketplace add arib-ashhar/Elf --ref main
codex plugin add elf@elf
```

### Claude Code

If `elf` was already added with the old URL, remove that marketplace first:

```bash
claude plugin marketplace remove elf
```

```bash
claude plugin marketplace add https://github.com/arib-ashhar/Elf.git
claude plugin install elf@elf
```

After installation, start a new session and invoke it with:

```text
@elf

Implement this task:
<describe the work>
```

If the marketplace name differs on your machine, check it with:

```bash
claude plugin marketplace list
claude plugin list
```

### Invoke from Codex

Start a new Codex session after installation, then invoke the plugin with:

```text
@elf

Implement this task:
<describe the work>
```

### Invoke from Claude Code

Start a new Claude Code session after installation, then invoke the plugin with:

```text
@elf
```

Or invoke it together with a task:

```text
@elf

Implement this task:
<describe the work>
```

The GitHub repository must be public, or the user must have Git access to it.

### Update an installed version

After pushing changes to `main`, refresh the marketplace and update the plugin:

```bash
# Codex
codex plugin marketplace upgrade elf
codex plugin add elf@elf

# Claude Code
claude plugin marketplace update elf
claude plugin update elf
```

Start a new session after updating so the new skill files are loaded.

## Usage

Invoke the plugin explicitly, then provide the task:

```text
Use the elf workflow for this task:

<task description>
```

The elf should use isolated sub-agent contexts where available. If the host does not provide sub-agents, it must say so and use the same role contracts sequentially rather than pretending that isolation exists.

## Workflow guarantees

- The elf coordinates; delegated workers perform scoped investigation, implementation, review, or testing.
- Every work item has an objective, scope, constraints, expected output, and acceptance criteria.
- Workers report changed files, tests, risks, and follow-up work.
- Workers must not make overlapping edits unless the elf explicitly serializes the work.
- Failed work is retried with a corrected brief when useful; unrelated completed work is not restarted.

## Development

Keep behavioral guidance in `core/`. Harness-specific instructions belong in the adapter entry points. Validate the Codex plugin before distribution with the Codex plugin validator.
