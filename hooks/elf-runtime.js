const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = '.elf-active';
const DELEGATION_STATE_FILE = '.elf-delegations.json';
const PHASE_STATE_FILE = '.elf-state';
const PHASES = new Set([
  'IDLE',
  'PLANNING',
  'TESTING',
  'REVIEWING',
  'DONE',
]);

// Detect platform: Codex sets PLUGIN_DATA, Claude Code doesn't
const isCodex = Boolean(process.env.PLUGIN_DATA);

// State directory: Codex uses PLUGIN_DATA, Claude uses ~/.claude
function getStateDir() {
  if (isCodex) {
    return process.env.PLUGIN_DATA;
  }
  // Claude Code: use CLAUDE_CONFIG_DIR if set, otherwise ~/.claude
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

const stateDir = getStateDir();
const statePath = path.join(stateDir, STATE_FILE);
const delegationStatePath = path.join(stateDir, DELEGATION_STATE_FILE);
const phaseStatePath = path.join(stateDir, PHASE_STATE_FILE);

function setPhase(phase) {
  const normalized = String(phase || '').trim().toUpperCase();
  if (!PHASES.has(normalized) && !/^CODING \d+\/\d+$/.test(normalized)) return false;

  try {
    fs.mkdirSync(path.dirname(phaseStatePath), { recursive: true });
    fs.writeFileSync(phaseStatePath, `[ELF: ${normalized}]\n`);
    return true;
  } catch (e) {
    return false;
  }
}

function readPhase() {
  try {
    const phase = fs.readFileSync(phaseStatePath, 'utf8').split(/\r?\n/, 1)[0].trim();
    return /^\[ELF: (?:IDLE|PLANNING|CODING \d+\/\d+|TESTING|REVIEWING|DONE)\]$/.test(phase)
      ? phase
      : null;
  } catch (e) {
    return null;
  }
}

// Mark elf as active
function activate() {
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, new Date().toISOString());
    setPhase('IDLE');
  } catch (e) {
    // Best-effort, don't block on state file
  }
}

// Clear active state
function deactivate() {
  try {
    fs.unlinkSync(statePath);
  } catch (e) {
    // Silent fail if file doesn't exist
  }
}

// Check if elf is active
function isActive() {
  try {
    return fs.existsSync(statePath);
  } catch (e) {
    return false;
  }
}

// Read delegation state (which sub-agents are running what roles)
function readDelegationState() {
  try {
    const data = fs.readFileSync(delegationStatePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { delegations: [] };
  }
}

// Write delegation state
function writeDelegationState(state) {
  try {
    fs.mkdirSync(path.dirname(delegationStatePath), { recursive: true });
    fs.writeFileSync(delegationStatePath, JSON.stringify(state, null, 2));
  } catch (e) {
    // Best-effort, don't block on state file
  }
}

// Add a new delegation
function addDelegation(role, agentType, objective) {
  const state = readDelegationState();
  state.delegations.push({
    id: Date.now().toString(),
    role,
    agentType,
    objective,
    startedAt: new Date().toISOString(),
  });
  writeDelegationState(state);
}

// Clear all delegations (task complete)
function clearDelegations() {
  try {
    fs.unlinkSync(delegationStatePath);
  } catch (e) {
    // Silent fail
  }
}

// Format hook output for the current platform
// Claude Code: SessionStart accepts raw text, SubagentStart needs JSON
// Codex: Always needs JSON with systemMessage + hookSpecificOutput
function writeHookOutput(event, context = '') {
  if (isCodex) {
    const output = { systemMessage: 'ELF:ACTIVE' };
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    process.stdout.write(JSON.stringify(output));
    return;
  }

  // Claude Code: SubagentStart needs JSON wrapper, SessionStart can be raw text
  if (event === 'SubagentStart') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event,
        additionalContext: context,
      },
    }));
    return;
  }

  // SessionStart and UserPromptSubmit: raw text output
  process.stdout.write(context);
}

module.exports = {
  activate,
  addDelegation,
  clearDelegations,
  deactivate,
  isActive,
  isCodex,
  readDelegationState,
  readPhase,
  setPhase,
  writeHookOutput,
  writeDelegationState,
};
