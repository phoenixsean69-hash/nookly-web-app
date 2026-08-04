const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dashboardPath = path.join(root, "app", "dashboard", "page.tsx");
const statsCardPath = path.join(
  root,
  "components",
  "dashboard",
  "stats-card.tsx",
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Could not find ${label}. No files were written.`);
  }

  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

const originalDashboard = readRequiredFile(dashboardPath);
const originalStatsCard = readRequiredFile(statsCardPath);

let nextDashboard = originalDashboard;
let nextStatsCard = originalStatsCard;

if (!nextDashboard.includes("respondedRequestCount")) {
  const responseRateBlock = `  // -------- CALCULATE RESPONSE RATE --------
  // A rental request counts as answered once the landlord approves or rejects it.
  const totalRequestCount = allRequests.length;
  const respondedRequestCount = allRequests.filter((request) => {
    const status = String(request?.status ?? "").trim().toLowerCase();
    return status === "approved" || status === "rejected";
  }).length;

  const responseRate =
    totalRequestCount > 0
      ? Math.round((respondedRequestCount / totalRequestCount) * 100)
      : 0;

`;

  nextDashboard = replaceRequired(
    nextDashboard,
    /\s*\/\/ -------- CALCULATE RESPONSE RATE --------[\s\S]*?(?=\s*\/\/ -------- CALCULATE SATISFACTION SCORE --------)/,
    `\n${responseRateBlock}`,
    "the dashboard response-rate calculation block",
  );
}

nextDashboard = nextDashboard.replace(
  'description: "Inquiry response rate",',
  'description: "Answered rental requests",',
);

if (nextStatsCard.includes('label: "No enquiries yet"')) {
  nextStatsCard = nextStatsCard.replace(
    'return { label: "No enquiries yet", tone: "neutral" };',
    'return { label: "No responses yet", tone: "neutral" };',
  );
}

if (nextDashboard === originalDashboard && nextStatsCard === originalStatsCard) {
  console.log("Response-rate fix is already present. No changes were needed.");
  process.exit(0);
}

// Write only after every required replacement has succeeded.
fs.writeFileSync(dashboardPath, nextDashboard, "utf8");
fs.writeFileSync(statsCardPath, nextStatsCard, "utf8");

console.log("✓ Fixed dashboard response-rate calculation");
console.log("✓ approved + rejected requests now count as responses");
console.log("✓ pending requests remain unanswered");
console.log("✓ zero requests/responses now display 0%, not 100%");
console.log("✓ Updated the card label to 'No responses yet'");
