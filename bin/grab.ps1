# Bulk-grab all student repos for one assignment (Windows PowerShell).
#
# Usage:
#   .\bin\grab.ps1 -Assignment p1-welcomeback [-OutDir C:\marking\p1]
#
# Requires: gh (logged in), git (auth set up via `gh auth setup-git`).

param(
    [Parameter(Mandatory=$true)][string]$Assignment,
    [string]$OutDir,
    [string]$ClassroomRepo = "mbond-flinders-org/classroom"
)

if (-not $OutDir) { $OutDir = ".\marking\$Assignment" }

Write-Host "▶ Triggering bulk-clone workflow for '$Assignment' on $ClassroomRepo ..."
gh workflow run bulk-clone.yml -R $ClassroomRepo -f "assignment_id=$Assignment"

Write-Host "▶ Waiting for run to register ..."
Start-Sleep -Seconds 6

$runId = gh run list -R $ClassroomRepo -w bulk-clone.yml --limit 1 --json databaseId -q '.[0].databaseId'
Write-Host "▶ Run #$runId — watching ..."
gh run watch $runId -R $ClassroomRepo --exit-status
if ($LASTEXITCODE -ne 0) { throw "Workflow run #$runId failed." }

$tmp = New-Item -ItemType Directory -Path ([System.IO.Path]::GetTempPath() + [guid]::NewGuid())
try {
    Write-Host "▶ Downloading artifact ..."
    gh run download $runId -R $ClassroomRepo -n "clone-$Assignment" -D $tmp

    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    Write-Host "▶ Cloning/pulling repos into $OutDir ..."
    & (Join-Path $tmp "clone.ps1") -OutDir $OutDir
}
finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

Write-Host "✅ Done. Repos in: $OutDir"
