const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const TARGET_TABLES = [
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
  "ride_driver_institutions",
];

const SAFE_KEYS = new Set([
  "$id",
  "$createdAt",
  "$updatedAt",
  "organizationId",
  "driverId",
  "vehicleId",
  "rideId",
  "bookingId",
  "studentId",
  "requestId",
  "offerId",
  "routeId",
  "status",
  "currentRideId",
  "isOnline",
  "currentLatitude",
  "currentLongitude",
  "currentAccuracyMeters",
  "currentLocationAt",
  "latitude",
  "longitude",
  "accuracy",
  "accuracyMeters",
  "speed",
  "speedKph",
  "heading",
  "recordedAt",
  "locationAt",
  "departureTime",
  "estimatedArrivalTime",
  "actualArrivalTime",
  "pickupLatitude",
  "pickupLongitude",
  "destinationLatitude",
  "destinationLongitude",
  "passengerCount",
  "seatCount",
  "totalSeats",
  "bookedSeats",
  "availableSeats",
  "sequence",
  "stopOrder",
  "waypointType",
  "eventType",
  "actorType",
  "incidentType",
  "severity",
  "resolved",
  "resolvedAt",
  "acknowledged",
  "acknowledgedAt",
  "routeCorridorMeters",
  "expectedDistanceKm",
  "expectedDurationMinutes",
  "distanceFromRouteMeters",
  "deviationDurationSeconds",
  "createdAt",
  "updatedAt",
]);

function stripAnsi(value) {
  return String(value || "").replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function extractJson(text) {
  const clean = stripAnsi(text).trim();

  try {
    return JSON.parse(clean);
  } catch {
    // Appwrite CLI can print informational text before JSON.
  }

  const objectStart = clean.indexOf("{");
  const arrayStart = clean.indexOf("[");
  let start = -1;
  let end = -1;

  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    start = objectStart;
    end = clean.lastIndexOf("}");
  } else if (arrayStart >= 0) {
    start = arrayStart;
    end = clean.lastIndexOf("]");
  }

  if (start < 0 || end < start) {
    throw new Error("The Appwrite CLI response did not contain valid JSON.");
  }

  return JSON.parse(clean.slice(start, end + 1));
}

function quoteForCmd(value) {
  const text = String(value);

  if (!/[ \t"&|<>^()%!]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function runAppwrite(args) {
  const appwriteArgs = [
    "--yes",
    "--package",
    "appwrite-cli",
    "appwrite",
    ...args,
    "--json",
  ];

  let result;

  if (process.platform === "win32") {
    const commandLine = ["npx", ...appwriteArgs]
      .map(quoteForCmd)
      .join(" ");

    result = spawnSync(
      process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/s", "/c", commandLine],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
      },
    );
  } else {
    result = spawnSync("npx", appwriteArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
    });
  }

  if (result.error) {
    throw new Error(
      `Could not start Appwrite CLI: ${result.error.message}`,
    );
  }

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 0) {
    throw new Error(
      [
        `Appwrite CLI command failed: appwrite ${args.join(" ")}`,
        stripAnsi(stdout),
        stripAnsi(stderr),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return extractJson(`${stdout}\n${stderr}`);
}

function getItems(response, candidates) {
  for (const key of candidates) {
    if (response && Array.isArray(response[key])) {
      return response[key];
    }
  }

  return Array.isArray(response) ? response : [];
}

function getColumnKey(column) {
  return String(
    column?.key ??
      column?.$id ??
      column?.attribute ??
      column?.name ??
      "",
  );
}

function safeSample(row) {
  const sample = {};

  for (const [key, value] of Object.entries(row || {})) {
    if (SAFE_KEYS.has(key)) {
      sample[key] = value;
    }
  }

  return sample;
}

function rowCount(response, rows) {
  const total = Number(response?.total);
  return Number.isFinite(total) ? total : rows.length;
}

function findTableReport(reports, tableId) {
  return reports.find((report) => report.tableId === tableId);
}

console.log("");
console.log("Inspect Rides database audit");
console.log("Read-only: no table, row, Function, or deployment will be changed.");
console.log("");

console.log("Discovering Appwrite databases...");

const databaseResponse = runAppwrite(["databases", "list"]);
const databases = getItems(databaseResponse, ["databases", "documents"]);

if (databases.length === 0) {
  throw new Error("No Appwrite databases were returned.");
}

const candidates = [];

for (const database of databases) {
  const databaseId = String(database?.$id || "").trim();
  if (!databaseId) continue;

  try {
    const tablesResponse = runAppwrite([
      "tables-db",
      "list-tables",
      "--database-id",
      databaseId,
    ]);

    const tables = getItems(tablesResponse, ["tables", "collections"]);
    const tableIds = new Set(
      tables.map((table) => String(table?.$id || "").trim()).filter(Boolean),
    );

    const score = TARGET_TABLES.filter((tableId) =>
      tableIds.has(tableId),
    ).length;

    candidates.push({
      database,
      tables,
      score,
    });
  } catch (error) {
    console.warn(`Could not inspect database ${databaseId}: ${error.message}`);
  }
}

candidates.sort((left, right) => right.score - left.score);
const selected = candidates[0];

if (!selected || selected.score < 1) {
  throw new Error(
    "Could not find an Appwrite database containing the Nookly ride tables.",
  );
}

const databaseId = String(selected.database.$id);
const databaseName = String(selected.database.name || "Unnamed database");

console.log(`Selected database: ${databaseName} (${databaseId})`);
console.log(`Matched ride tables: ${selected.score} of ${TARGET_TABLES.length}`);
console.log("");

const availableTables = new Map(
  selected.tables.map((table) => [String(table.$id), table]),
);

const tableReports = [];

for (const tableId of TARGET_TABLES) {
  console.log(`Inspecting ${tableId}...`);

  if (!availableTables.has(tableId)) {
    tableReports.push({
      tableId,
      exists: false,
      totalRows: 0,
      columns: [],
      rowFieldNames: [],
      safeSamples: [],
      error: "Table not found.",
    });

    console.log("  Not found");
    continue;
  }

  try {
    const columnsResponse = runAppwrite([
      "tables-db",
      "list-columns",
      "--database-id",
      databaseId,
      "--table-id",
      tableId,
    ]);

    const columns = getItems(columnsResponse, ["columns", "attributes"]);

    const rowsResponse = runAppwrite([
      "tables-db",
      "list-rows",
      "--database-id",
      databaseId,
      "--table-id",
      tableId,
      "--limit",
      "3",
    ]);

    const rows = getItems(rowsResponse, ["rows", "documents"]);

    const columnSummary = columns.map((column) => ({
      key: getColumnKey(column),
      type: String(column?.type || ""),
      required: Boolean(column?.required),
      array: Boolean(column?.array),
    }));

    const rowFieldNames = [
      ...new Set(rows.flatMap((row) => Object.keys(row || {}))),
    ].sort();

    tableReports.push({
      tableId,
      exists: true,
      totalRows: rowCount(rowsResponse, rows),
      columns: columnSummary,
      rowFieldNames,
      safeSamples: rows.map(safeSample),
      error: null,
    });

    console.log(
      `  Rows: ${rowCount(rowsResponse, rows)} | Columns: ${columnSummary.length}`,
    );
  } catch (error) {
    tableReports.push({
      tableId,
      exists: true,
      totalRows: 0,
      columns: [],
      rowFieldNames: [],
      safeSamples: [],
      error: error.message,
    });

    console.log(`  Inspection failed: ${error.message}`);
  }
}

const rides = findTableReport(tableReports, "rides");
const bookings = findTableReport(tableReports, "ride_bookings");
const locations = findTableReport(tableReports, "ride_locations");
const waypoints = findTableReport(tableReports, "ride_trip_waypoints");
const expectedRoute = findTableReport(
  tableReports,
  "ride_expected_route_points",
);
const alerts = findTableReport(tableReports, "ride_safety_alerts");
const incidents = findTableReport(tableReports, "ride_incidents");

const readiness = {
  canListRides: Boolean(rides?.exists && rides.totalRows > 0),
  hasConfirmedBookingData: Boolean(
    bookings?.exists && bookings.totalRows > 0,
  ),
  hasLiveLocationData: Boolean(
    locations?.exists && locations.totalRows > 0,
  ),
  hasWaypointData: Boolean(waypoints?.exists && waypoints.totalRows > 0),
  hasExpectedRouteData: Boolean(
    expectedRoute?.exists && expectedRoute.totalRows > 0,
  ),
  hasSafetyAlertData: Boolean(alerts?.exists && alerts.totalRows > 0),
  hasIncidentData: Boolean(incidents?.exists && incidents.totalRows > 0),
};

const report = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  projectId: "69904bec001b4d14cce2",
  database: {
    id: databaseId,
    name: databaseName,
  },
  matchedRideTableCount: selected.score,
  targetRideTableCount: TARGET_TABLES.length,
  readiness,
  tables: tableReports,
};

const reportPath = path.join(
  process.cwd(),
  "inspect-rides-database-report.json",
);

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("");
console.log("Audit finished.");
console.log(`Report: ${reportPath}`);
console.log("");
console.log("Readiness summary");

for (const [key, value] of Object.entries(readiness)) {
  console.log(`  ${key}: ${value}`);
}

console.log("");
console.log("Upload inspect-rides-database-report.json here.");
