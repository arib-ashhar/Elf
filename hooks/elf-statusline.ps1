$ChiefDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$StateFile = Join-Path $ChiefDir ".elf-state"
if (-not (Test-Path $StateFile)) { exit 0 }

try {
    $Phase = (Get-Content $StateFile -ErrorAction Stop | Select-Object -First 1).Trim()
} catch {
    exit 0
}

if ($Phase -match '^\[ELF: (IDLE|PLANNING|CODING \d+/\d+|TESTING|REVIEWING|DONE)\]$') {
    [Console]::Write($Phase)
}
