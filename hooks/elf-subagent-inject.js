#!/usr/bin/env node
// elf-subagent-inject.js — SubagentStart hook for automatic contract injection

const {
  getCoreRolePath,
  getDelegationContractPath,
  getResultContractPath,
} = require('./elf-config');

const {
  detectRoleFromPrompt,
  readFileWithFallback,
  writeHookOutput,
} = require('./elf-runtime-utils');
const { setPhase } = require('./elf-runtime');

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;

  try {
    // Parse subagent metadata from harness (stdin contains JSON with prompt)
    const data = JSON.parse(input.replace(/^\uFEFF/, '')); // Strip UTF-8 BOM
    const prompt = data.prompt || '';

    // Detect role from prompt keywords
    const role = detectRoleFromPrompt(prompt);

    if (role) {
      const phaseByRole = {
        planner: 'PLANNING',
        coder: 'CODING 1/1',
        'test-runner': 'TESTING',
        reviewer: 'REVIEWING',
      };
      setPhase(phaseByRole[role]);

      // Load contracts and role-specific instructions
      const delegationContract = readFileWithFallback(
        getDelegationContractPath(),
        '# Delegation Contract\n(Failed to load delegation contract)\n'
      );

      const resultContract = readFileWithFallback(
        getResultContractPath(),
        '# Result Contract\n(Failed to load result contract)\n'
      );

      const roleInstructions = readFileWithFallback(
        getCoreRolePath(role),
        `# ${role.charAt(0).toUpperCase() + role.slice(1)} Role\n(Failed to load role instructions)\n`
      );

      // Concatenate all contracts and inject into sub-agent context
      const injectedContext = [
        '# Elf Sub-Agent Context',
        '',
        '## Delegation Contract',
        delegationContract,
        '',
        '## Result Contract',
        resultContract,
        '',
        '## Your Role',
        roleInstructions,
      ].join('\n');

      writeHookOutput(injectedContext);
    } else {
      // No role detected - inject nothing (sub-agent proceeds with just its prompt)
      writeHookOutput('');
    }
  } catch (e) {
    // Silent fail - don't block subagent spawn on parse errors
    writeHookOutput('');
  }
}

// Read stdin (subagent metadata from harness)
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);

// Timeout fallback - never hang the session
// Pattern borrowed from ponytail: recover gracefully if stdin doesn't close
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
