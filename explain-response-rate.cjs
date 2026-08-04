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

function readRequired(filePath) {
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

const originalDashboard = readRequired(dashboardPath);
const originalStatsCard = readRequired(statsCardPath);

let dashboard = originalDashboard;
let statsCard = originalStatsCard;

// Treat both historical "accepted" and current "approved" as positive responses.
dashboard = replaceRequired(
  dashboard,
  /const respondedRequestCount = allRequests\.filter\(\(request\) => \{[\s\S]*?\}\)\.length;/,
  `const respondedRequestCount = allRequests.filter((request) => {
    const status = String(request?.status ?? "").trim().toLowerCase();
    return (
      status === "accepted" ||
      status === "approved" ||
      status === "rejected"
    );
  }).length;`,
  "the dashboard responded-request calculation",
);

// Add a human-readable explanation for the current organization's rate.
if (!dashboard.includes("const responseRateDescription =")) {
  const explanationBlock = `const dashboardRequests = Object.values(requestsByProperty).flat();
const dashboardRespondedRequests = dashboardRequests.filter((request) => {
  const status = String(request?.status ?? "").trim().toLowerCase();
  return (
    status === "accepted" ||
    status === "approved" ||
    status === "rejected"
  );
}).length;

const responseRateDescription =
  dashboardRequests.length > 0
    ? \`${'${dashboardRespondedRequests}'} of ${'${dashboardRequests.length}'} ${'${dashboardRequests.length === 1 ? "enquiry" : "enquiries"}'} responded\`
    : "No rental enquiries yet";

`;

  dashboard = replaceRequired(
    dashboard,
    /(\/\/\s*🔥\s*STAT CARDS[^\n]*\n\s*const statCards\s*=\s*\[|const statCards\s*=\s*\[)/,
    `${explanationBlock}$1`,
    "the dashboard statCards declaration",
  );
}

dashboard = replaceRequired(
  dashboard,
  /description:\s*"(?:Inquiry response rate|Answered rental requests)",/,
  "description: responseRateDescription,",
  "the Response Rate card description",
);

// Show the explanation directly below the response-quality badge.
if (!/statId === "responseRate"[\s\S]*?\{resolvedDescription\}[\s\S]*?\) : trend/.test(statsCard)) {
  statsCard = replaceRequired(
    statsCard,
    /(\) : statId === "responseRate" \? \(\s*<div className="mt-3">[\s\S]*?<\/span>)(\s*<\/div>\s*\) : trend \? \()/,
    `$1
              <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {resolvedDescription}
              </p>$2`,
    "the Response Rate badge block in StatsCard",
  );
}

if (dashboard === originalDashboard && statsCard === originalStatsCard) {
  console.log("Response-rate explanation is already present. No changes were needed.");
  process.exit(0);
}

// Write only after every required transformation succeeds.
fs.writeFileSync(dashboardPath, dashboard, "utf8");
fs.writeFileSync(statsCardPath, statsCard, "utf8");

console.log("✓ Response Rate now explains its numerator and denominator");
console.log("✓ Example: 1 of 1 enquiry responded");
console.log("✓ Historical 'accepted' and current 'approved' statuses both count");
console.log("✓ Rejected requests count as responses; pending requests do not");
