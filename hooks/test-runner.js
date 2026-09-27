#!/usr/bin/env node
// test-runner.js — Automated test suite for elf hooks

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

async function runScript(scriptPath) {
  return new Promise((resolve) => {
    const proc = spawn('node', [scriptPath], { cwd: __dirname });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function checkFileExists(filePath) {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      resolve(!err);
    });
  });
}

async function runTests() {
  log(colors.blue, '\n=== Elf Hooks Test Suite ===\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // Test 1: File structure
  log(colors.yellow, '📁 Test Suite 1: File Structure');
  const requiredFiles = [
    'hooks/hooks.json',
    'hooks/elf-config.js',
    'hooks/elf-runtime-utils.js',
    'hooks/elf-subagent-inject.js',
    'core/delegation-contract.md',
    'core/result-contract.md',
    'core/roles/planner.md',
    'core/roles/coder.md',
    'core/roles/reviewer.md',
    'core/roles/test-runner.md',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    const exists = await checkFileExists(filePath);
    if (exists) {
      log(colors.green, `  ✓ ${file}`);
      totalPassed++;
    } else {
      log(colors.red, `  ✗ ${file} (missing)`);
      totalFailed++;
    }
  }

  // Test 2: Unit tests (role detection)
  log(colors.yellow, '\n🔍 Test Suite 2: Role Detection');
  const unitTestPath = path.join(__dirname, 'test-role-detection.js');
  const unitResult = await runScript(unitTestPath);

  if (unitResult.code === 0) {
    const matches = unitResult.stdout.match(/(\d+) passed, (\d+) failed/);
    if (matches) {
      const passed = parseInt(matches[1]);
      const failed = parseInt(matches[2]);
      totalPassed += passed;
      totalFailed += failed;

      unitResult.stdout.split('\n').forEach(line => {
        if (line.includes('✓')) log(colors.green, `  ${line}`);
        else if (line.includes('✗')) log(colors.red, `  ${line}`);
      });
    }
  } else {
    log(colors.red, '  ✗ Unit test suite failed to run');
    totalFailed++;
  }

  // Test 3: Integration tests (injection)
  log(colors.yellow, '\n⚙️  Test Suite 3: Contract Injection');
  const integrationTestPath = path.join(__dirname, 'test-injection-integration.js');
  const integrationResult = await runScript(integrationTestPath);

  if (integrationResult.code === 0) {
    const matches = integrationResult.stdout.match(/(\d+) passed, (\d+) failed/);
    if (matches) {
      const passed = parseInt(matches[1]);
      const failed = parseInt(matches[2]);
      totalPassed += passed;
      totalFailed += failed;

      integrationResult.stdout.split('\n').forEach(line => {
        if (line.includes('✓')) log(colors.green, `  ${line}`);
        else if (line.includes('✗')) log(colors.red, `  ${line}`);
      });
    }
  } else {
    log(colors.red, '  ✗ Integration test suite failed to run');
    totalFailed++;
  }

  // Test 4: Hook configuration validation
  log(colors.yellow, '\n🔧 Test Suite 4: Hook Configuration');

  // Validate hooks.json structure
  const hooksJsonPath = path.join(__dirname, 'hooks.json');
  try {
    const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));

    if (hooksJson.hooks && hooksJson.hooks.SessionStart && hooksJson.hooks.SubagentStart && hooksJson.hooks.UserPromptSubmit) {
      log(colors.green, '  ✓ hooks.json has lifecycle hooks');
      totalPassed++;
    } else {
      log(colors.red, '  ✗ hooks.json missing lifecycle hook');
      totalFailed++;
    }

    const command = hooksJson.hooks.SubagentStart[0]?.hooks[0]?.command;
    if (command && command.includes('elf-subagent.js')) {
      log(colors.green, '  ✓ SubagentStart points to cross-platform sub-agent hook');
      totalPassed++;
    } else {
      log(colors.red, '  ✗ SubagentStart command is not cross-platform');
      totalFailed++;
    }
  } catch (e) {
    log(colors.red, `  ✗ hooks.json validation failed: ${e.message}`);
    totalFailed++;
  }

  // Validate plugin manifests
  const claudePluginPath = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
  try {
    const claudePlugin = JSON.parse(fs.readFileSync(claudePluginPath, 'utf8'));
    if (claudePlugin.hooks === './hooks/hooks.json') {
      log(colors.green, '  ✓ .claude-plugin/plugin.json references hooks');
      totalPassed++;
    } else {
      log(colors.red, '  ✗ .claude-plugin/plugin.json missing hooks reference');
      totalFailed++;
    }
  } catch (e) {
    log(colors.red, `  ✗ .claude-plugin validation failed: ${e.message}`);
    totalFailed++;
  }

  const codexPluginPath = path.join(__dirname, '..', '.codex-plugin', 'plugin.json');
  try {
    const codexPlugin = JSON.parse(fs.readFileSync(codexPluginPath, 'utf8'));
    if (codexPlugin.hooks === './hooks/hooks.json') {
      log(colors.green, '  ✓ .codex-plugin/plugin.json references hooks');
      totalPassed++;
    } else {
      log(colors.red, '  ✗ .codex-plugin/plugin.json missing hooks reference');
      totalFailed++;
    }
  } catch (e) {
    log(colors.red, `  ✗ .codex-plugin validation failed: ${e.message}`);
    totalFailed++;
  }

  // Summary
  log(colors.blue, '\n=== Test Summary ===');
  log(colors.green, `✓ ${totalPassed} passed`);
  if (totalFailed > 0) {
    log(colors.red, `✗ ${totalFailed} failed`);
  }
  log(colors.gray, `Total: ${totalPassed + totalFailed} tests\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  log(colors.red, `\n❌ Test runner crashed: ${err.message}`);
  process.exit(1);
});
