#!/usr/bin/env node
// elf-runtime-utils.js — Shared utilities for elf hooks

const fs = require('fs');

/**
 * Detects role from subagent prompt
 * Looks for patterns: "Your role is: <role>" or "Role: <role>"
 * @param {string} prompt - The prompt being sent to the sub-agent
 * @returns {string|null} Detected role (planner|coder|reviewer|test-runner) or null
 */
function detectRoleFromPrompt(prompt) {
  const rolePattern = /(?:your role is|role):\s*(planner|coder|reviewer|test-runner)/i;
  const match = (prompt || '').match(rolePattern);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Reads file with fallback message on error
 * @param {string} filePath - Path to file
 * @param {string} fallback - Fallback content if read fails
 * @returns {string} File content or fallback
 */
function readFileWithFallback(filePath, fallback) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return fallback || `<!-- Failed to load: ${filePath} -->\n`;
  }
}

/**
 * Writes hook output as JSON to stdout
 * Format expected by Claude Code/Codex harness
 * @param {string} content - Context to inject into sub-agent
 */
function writeHookOutput(content) {
  try {
    console.log(JSON.stringify({ context: content }));
  } catch (e) {
    // Silent fail - don't block hook execution
  }
}

module.exports = {
  detectRoleFromPrompt,
  readFileWithFallback,
  writeHookOutput,
};
