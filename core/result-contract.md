# Result contract

Every worker returns:

```text
status: completed | failed | blocked
summary: concise outcome
files_changed: paths, or none
tests_run: commands and meaningful results, or none
acceptance_checks: passed, failed, or not run
risks: known limitations or regressions to investigate
follow_up: dependent work still needed
```

The elf records only the concise result needed for the next decision. Full traces remain in the worker context unless a specific detail is required.
