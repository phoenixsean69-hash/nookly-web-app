$ErrorActionPreference = "Stop"

$FunctionId = "rides-driver-api"
$KnownGoodDeploymentId = "6a707eebc301ddc7c917"
$FunctionFolder = ".\functions\rides-driver-api"
$MainFile = Join-Path $FunctionFolder "src\main.js"
$OrganizationFile = Join-Path $FunctionFolder "src\organization-handler.js"

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

function Activate-Deployment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DeploymentId
    )

    Invoke-AppwriteCapture -Arguments @(
        "functions",
        "update-function-deployment",
        "--function-id",
        $FunctionId,
        "--deployment-id",
        $DeploymentId
    ) | Out-Null
}

function Test-OrganizationRoute {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $output = Invoke-AppwriteCapture -Arguments @(
        "functions",
        "create-execution",
        "--function-id",
        $FunctionId,
        "--async",
        "false",
        "--path",
        $Path,
        "--method",
        "GET"
    )

    if ($output -match "This account is not registered as a driver") {
        throw "The route was sent to the driver handler."
    }

    if ($output -notmatch "Sign in with an organization account to continue") {
        throw "The route did not return the expected organization authentication response."
    }
}

Write-Host ""
Write-Host "Inspect Rides Stage 2: deploy and verify" -ForegroundColor Cyan
Write-Host ""

foreach ($requiredFile in @($MainFile, $OrganizationFile)) {
    if (-not (Test-Path -LiteralPath $requiredFile)) {
        throw "Missing required file: $requiredFile"
    }
}

$mainSource = Get-Content -LiteralPath $MainFile -Raw
$organizationSource = Get-Content -LiteralPath $OrganizationFile -Raw

$requiredMainMarkers = @(
    'import organizationHandler from "./organization-handler.js";',
    "return organizationHandler(context);"
)

$requiredOrganizationMarkers = @(
    "/organization/rides/inspection",
    "routeDeviation",
    "confirmed"
)

foreach ($marker in $requiredMainMarkers) {
    if (-not $mainSource.Contains($marker)) {
        throw "Missing router marker in src/main.js: $marker"
    }
}

foreach ($marker in $requiredOrganizationMarkers) {
    if (-not $organizationSource.Contains($marker)) {
        throw "Missing Inspect Rides marker in organization-handler.js: $marker"
    }
}

Write-Host "Checking JavaScript syntax..." -ForegroundColor Cyan

& node "--check" $MainFile

if ($LASTEXITCODE -ne 0) {
    throw "src/main.js failed the JavaScript syntax check."
}

& node "--check" $OrganizationFile

if ($LASTEXITCODE -ne 0) {
    throw "organization-handler.js failed the JavaScript syntax check."
}

Write-Host "Local function validation passed." -ForegroundColor Green
Write-Host ""
Write-Host "Creating a new inactive Appwrite deployment..." -ForegroundColor Cyan

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
    throw "The deployment was created, but its ID could not be read from the CLI output."
}

$newDeploymentId = $deploymentMatch.Groups[1].Value

Write-Host ""
Write-Host "New deployment ID: $newDeploymentId" -ForegroundColor Green
Write-Host "Waiting for the deployment build to become ready..." -ForegroundColor Cyan

$ready = $false

for ($attempt = 1; $attempt -le 60; $attempt++) {
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
        throw "The new deployment build did not succeed."
    }

    Write-Host "Build attempt $attempt of 60 is not ready yet." -ForegroundColor Gray
}

if (-not $ready) {
    throw "The deployment did not become ready within three minutes."
}

Write-Host ""
Write-Host "Activating the new deployment..." -ForegroundColor Cyan
Activate-Deployment -DeploymentId $newDeploymentId

try {
    Write-Host ""
    Write-Host "Testing the existing organization driver route..." -ForegroundColor Cyan
    Test-OrganizationRoute -Path "/organization/drivers"

    Write-Host ""
    Write-Host "Testing the new Inspect Rides route..." -ForegroundColor Cyan
    Test-OrganizationRoute -Path "/organization/rides/inspection"
}
catch {
    Write-Host ""
    Write-Host "Verification failed. Restoring the known-good deployment..." -ForegroundColor Red

    try {
        Activate-Deployment -DeploymentId $KnownGoodDeploymentId
        Write-Host "Known-good deployment restored." -ForegroundColor Yellow
    }
    catch {
        Write-Host "Automatic rollback also failed. Run the rollback command manually." -ForegroundColor Red
    }

    throw
}

Write-Host ""
Write-Host "Inspect Rides Stage 2 passed." -ForegroundColor Green
Write-Host "Active deployment: $newDeploymentId" -ForegroundColor Green
Write-Host "Both organization routes reached the organization handler." -ForegroundColor Green
Write-Host ""
Write-Host "Paste this script output before we build the Drivers screen interface." -ForegroundColor Yellow
