#!/usr/bin/env node
// elf — SessionStart hook
// Activates elf workflow and announces availability

const fs = require('fs');
const path = require('path');
const { activate, writeHookOutput, isCodex } = require('./elf-runtime');

// Find plugin root
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

// Activate (write state flag)
activate();

// Build session start message
let output = '# Elf Orchestration Available\n\n';
output += 'The elf workflow is active. Use it to delegate substantial software tasks ';
output += 'through isolated planner, coder, reviewer, and test-runner sub-agents.\n\n';

output += '## When to Use\n\n';
output += '- User explicitly requests `@elf`\n';
output += '- Substantial tasks that benefit from isolated contexts\n';
output += '- Tasks requiring planning → implementation → review → testing flow\n\n';

output += '## Workflow Summary\n\n';

// Read and include core workflow
try {
  const workflow = fs.readFileSync(path.join(pluginRoot, 'core', 'workflow.md'), 'utf8');
  output += workflow + '\n\n';
} catch (e) {
  // Workflow file missing, continue with basic message
  output += '1. Planner creates task graph\n';
  output += '2. Coder implements bounded work items\n';
  output += '3. Test-runner validates changes\n';
  output += '4. Reviewer inspects against acceptance criteria\n\n';
}

output += '## Role Contracts\n\n';
output += 'Each sub-agent role has specific responsibilities:\n\n';
output += '- **Planner**: Read repo, produce implementation plan (no code)\n';
output += '- **Coder**: Implement one bounded work item within write set\n';
output += '- **Reviewer**: Review diff against objective (no edits unless assigned)\n';
output += '- **Test-runner**: Run validation, interpret failures\n\n';

output += 'SubagentStart hooks automatically inject role contracts when sub-agents are spawned.\n\n';

output += '## Delegation Mode\n\n';
output += 'Use the host harness\'s native sub-agent mechanism (Agent tool) for context isolation. ';
output += 'If sub-agents are unavailable, run roles sequentially and disclose that context isolation was not available.\n';

// Codex needs empty output for SessionStart, context goes in hookSpecificOutput
// Claude Code accepts raw text on SessionStart
if (isCodex) {
  writeHookOutput('SessionStart', output);
} else {
  // Claude Code: emit raw text (writeHookOutput handles this)
  writeHookOutput('SessionStart', output);
}
