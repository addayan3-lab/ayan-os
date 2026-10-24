# Commit only the reviewed Windows Bridge files. Never merges or force-pushes.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$expectedBranch = 'ayan-os/base-validation'
$paths = @(
  'scripts/ayan-os/bridge/bridge.node-tests.mjs',
  'scripts/ayan-os/bridge/fixtures/child.mjs',
  'scripts/ayan-os/bridge/process.mjs',
  'scripts/ayan-os/bridge/discovery.mjs',
  'scripts/ayan-os/bridge/bridge.mjs',
  'scripts/ayan-os/bridge/plugins/tool_plugins/app/ayan_bridge_handoff/plugin.json',
  'scripts/ayan-os/bridge/plugins/tool_plugins/app/ayan_bridge_handoff/main.py',
  'scripts/ayan-os/bridge/plugin-smoke.py',
  'scripts/ayan-os/bridge/windows-agent-bridge.mjs',
  'scripts/ayan-os/mcp/comfyui-readonly.mjs',
  'scripts/ayan-os/bridge/fixtures/comfy-transport.mjs',
  'scripts/ayan-os/bridge/acceptance.mjs',
  'scripts/ayan-os/bridge/handoff.example.json',
  'scripts/ayan-os/bridge/mcp-config.windows.example.json',
  'docs/ayan-os/WINDOWS_AGENT_BRIDGE_V01.md',
  'docs/ayan-os/WINDOWS_AGENT_BRIDGE_V01_ACCEPTANCE.json',
  'scripts/ayan-os/bridge/commit-validation.ps1'
)
Push-Location $repo
try {
  if ((git branch --show-current).Trim() -ne $expectedBranch) { throw 'WRONG_BRANCH' }
  if ((git remote get-url origin).Trim() -ne 'https://github.com/addayan3-lab/ayan-os.git') { throw 'UNEXPECTED_ORIGIN' }
  $alreadyStaged = @(git diff --cached --name-only)
  if ($LASTEXITCODE -ne 0 -or $alreadyStaged.Count -gt 0) { throw 'EXISTING_STAGED_CHANGES: review and unstage them before this dedicated commit.' }
  foreach ($path in $paths) { if (!(Test-Path -LiteralPath $path -PathType Leaf)) { throw ('MISSING_FILE: ' + $path) } }
  node --test scripts/ayan-os/bridge/bridge.node-tests.mjs
  if ($LASTEXITCODE -ne 0) { throw 'BRIDGE_TESTS_FAILED' }
  git diff --check -- @paths
  if ($LASTEXITCODE -ne 0) { throw 'DIFF_CHECK_FAILED' }
  git add -- @paths
  if ($LASTEXITCODE -ne 0) { throw 'STAGING_FAILED' }
  $staged = @(git diff --cached --name-only)
  foreach ($path in $staged) { if ($path -notin $paths) { throw ('UNEXPECTED_STAGED_FILE: ' + $path) } }
  if (!$staged.Count) { throw 'NO_BRIDGE_CHANGES_TO_COMMIT' }
  $messageDir = Join-Path $repo '.tmp\windows-agent-bridge'
  New-Item -ItemType Directory -Path $messageDir -Force | Out-Null
  $messagePath = Join-Path $messageDir 'commit-message.txt'
  $message = @'
feat(ayan-os): add Windows Agent Bridge validation adapters

Add allowlisted CLI/MCP checks, bounded process handling, isolated task receipts,
official TypeTale Python tool-plugin handoff validation and ACP initialization.
Reuse the read-only ComfyUI MCP with a fixed Windows loopback mode.

Validation: 12 Node checks passed, one Windows junction fixture skipped.
Live OpenCode/DeepSeek ACP and TypeTale offline checks passed. Codex state-runtime
permissions and ComfyUI socket permissions still block full acceptance.
No model inference, paid APIs, GPU generation or production asset changes.
'@
  [System.IO.File]::WriteAllText($messagePath, $message, [System.Text.UTF8Encoding]::new($false))
  git commit -F $messagePath
  if ($LASTEXITCODE -ne 0) { throw 'COMMIT_FAILED' }
  git push origin HEAD:refs/heads/ayan-os/base-validation
  if ($LASTEXITCODE -ne 0) { throw 'PUSH_FAILED: commit is local; inspect remote changes. Do not force-push.' }
  git log -1 --oneline
} finally {
  Pop-Location
}

