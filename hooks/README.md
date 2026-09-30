# Elf Plugin - Lifecycle Hooks

The elf plugin now includes lifecycle hooks for Claude Code and Codex.

## Installed Hooks

### 1. SessionStart Hook
**File**: `hooks/elf-activate.js`
**Triggers**: On session startup, resume, clear, or compact
**Purpose**: 
- Writes `.elf-active` state flag
- Announces workflow availability
- Injects core workflow documentation into session context

### 2. SubagentStart Hook
**File**: `hooks/elf-subagent.js`
**Triggers**: When any sub-agent is spawned via Agent tool
**Purpose**:
- Detects role from agent metadata (planner/coder/reviewer/test-runner)
- Injects role-specific contracts and instructions
- Ensures sub-agents follow delegation and result contracts

**Role Detection**:
- Keywords: "planner", "plan", "planning" → planner role
- Keywords: "coder", "code", "implement" → coder role
- Keywords: "reviewer", "review" → reviewer role
- Keywords: "test-runner", "test", "testing" → test-runner role
- No match → injects general workflow

The reviewer role runs two passes: correctness first, then a Ponytail-inspired
over-engineering pass using `delete:`, `stdlib:`, `native:`, `yagni:`, and
`shrink:` findings, ending with a net-lines estimate.

### 3. UserPromptSubmit Hook
**File**: `hooks/elf-tracker.js`
**Triggers**: On every user prompt submission
**Purpose**:
- Detects `@elf` invocations
- Responds to "elf status" queries
- Shows active delegation state

### StatusLine

The status-line scripts read `.elf-state` from `CLAUDE_CONFIG_DIR`
or `~/.claude` and print one of:

`[ELF: IDLE]`, `[ELF: PLANNING]`, `[ELF: CODING 1/1]`,
`[ELF: TESTING]`, `[ELF: REVIEWING]`, or `[ELF: DONE]`.

Configure Claude Code's `statusLine` command to run
`hooks/elf-statusline.sh` on Unix or `hooks/elf-statusline.ps1` on Windows.

## Runtime Infrastructure

**File**: `hooks/elf-runtime.js`
**Provides**:
- Cross-platform hook output formatting (Claude Code vs Codex)
- State management (`.elf-active` flag)
- Delegation tracking (`.elf-delegations.json`)
- Platform detection (auto-detects Claude Code vs Codex via env vars)

## State Files

Located in `~/.claude/` (Claude Code) or `PLUGIN_DATA` (Codex):

- `.elf-active` - Marks plugin as active (timestamp)
- `.elf-delegations.json` - Tracks active sub-agent delegations
- `.elf-state` - Current workflow phase for the status line

## How It Works

1. **Session starts** → `elf-activate.js` runs
   - Writes state flag
   - Loads workflow into session context
   
2. **User types prompt** → `elf-tracker.js` runs
   - Detects `@elf` → shows delegation reminder
   - Detects "status" query → shows active delegations
   
3. **Elf spawns sub-agent** → `elf-subagent.js` runs
   - Reads agent metadata
   - Injects role-specific contract
   - Sub-agent knows it's a planner/coder/reviewer/test-runner

## Configuration

Claude Code automatically loads the standard `hooks/hooks.json` file, so it is
not repeated in `.claude-plugin/plugin.json`. The Codex manifest also omits the
unsupported `hooks` field.

The shared `hooks/hooks.json` defines all three hook events. Codex also
provides `PLUGIN_ROOT`, `PLUGIN_DATA`, and the `CLAUDE_PLUGIN_ROOT`
compatibility variable to bundled hooks.

## Testing

To test the hooks:

1. **Install plugin**:
   ```
   /plugin marketplace add <your-repo>
   /plugin install elf@elf-marketplace
   ```

2. **Start new session** - SessionStart hook should announce workflow

3. **Type `@elf`** - UserPromptSubmit hook should respond

4. **Spawn sub-agent** - SubagentStart hook injects role contract

## Cross-Platform Support

The runtime automatically detects the platform:
- **Claude Code**: Uses `~/.claude/` for state, raw text on SessionStart
- **Codex**: Uses `PLUGIN_DATA` dir, JSON with `systemMessage` + `hookSpecificOutput`

Both platforms share the same hook scripts and logic.
