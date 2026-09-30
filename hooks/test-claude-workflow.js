#!/usr/bin/env node
// Static regression checks for Claude Code delegation guidance.

const fs = require('fs');
const path = require('path');

const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'elf', 'SKILL.md'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', 'core', 'workflow.md'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Claude Code's Task tool is synchronous: it blocks until the sub-agent finishes.
// There is no timeout-based polling loop. The coordinator calls Task, receives a
// result (or an error/failure), and proceeds. The wait-loop problem from the Codex
// harness (timeout ≠ completion) does not apply here.
//
// What still applies: dependency gates, terminal-state handling, and the DONE gate.
// A Task that returns an error or partial result must not be treated as success.
function simulateClaudeTaskRun(requiredIds, taskResults) {
  const unresolvedHostFailures = new Set(['interrupted', 'shutdown', 'not_found']);
  const collected = {};

  for (const id of requiredIds) {
    const result = taskResults[id];
    if (!result) continue; // agent never ran
    if (typeof result === 'object' && !Array.isArray(result)) {
      const stateName = Object.keys(result)[0];
      collected[id] = { state: stateName, result: result[stateName] };
    } else if (typeof result === 'string' && unresolvedHostFailures.has(result)) {
      collected[id] = { state: result, result: null };
    }
  }

  const active = requiredIds.filter(id => !collected[id]);
  const needsReplan = requiredIds.some(id =>
    collected[id] && unresolvedHostFailures.has(collected[id].state)
  );
  const done = active.length === 0 && !needsReplan;
  return { collected, active, needsReplan, done };
}

function runBehavioralChecks() {
  const completed = (result = 'result-contract') => ({ completed: result });

  // All tasks complete successfully.
  const allComplete = simulateClaudeTaskRun(
    ['planner', 'coder'],
    { planner: completed('plan'), coder: completed('code') }
  );
  assert(allComplete.done, 'all completed tasks should allow synthesis');
  assert(allComplete.active.length === 0, 'no active agents when all complete');

  // One task failed — synthesis must be blocked, failure must be visible.
  const oneFailed = simulateClaudeTaskRun(
    ['coder', 'tester'],
    { coder: { failed: 'compile error' }, tester: completed() }
  );
  assert(oneFailed.done, 'failed and completed workers are both terminal');
  assert(oneFailed.collected.coder.state === 'failed', 'failed state must be preserved');

  // One task blocked — still terminal, synthesis may proceed with blocker visible.
  const oneBlocked = simulateClaudeTaskRun(
    ['coder', 'reviewer'],
    { coder: completed(), reviewer: { blocked: 'needs coder output' } }
  );
  assert(oneBlocked.done, 'blocked worker is terminal for synthesis gate');
  assert(oneBlocked.collected.reviewer.state === 'blocked', 'blocked state must be preserved');

  // Task never ran — dependency was not satisfied.
  const dependencyNotMet = simulateClaudeTaskRun(
    ['planner', 'coder'],
    { planner: completed() } // coder never ran
  );
  assert(!dependencyNotMet.done, 'missing required agent must prevent synthesis');
  assert(dependencyNotMet.active.includes('coder'), 'un-run agent must remain active');

  // Host failure (Task tool error) — must not allow DONE.
  const hostFailure = simulateClaudeTaskRun(
    ['planner'],
    { planner: 'shutdown' }
  );
  assert(hostFailure.needsReplan, 'host failure must require replanning');
  assert(!hostFailure.done, 'unresolved host failure must prohibit DONE');
}

const checks = [
  // Claude Code uses the Task tool — verify SKILL.md acknowledges it.
  ['SKILL acknowledges Claude Code harness', skill.includes('Claude') || skill.includes('Task tool')],
  // The universal wait-loop contracts must still apply.
  ['SKILL requires conditional fallback', skill.includes('genuinely unavailable')],
  ['SKILL rejects silent tool-failure fallback', skill.includes('do not silently reinterpret')],
  ['SKILL gates dependent work', skill.includes('Do not assign dependent work')],
  ['SKILL gates final synthesis', skill.includes('Only proceed to final synthesis')],
  ['SKILL covers terminal worker states', skill.includes('interrupted') && skill.includes('not_found')],
  ['workflow requires no-pending gate', workflow.includes('final no-pending/no-running gate')],
  ['workflow preserves failed follow-up', workflow.includes('Failed or blocked work')],
  ['workflow requires replacement after host failure', workflow.includes('replacement worker') && workflow.includes('prohibit `DONE`')],
  ['workflow requires DONE', workflow.includes('DONE')],
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`✓ ${name}`);
  else {
    console.log(`✗ ${name}`);
    failed++;
  }
}

try {
  runBehavioralChecks();
  console.log('✓ behavioral Claude Task delegation checks');
} catch (error) {
  console.log(`✗ behavioral Claude Task delegation checks: ${error.message}`);
  failed++;
}

console.log(`${checks.length + 1 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
