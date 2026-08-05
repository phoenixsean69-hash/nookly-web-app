$ErrorActionPreference = "Stop"

$TargetTables = @(
    "rides",
    "ride_bookings",
    "ride_locations",
    "ride_drivers",
    "ride_vehicles",
    "ride_incidents",
    "ride_events",
    "ride_trip_core",
    "ride_trip_waypoints",
    "ride_expected_route_points",
    "ride_safety_alerts",
    "ride_driver_institutions"
)

$ReportPath = Join-Path (Get-Location) "inspect-rides-database-report.json"

function Remove-Ansi {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    return [regex]::Replace(
        $Text,
        [char]27 + "\[[0-?]*[ -/]*[@-~]",
        ""
    )
}

function Get-JsonFromOutput {
    param([string]$Text)

    $clean = Remove-Ansi $Text
    $objectStart = $clean.IndexOf("{")
    $arrayStart = $clean.IndexOf("[")

    if ($objectStart -lt 0 -and $arrayStart -lt 0) {
        throw "The Appwrite CLI response did not contain JSON."
    }

    if ($objectStart -ge 0 -and ($arrayStart -lt 0 -or $objectStart -lt $arrayStart)) {
        $jsonStart = $objectStart
        $jsonEnd = $clean.LastIndexOf("}")
    }
    else {
        $jsonStart = $arrayStart
        $jsonEnd = $clean.LastIndexOf("]")
    }

    if ($jsonEnd -lt $jsonStart) {
        throw "The Appwrite CLI JSON response was incomplete."
    }

    return $clean.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
}

function Invoke-AppwriteJson {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $raw = (
        & npx "--yes" "--package" "appwrite-cli" "appwrite" @Arguments "--json" 2>&1 |
        Out-String
    )

    if ($LASTEXITCODE -ne 0) {
        throw "Appwrite CLI command failed: appwrite $($Arguments -join ' ')"
    }

    $json = Get-JsonFromOutput $raw
    return $json | ConvertFrom-Json -Depth 100
}

function Get-CollectionItems {
    param(
        [Parameter(Mandatory = $true)]
        $Response,
        [Parameter(Mandatory = $true)]
        [string[]]$CandidateProperties
    )

    foreach ($property in $CandidateProperties) {
        if ($null -ne $Response.PSObject.Properties[$property]) {
            return @($Response.$property)
        }
    }

    if ($Response -is [System.Array]) {
        return @($Response)
    }

    return @()
}


function Get-FirstNonEmptyValue {
    param(
        [Parameter(Mandatory = $true)]
        $Object,
        [Parameter(Mandatory = $true)]
        [string[]]$PropertyNames
    )

    foreach ($propertyName in $PropertyNames) {
        $property = $Object.PSObject.Properties[$propertyName]

        if ($null -eq $property) {
            continue
        }

        $value = $property.Value

        if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            return $value
        }
    }

    return ""
}

function Get-SafeSample {
    param($Row)

    $allowedKeys = @(
        '$id',
        '$createdAt',
        '$updatedAt',
        'organizationId',
        'driverId',
        'vehicleId',
        'rideId',
        'bookingId',
        'studentId',
        'requestId',
        'offerId',
        'routeId',
        'status',
        'currentRideId',
        'isOnline',
        'currentLatitude',
        'currentLongitude',
        'currentAccuracyMeters',
        'currentLocationAt',
        'latitude',
        'longitude',
        'accuracy',
        'accuracyMeters',
        'speed',
        'speedKph',
        'heading',
        'recordedAt',
        'locationAt',
        'departureTime',
        'estimatedArrivalTime',
        'actualArrivalTime',
        'pickupLatitude',
        'pickupLongitude',
        'destinationLatitude',
        'destinationLongitude',
        'passengerCount',
        'seatCount',
        'totalSeats',
        'bookedSeats',
        'availableSeats',
        'sequence',
        'stopOrder',
        'waypointType',
        'eventType',
        'actorType',
        'incidentType',
        'severity',
        'resolved',
        'resolvedAt',
        'acknowledged',
        'acknowledgedAt',
        'routeCorridorMeters',
        'expectedDistanceKm',
        'expectedDurationMinutes',
        'distanceFromRouteMeters',
        'deviationDurationSeconds',
        'createdAt',
        'updatedAt'
    )

    $safe = [ordered]@{}

    foreach ($key in $allowedKeys) {
        if ($null -ne $Row.PSObject.Properties[$key]) {
            $safe[$key] = $Row.$key
        }
    }

    return [pscustomobject]$safe
}

Write-Host ""
Write-Host "Inspect Rides database audit" -ForegroundColor Cyan
Write-Host "Read-only: no table or row will be changed." -ForegroundColor Gray
Write-Host ""

Write-Host "Discovering Appwrite databases..." -ForegroundColor Cyan

$databaseResponse = Invoke-AppwriteJson -Arguments @(
    "databases",
    "list"
)

$databases = Get-CollectionItems `
    -Response $databaseResponse `
    -CandidateProperties @("databases", "tablesDB", "documents")

if ($databases.Count -eq 0) {
    throw "No Appwrite databases were returned."
}

$databaseCandidates = @()

foreach ($database in $databases) {
    $databaseId = [string]$database.'$id'

    if ([string]::IsNullOrWhiteSpace($databaseId)) {
        continue
    }

    try {
        $tablesResponse = Invoke-AppwriteJson -Arguments @(
            "tables-db",
            "list-tables",
            "--database-id",
            $databaseId
        )

        $tables = Get-CollectionItems `
            -Response $tablesResponse `
            -CandidateProperties @("tables", "collections")

        $tableIds = @(
            $tables |
            ForEach-Object { [string]$_.'$id' } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )

        $score = @(
            $TargetTables |
            Where-Object { $tableIds -contains $_ }
        ).Count

        $databaseCandidates += [pscustomobject]@{
            database = $database
            tables = $tables
            score = $score
        }
    }
    catch {
        Write-Host "Could not inspect database $databaseId." -ForegroundColor DarkYellow
    }
}

$selected = $databaseCandidates |
    Sort-Object -Property score -Descending |
    Select-Object -First 1

if ($null -eq $selected -or $selected.score -lt 1) {
    throw "Could not find a database containing the Nookly rides tables."
}

$selectedDatabase = $selected.database
$selectedDatabaseId = [string]$selectedDatabase.'$id'
$selectedDatabaseName = [string]$selectedDatabase.name

Write-Host "Selected database: $selectedDatabaseName ($selectedDatabaseId)" -ForegroundColor Green
Write-Host "Matched ride tables: $($selected.score) of $($TargetTables.Count)" -ForegroundColor Gray
Write-Host ""

$availableTables = @{}

foreach ($table in $selected.tables) {
    $tableId = [string]$table.'$id'

    if (-not [string]::IsNullOrWhiteSpace($tableId)) {
        $availableTables[$tableId] = $table
    }
}

$tableReports = @()

foreach ($tableId in $TargetTables) {
    Write-Host "Inspecting $tableId..." -ForegroundColor Cyan

    if (-not $availableTables.ContainsKey($tableId)) {
        $tableReports += [pscustomobject]@{
            tableId = $tableId
            exists = $false
            totalRows = 0
            columns = @()
            rowFieldNames = @()
            safeSamples = @()
            error = "Table not found."
        }

        Write-Host "  Not found" -ForegroundColor DarkYellow
        continue
    }

    try {
        $columnsResponse = Invoke-AppwriteJson -Arguments @(
            "tables-db",
            "list-columns",
            "--database-id",
            $selectedDatabaseId,
            "--table-id",
            $tableId
        )

        $columns = Get-CollectionItems `
            -Response $columnsResponse `
            -CandidateProperties @("columns", "attributes")

        $rowResponse = Invoke-AppwriteJson -Arguments @(
            "tables-db",
            "list-rows",
            "--database-id",
            $selectedDatabaseId,
            "--table-id",
            $tableId,
            "--limit",
            "3",
            "--sort-desc",
            '$createdAt'
        )

        $rows = Get-CollectionItems `
            -Response $rowResponse `
            -CandidateProperties @("rows", "documents")

        $totalRows = 0

        if ($null -ne $rowResponse.PSObject.Properties["total"]) {
            $totalRows = [int]$rowResponse.total
        }
        else {
            $totalRows = $rows.Count
        }

        $columnSummary = @(
            $columns |
            ForEach-Object {
                [pscustomobject]@{
                    key = [string](
                        Get-FirstNonEmptyValue `
                            -Object $_ `
                            -PropertyNames @("key", '$id', "attribute", "name")
                    )
                    type = [string]$_.type
                    required = [bool]$_.required
                    array = [bool]$_.array
                }
            }
        )

        $rowFieldNames = @(
            $rows |
            ForEach-Object { $_.PSObject.Properties.Name } |
            Sort-Object -Unique
        )

        $safeSamples = @(
            $rows |
            ForEach-Object { Get-SafeSample $_ }
        )

        $tableReports += [pscustomobject]@{
            tableId = $tableId
            exists = $true
            totalRows = $totalRows
            columns = $columnSummary
            rowFieldNames = $rowFieldNames
            safeSamples = $safeSamples
            error = $null
        }

        Write-Host "  Rows: $totalRows | Columns: $($columnSummary.Count)" -ForegroundColor Green
    }
    catch {
        $tableReports += [pscustomobject]@{
            tableId = $tableId
            exists = $true
            totalRows = 0
            columns = @()
            rowFieldNames = @()
            safeSamples = @()
            error = $_.Exception.Message
        }

        Write-Host "  Inspection failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Find-TableReport {
    param([string]$TableId)

    return $tableReports |
        Where-Object { $_.tableId -eq $TableId } |
        Select-Object -First 1
}

$rides = Find-TableReport "rides"
$bookings = Find-TableReport "ride_bookings"
$locations = Find-TableReport "ride_locations"
$waypoints = Find-TableReport "ride_trip_waypoints"
$expectedRoute = Find-TableReport "ride_expected_route_points"
$alerts = Find-TableReport "ride_safety_alerts"
$incidents = Find-TableReport "ride_incidents"

$readiness = [ordered]@{
    canListRides = [bool]($rides.exists -and $rides.totalRows -gt 0)
    hasConfirmedBookingData = [bool]($bookings.exists -and $bookings.totalRows -gt 0)
    hasLiveLocationData = [bool]($locations.exists -and $locations.totalRows -gt 0)
    hasWaypointData = [bool]($waypoints.exists -and $waypoints.totalRows -gt 0)
    hasExpectedRouteData = [bool]($expectedRoute.exists -and $expectedRoute.totalRows -gt 0)
    hasSafetyAlertData = [bool]($alerts.exists -and $alerts.totalRows -gt 0)
    hasIncidentData = [bool]($incidents.exists -and $incidents.totalRows -gt 0)
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    mode = "read-only"
    projectId = "69904bec001b4d14cce2"
    database = [ordered]@{
        id = $selectedDatabaseId
        name = $selectedDatabaseName
    }
    matchedRideTableCount = $selected.score
    targetRideTableCount = $TargetTables.Count
    readiness = $readiness
    tables = $tableReports
}

$report |
    ConvertTo-Json -Depth 100 |
    Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host ""
Write-Host "Audit finished." -ForegroundColor Green
Write-Host "Report: $ReportPath" -ForegroundColor Green
Write-Host ""
Write-Host "Readiness summary" -ForegroundColor Cyan

foreach ($item in $readiness.GetEnumerator()) {
    Write-Host "  $($item.Key): $($item.Value)"
}

Write-Host ""
Write-Host "Upload inspect-rides-database-report.json here." -ForegroundColor Yellow
