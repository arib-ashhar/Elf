#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elf-statusline-'));
const stateDir = path.join(tempDir, '.claude');
fs.mkdirSync(stateDir);
const stateFile = path.join(stateDir, '.elf-state');
const script = path.join(__dirname, 'elf-statusline.sh');

function run(phase) {
  fs.writeFileSync(stateFile, `${phase}\n`);
  return spawnSync('bash', [script], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: stateDir },
    encoding: 'utf8',
  });
}

assert.equal(run('[ELF: PLANNING]').stdout, '[ELF: PLANNING]');
assert.equal(run('[ELF: CODING 2/3]').stdout, '[ELF: CODING 2/3]');
assert.equal(run('[ELF: NOT-A-PHASE]').stdout, '');
console.log('3 statusline checks passed');
