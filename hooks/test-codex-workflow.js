#!/usr/bin/env node
// Static regression checks for Codex delegation guidance.

const fs = require('fs');
const path = require('path');

const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'elf', 'SKILL.md'), 'utf8');
const workflow = fs.readFileSync(path.join(__dirname, '..', 'core', 'workflow.md'), 'utf8');

const checks = [
  ['SKILL names Codex spawn tool', skill.includes('multi_agent_v1__spawn_agent')],
  ['SKILL names Codex wait tool', skill.includes('multi_agent_v1__wait_agent')],
  ['SKILL requires conditional fallback', skill.includes('genuinely unavailable')],
  ['SKILL rejects silent tool-failure fallback', skill.includes('do not silently reinterpret')],
  ['workflow names Codex spawn tool', workflow.includes('multi_agent_v1__spawn_agent')],
  ['workflow names Codex wait tool', workflow.includes('multi_agent_v1__wait_agent')],
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

console.log(`${checks.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
