#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, 'hooks.json'), 'utf8'));
const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
const codex = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin', 'plugin.json'), 'utf8'));

assert.ok(!Object.prototype.hasOwnProperty.call(claude, 'hooks'));
assert.ok(!Object.prototype.hasOwnProperty.call(codex, 'hooks'));
for (const event of ['SessionStart', 'SubagentStart', 'UserPromptSubmit']) {
  assert.ok(hooks.hooks[event], `${event} hook is missing`);
  const command = hooks.hooks[event][0].hooks[0].command;
  assert.match(command, /CLAUDE_PLUGIN_ROOT/);
}
assert.match(
  hooks.hooks.SubagentStart[0].hooks[0].command,
  /elf-subagent\.js/
);

console.log('Claude and Codex plugin configuration checks passed');
