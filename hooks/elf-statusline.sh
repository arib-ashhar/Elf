#!/usr/bin/env bash

state_file="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.elf-state"
[ -f "$state_file" ] || exit 0

phase=$(head -n1 "$state_file" | tr -d '\r\n')
if [[ "$phase" =~ ^\[ELF:\ (IDLE|PLANNING|CODING\ [0-9]+/[0-9]+|TESTING|REVIEWING|DONE)\]$ ]]; then
  printf '%s' "$phase"
fi
