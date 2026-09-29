#!/usr/bin/env node
// Static regression checks for Codex delegation guidance.

const fs = require('fs');
const path = require('path');

const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'elf', 'SKILL.md'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', 'core', 'workflow.md'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function simulateWaitLoop(requiredIds, waitResults) {
  const unresolvedHostFailures = new Set(['interrupted', 'shutdown', 'not_found']);
  const collected = {};
  let waits = 0;
  let timeouts = 0;

  for (const result of waitResults) {
    waits++;
    if (result.timed_out) timeouts++;
    for (const id of requiredIds) {
      const state = result.status[id];
      if (state && typeof state === 'object') {
        const stateName = Object.keys(state)[0];
        collected[id] = { state: stateName, result: state[stateName] };
      } else if (state && unresolvedHostFailures.has(state)) {
        collected[id] = { state, result: null };
      }
    }

    const active = requiredIds.filter(id => !collected[id]);
    if (active.length === 0) break;
  }

  const active = requiredIds.filter(id => !collected[id]);
  const needsReplan = requiredIds.some(id =>
    collected[id] && unresolvedHostFailures.has(collected[id].state)
  );
  const done = active.length === 0 && !needsReplan;
  return { waits, timeouts, collected, active, needsReplan, done };
}

function runBehavioralChecks() {
  const completed = (result = 'result-contract') => ({ completed: result });

  const timeoutThenComplete = simulateWaitLoop(
    ['planner'],
    [
      { timed_out: true, status: { planner: 'pending_init' } },
      { timed_out: false, status: { planner: completed() } },
    ]
  );
  assert(timeoutThenComplete.waits === 2, 'timeout must cause another wait');
  assert(timeoutThenComplete.timeouts === 1, 'timeout response must be observed');
  assert(timeoutThenComplete.done, 'completed replacement wait should allow completion');
  assert(timeoutThenComplete.collected.planner.result === 'result-contract', 'completed result contract must be collected');

  const mixedStates = simulateWaitLoop(
    ['planner', 'reviewer'],
    [
      { timed_out: false, status: { planner: completed(), reviewer: 'running' } },
      { timed_out: false, status: { planner: completed(), reviewer: completed('review') } },
    ]
  );
  const mixedInProgress = simulateWaitLoop(
    ['planner', 'reviewer'],
    [{ timed_out: false, status: { planner: completed(), reviewer: 'running' } }]
  );
  assert(!mixedInProgress.done, 'final synthesis must be rejected while an agent is running');
  assert(mixedInProgress.active.includes('reviewer'), 'running agent must remain active');
  assert(mixedStates.waits === 2, 'mixed completed/running agents require another wait');
  assert(mixedStates.done, 'all terminal agents should allow completion');

  const failedAndBlocked = simulateWaitLoop(
    ['coder', 'tester'],
    [{ timed_out: false, status: { coder: { failed: 'compile error' }, tester: { blocked: 'needs coder' } } }]
  );
  assert(failedAndBlocked.done, 'failed and blocked workers are terminal for synthesis');
  assert(failedAndBlocked.collected.coder.state === 'failed', 'failed state must be preserved');
  assert(failedAndBlocked.collected.tester.state === 'blocked', 'blocked state must be preserved');

  const hostFailure = simulateWaitLoop(
    ['planner'],
    [{ timed_out: false, status: { planner: 'shutdown' } }]
  );
  assert(hostFailure.needsReplan, 'host failure must require replanning');
  assert(!hostFailure.done, 'unresolved host failure must prohibit DONE');
}

const checks = [
  ['SKILL names Codex spawn tool', skill.includes('multi_agent_v1__spawn_agent')],
  ['SKILL names Codex wait tool', skill.includes('multi_agent_v1__wait_agent')],
  ['SKILL requires conditional fallback', skill.includes('genuinely unavailable')],
  ['SKILL rejects silent tool-failure fallback', skill.includes('do not silently reinterpret')],
  ['workflow names Codex spawn tool', workflow.includes('multi_agent_v1__spawn_agent')],
  ['workflow names Codex wait tool', workflow.includes('multi_agent_v1__wait_agent')],
  ['SKILL distinguishes timeout from completion', skill.includes('wait again') && skill.includes('interim result')],
  ['SKILL covers terminal worker states', skill.includes('interrupted') && skill.includes('not_found')],
  ['SKILL gates dependent work', skill.includes('Do not assign dependent work')],
  ['SKILL gates final synthesis', skill.includes('Only proceed to final synthesis')],
  ['workflow requires repeated waits', workflow.includes('wait_agent` repeatedly') && workflow.includes('timeout elapsed')],
  ['workflow covers terminal worker states', workflow.includes('interrupted') && workflow.includes('not_found')],
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
  console.log('✓ behavioral wait-loop state checks');
} catch (error) {
  console.log(`✗ behavioral wait-loop state checks: ${error.message}`);
  failed++;
}

console.log(`${checks.length + 1 - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
