#!/usr/bin/env node
// elf-config.js — Configuration utilities for elf plugin

const path = require('path');

/**
 * Gets the plugin root directory
 * Uses CLAUDE_PLUGIN_ROOT env var if available, otherwise derives from __dirname
 */
function getPluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT || path.dirname(__dirname);
}

/**
 * Gets path to a specific role file
 * @param {string} role - planner|coder|reviewer|test-runner
 * @returns {string} Absolute path to role markdown file
 */
function getCoreRolePath(role) {
  return path.join(getPluginRoot(), 'core', 'roles', `${role}.md`);
}

/**
 * Gets path to delegation contract
 * @returns {string} Absolute path to delegation-contract.md
 */
function getDelegationContractPath() {
  return path.join(getPluginRoot(), 'core', 'delegation-contract.md');
}

/**
 * Gets path to result contract
 * @returns {string} Absolute path to result-contract.md
 */
function getResultContractPath() {
  return path.join(getPluginRoot(), 'core', 'result-contract.md');
}

module.exports = {
  getPluginRoot,
  getCoreRolePath,
  getDelegationContractPath,
  getResultContractPath,
};
