#!/usr/bin/env node
// elf — SubagentStart hook to inject role contracts
// Detects sub-agent role and injects appropriate contract + instructions

const fs = require('fs');
const path = require('path');
const { writeHookOutput, setPhase } = require('./elf-runtime');

// Find plugin root (hooks are in PLUGIN_ROOT/hooks/)
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

// Read role files
function readRole(roleName) {
  const rolePath = path.join(pluginRoot, 'core', 'roles', `${roleName}.md`);
  try {
    return fs.readFileSync(rolePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function readContract(contractName) {
  const contractPath = path.join(pluginRoot, 'core', `${contractName}.md`);
  try {
    return fs.readFileSync(contractPath, 'utf8');
  } catch (e) {
    return null;
  }
}

// Detect role from sub-agent input/context
// The SubagentStart hook receives JSON with agent metadata
let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;

  try {
    // Parse hook input (JSON with agent info)
    const data = input ? JSON.parse(input.replace(/^\uFEFF/, '')) : {};

    // Detect role from agent_type, prompt, or description
    // Common patterns: "planner", "coder", "reviewer", "test-runner"
    const agentType = (data.agent_type || '').toLowerCase();
    const prompt = (data.prompt || '').toLowerCase();
    const description = (data.description || '').toLowerCase();

    const combined = `${agentType} ${prompt} ${description}`;

    let role = null;
    if (/planner|plan|planning/.test(combined)) {
      role = 'planner';
    } else if (/coder|code|implement|coding/.test(combined)) {
      role = 'coder';
    } else if (/reviewer|review/.test(combined)) {
      role = 'reviewer';
    } else if (/test-runner|test|testing/.test(combined)) {
      role = 'test-runner';
    }

    if (!role) {
      // No recognized role, inject general workflow without specific role
      const workflow = fs.readFileSync(
        path.join(pluginRoot, 'core', 'workflow.md'),
        'utf8'
      );
      const delegationContract = readContract('delegation-contract');
      const resultContract = readContract('result-contract');

      let context = '# Elf Workflow Context\n\n';
      context += workflow + '\n\n';
      if (delegationContract) context += delegationContract + '\n\n';
      if (resultContract) context += resultContract + '\n';

      writeHookOutput('SubagentStart', context);
      return;
    }

    const phaseByRole = {
      planner: 'PLANNING',
      coder: 'CODING 1/1',
      'test-runner': 'TESTING',
      reviewer: 'REVIEWING',
    };
    setPhase(phaseByRole[role]);

    // Build context for the detected role
    let context = `# Elf: ${role.toUpperCase()} Role\n\n`;
    context += 'You are acting as the **' + role + '** in a elf delegation workflow.\n\n';

    // Inject role definition
    const roleContent = readRole(role);
    if (roleContent) {
      context += roleContent + '\n\n';
    }

    // Inject contracts
    const delegationContract = readContract('delegation-contract');
    const resultContract = readContract('result-contract');

    if (delegationContract) {
      context += '## Delegation Contract\n\n';
      context += delegationContract + '\n\n';
    }

    if (resultContract) {
      context += '## Result Contract\n\n';
      context += 'You MUST return results following this structure:\n\n';
      context += resultContract + '\n\n';
    }

    // Add role-specific reminders
    context += '## Your Responsibilities\n\n';
    switch (role) {
      case 'planner':
        context += '- Read relevant repository areas\n';
        context += '- Produce an implementation plan with task graph\n';
        context += '- Identify files, dependencies, risks, acceptance criteria\n';
        context += '- DO NOT write code, only plan\n';
        context += '- Return result contract with `files_changed: none`\n';
        break;
      case 'coder':
        context += '- Implement ONE bounded work item from the brief\n';
        context += '- Inspect surrounding code before editing\n';
        context += '- Stay within assigned write set\n';
        context += '- Run focused checks appropriate to the change\n';
        context += '- Return result contract with all changed paths\n';
        break;
      case 'reviewer':
        context += '- Review implementation against objective and acceptance criteria\n';
        context += '- Inspect diff and relevant tests\n';
        context += '- Look for correctness issues, regressions, edge cases\n';
        context += '- DO NOT make edits unless elf assigns remediation\n';
        context += '- Return findings ordered by severity\n';
        break;
      case 'test-runner':
        context += '- Run smallest meaningful validation set\n';
        context += '- Interpret failures, not just exit codes\n';
        context += '- Distinguish product vs environment vs pre-existing failures\n';
        context += '- Return commands, outcomes, excerpts, follow-up\n';
        break;
    }

    writeHookOutput('SubagentStart', context);
  } catch (e) {
    // Silent fail - if parsing fails, emit nothing rather than breaking the sub-agent
  }
}

process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);

// Never hang - fallback timeout like ponytail uses
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
