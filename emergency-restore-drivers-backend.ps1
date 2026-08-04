$ErrorActionPreference = "Stop"

$FunctionId = "rides-driver-api"
$FunctionFolder = ".\functions\rides-driver-api"
$MainFile = Join-Path $FunctionFolder "src\main.js"
$OrganizationFile = Join-Path $FunctionFolder "src\organization-handler.js"
$BackupFile = Join-Path $FunctionFolder "src\organization-handler.before-inspect-rides.js"

function Strip-Ansi {
    param([string]$Text)

    return [regex]::Replace(
        $Text,
        [char]27 + "\[[0-?]*[ -/]*[@-~]",
        ""
    )
}

function Invoke-AppwriteCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = (
        & npx "--yes" "--package" "appwrite-cli" "appwrite" @Arguments 2>&1 |
        Out-String
    )

    Write-Host $output

    if ($LASTEXITCODE -ne 0) {
        throw "Appwrite CLI command failed with exit code $LASTEXITCODE."
    }

    return (Strip-Ansi $output)
}

Write-Host ""
Write-Host "Emergency restore: Drivers page backend" -ForegroundColor Cyan
Write-Host ""

foreach ($requiredFile in @($MainFile, $OrganizationFile, $BackupFile)) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Missing required file: $requiredFile"
    }
}

$backupSource = Get-Content -LiteralPath $BackupFile -Raw

if (-not $backupSource.Contains('/organization/drivers')) {
    throw "The backup does not contain the organization driver route."
}

if ($backupSource.Contains('/organization/rides/inspection')) {
    throw "The backup already contains Inspect Rides changes and is not safe for this rollback."
}

Copy-Item -LiteralPath $BackupFile -Destination $OrganizationFile -Force

Write-Host "Restored the pre-Inspect-Rides organization handler." -ForegroundColor Green
Write-Host "Checking JavaScript syntax..." -ForegroundColor Cyan

& node "--check" $MainFile

if ($LASTEXITCODE -ne 0) {
    throw "src/main.js failed the syntax check."
}

& node "--check" $OrganizationFile

if ($LASTEXITCODE -ne 0) {
    throw "organization-handler.js failed the syntax check."
}

Write-Host "Syntax checks passed." -ForegroundColor Green
Write-Host ""
Write-Host "Creating a fresh deployment from the restored code..." -ForegroundColor Cyan

$deploymentOutput = Invoke-AppwriteCapture -Arguments @(
    "functions",
    "create-deployment",
    "--function-id",
    $FunctionId,
    "--code",
    $FunctionFolder,
    "--activate",
    "false",
    "--entrypoint",
    "src/main.js",
    "--commands",
    "npm install"
)

$deploymentMatch = [regex]::Match(
    $deploymentOutput,
    '(?m)^\s*\$id\s+([A-Za-z0-9]+)\s*$'
)

if (-not $deploymentMatch.Success) {
    throw "The deployment was created, but its deployment ID could not be read."
}

$newDeploymentId = $deploymentMatch.Groups[1].Value

Write-Host ""
Write-Host "New deployment ID: $newDeploymentId" -ForegroundColor Green
Write-Host "Waiting for build status ready..." -ForegroundColor Cyan

$ready = $false

for ($attempt = 1; $attempt -le 80; $attempt++) {
    Start-Sleep -Seconds 3

    $statusOutput = Invoke-AppwriteCapture -Arguments @(
        "functions",
        "get-deployment",
        "--function-id",
        $FunctionId,
        "--deployment-id",
        $newDeploymentId
    )

    if ($statusOutput -match '(?m)^\s*status\s+ready\s*$') {
        $ready = $true
        break
    }

    if ($statusOutput -match '(?m)^\s*status\s+(failed|canceled)\s*$') {
        throw "The restored deployment build failed."
    }

    Write-Host "Build is not ready yet. Attempt $attempt of 80." -ForegroundColor Gray
}

if (-not $ready) {
    throw "The restored deployment did not become ready in time."
}

Write-Host ""
Write-Host "Activating restored deployment..." -ForegroundColor Cyan

Invoke-AppwriteCapture -Arguments @(
    "functions",
    "update-function-deployment",
    "--function-id",
    $FunctionId,
    "--deployment-id",
    $newDeploymentId
) | Out-Null

Write-Host ""
Write-Host "Testing /organization/drivers without a browser session..." -ForegroundColor Cyan

$routeOutput = Invoke-AppwriteCapture -Arguments @(
    "functions",
    "create-execution",
    "--function-id",
    $FunctionId,
    "--async",
    "false",
    "--path",
    "/organization/drivers",
    "--method",
    "GET"
)

if ($routeOutput -match "This account is not registered as a driver") {
    throw "The organization route is still reaching the driver handler."
}

if ($routeOutput -match '(?m)^\s*responseStatusCode\s+500\s*$') {
    throw "The restored organization route still returns status 500."
}

if ($routeOutput -notmatch "Sign in with an organization account to continue") {
    Write-Host "Warning: the CLI route response was not the usual unauthenticated organization message." -ForegroundColor Yellow
    Write-Host "The deployment is active, but paste the full output for inspection." -ForegroundColor Yellow
} else {
    Write-Host "Organization routing test passed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Restore completed." -ForegroundColor Green
Write-Host "Active deployment: $newDeploymentId" -ForegroundColor Green
Write-Host "Hard-refresh http://localhost:3000/dashboard/drivers" -ForegroundColor Yellow
