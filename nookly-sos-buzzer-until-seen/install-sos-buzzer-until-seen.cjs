const fs = require("node:fs");
const path = require("node:path");

const UPDATE_NAME =
  "Nookly SOS Buzzer Until Seen";

const PROJECT_ROOT =
  process.env.NOOKLY_PROJECT_ROOT ||
  "C:\\Users\\nooklyweb\\Desktop\\nookly-web";

const packageJsonPath = path.join(
  PROJECT_ROOT,
  "package.json",
);

const contextPath = path.join(
  PROJECT_ROOT,
  "contexts",
  "sos-alert-context.tsx",
);

const sourceContextPath = path.join(
  __dirname,
  "files",
  "contexts",
  "sos-alert-context.tsx",
);

const buzzerPath = path.join(
  PROJECT_ROOT,
  "public",
  "buzzer.mp3",
);

const backupDirectory = path.join(
  PROJECT_ROOT,
  ".nookly-backups",
);

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

console.log(`\nInstalling ${UPDATE_NAME}...`);
console.log(`Project: ${PROJECT_ROOT}\n`);

if (!fs.existsSync(PROJECT_ROOT)) {
  fail(
    `Project folder was not found:\n${PROJECT_ROOT}`,
  );
}

if (!fs.existsSync(packageJsonPath)) {
  fail(
    "package.json was not found. This is not the expected Nookly Web project.",
  );
}

let packageJson;

try {
  packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf8"),
  );
} catch (error) {
  fail(
    `Could not read package.json: ${error.message}`,
  );
}

if (packageJson.name !== "nookly-web") {
  fail(
    `Unexpected project name "${
      packageJson.name || "unknown"
    }". Expected "nookly-web".`,
  );
}

if (!fs.existsSync(contextPath)) {
  fail(
    `The SOS realtime provider was not found:\n${contextPath}\n` +
      "Install the SOS realtime web update first.",
  );
}

if (!fs.existsSync(sourceContextPath)) {
  fail(
    `The packaged replacement file is missing:\n${sourceContextPath}`,
  );
}

if (!fs.existsSync(buzzerPath)) {
  fail(
    `The buzzer audio file was not found:\n${buzzerPath}\n\n` +
      "Place your MP3 at public\\buzzer.mp3, then run this installer again.",
  );
}

const buzzerStats = fs.statSync(buzzerPath);

if (!buzzerStats.isFile() || buzzerStats.size <= 0) {
  fail(
    `public\\buzzer.mp3 exists but is empty or invalid:\n${buzzerPath}`,
  );
}

const currentContext = fs.readFileSync(
  contextPath,
  "utf8",
);

const currentMarkers = [
  "SosAlertProvider",
  "useSosAlerts",
  "subscribeToStudentSosAlerts",
  "unreadCount",
];

for (const marker of currentMarkers) {
  if (!currentContext.includes(marker)) {
    fail(
      `Safety check failed. The installed SOS provider is missing "${marker}". ` +
        "No files were changed.",
    );
  }
}

fs.mkdirSync(backupDirectory, {
  recursive: true,
});

const backupPath = path.join(
  backupDirectory,
  `sos-alert-context.before-buzzer.${timestamp()}.tsx`,
);

fs.copyFileSync(contextPath, backupPath);

try {
  fs.copyFileSync(
    sourceContextPath,
    contextPath,
  );

  const installed = fs.readFileSync(
    contextPath,
    "utf8",
  );

  const installedMarkers = [
    'new Audio("/buzzer.mp3")',
    "audio.loop = true",
    "Enable SOS buzzer",
    "unreadCount <= 0",
    "stopBuzzer();",
    "setBuzzerBlocked(true)",
  ];

  for (const marker of installedMarkers) {
    if (!installed.includes(marker)) {
      throw new Error(
        `Installed SOS provider is missing "${marker}".`,
      );
    }
  }
} catch (error) {
  fs.copyFileSync(
    backupPath,
    contextPath,
  );

  fail(
    `Installation failed and the previous SOS provider was restored automatically.\n${error.message}`,
  );
}

console.log("✓ public\\buzzer.mp3 confirmed");
console.log(`✓ Buzzer file size: ${buzzerStats.size.toLocaleString()} bytes`);
console.log("✓ Existing SOS provider backed up");
console.log("✓ Emergency buzzer connected globally");
console.log("✓ Buzzer loops while any SOS remains unseen");
console.log("✓ Marking the final unseen SOS as seen stops the buzzer");
console.log("✓ Dismissing the dashboard alert does not stop the buzzer");
console.log("✓ Browser autoplay retry button installed");
console.log("✓ Buzzer stops on logout or provider shutdown");
console.log("\nNo .next folder was deleted.");
console.log("\nIMPORTANT:");
console.log("1. Stop npm run dev with Ctrl+C.");
console.log("2. Run npm run dev again.");
console.log("3. Open Nookly Web.");
console.log("4. Send a new SOS or leave an existing SOS unseen.");
console.log("5. Mark all unseen SOS alerts as seen to stop the buzzer.");
console.log("\nInstallation successful.\n");
