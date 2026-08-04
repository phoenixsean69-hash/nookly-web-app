const fs = require("fs");
const path = require("path");

const filePath = path.join(
  process.cwd(),
  "components",
  "dashboard",
  "sidebar.tsx",
);

if (!fs.existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`);
}

let source = fs.readFileSync(filePath, "utf8");

const oldMobileToggleCondition = `{isMobile && (
        <button
          type="button"
          onClick={toggleMobileSidebar}`;

const newMobileToggleCondition = `{isMobile && !isMobileOpen && (
        <button
          type="button"
          onClick={toggleMobileSidebar}`;

if (source.includes(newMobileToggleCondition)) {
  console.log("• Outside mobile toggle already hides while sidebar is open");
} else if (source.includes(oldMobileToggleCondition)) {
  source = source.replace(
    oldMobileToggleCondition,
    newMobileToggleCondition,
  );
} else {
  throw new Error(
    "Could not find the mobile sidebar toggle block. No file was written.",
  );
}

const oldHeaderEnd = `          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">Nookly</p>
              <p className="truncate text-xs text-blue-200">
                Organization Portal
              </p>
            </div>
          )}
        </div>`;

const newHeaderEnd = `          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">Nookly</p>
              <p className="truncate text-xs text-blue-200">
                Organization Portal
              </p>
            </div>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-blue-100 transition hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>`;

if (source.includes(newHeaderEnd)) {
  console.log("• Sidebar header close button already exists");
} else if (source.includes(oldHeaderEnd)) {
  source = source.replace(oldHeaderEnd, newHeaderEnd);
} else {
  throw new Error(
    "Could not find the sidebar branding header block. No file was written.",
  );
}

fs.writeFileSync(filePath, source, "utf8");

console.log("✓ Removed the close icon from on top of the Nookly logo");
console.log("✓ Added a separate close button at the right of the sidebar header");
console.log("✓ The floating menu button now appears only while the sidebar is closed");
