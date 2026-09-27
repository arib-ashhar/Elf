#!/usr/bin/env node
// test-role-detection.js — Unit test for role detection logic

const { detectRoleFromPrompt } = require('./elf-runtime-utils');

const tests = [
  {
    name: 'Detect planner role',
    prompt: 'Your role is: planner. Analyze the codebase and create a task graph.',
    expected: 'planner',
  },
  {
    name: 'Detect coder role',
    prompt: 'Role: coder\nImplement the authentication middleware.',
    expected: 'coder',
  },
  {
    name: 'Detect reviewer role (case insensitive)',
    prompt: 'YOUR ROLE IS: REVIEWER. Review the diff for correctness.',
    expected: 'reviewer',
  },
  {
    name: 'Detect test-runner role',
    prompt: 'Your role is: test-runner. Execute the test suite.',
    expected: 'test-runner',
  },
  {
    name: 'No role keyword',
    prompt: 'Just do some general analysis of the code.',
    expected: null,
  },
  {
    name: 'Invalid role name',
    prompt: 'Your role is: architect',
    expected: null,
  },
  {
    name: 'Empty prompt',
    prompt: '',
    expected: null,
  },
];

let passed = 0;
let failed = 0;

console.log('Running role detection tests...\n');

tests.forEach(test => {
  const result = detectRoleFromPrompt(test.prompt);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✓ ${test.name}`);
  } else {
    failed++;
    console.log(`✗ ${test.name}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got: ${result}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
