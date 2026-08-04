const fs = require("fs");
const path = require("path");

const root = process.cwd();
const headerPath = path.join(root, "components", "dashboard", "header.tsx");
const sidebarPath = path.join(root, "components", "dashboard", "sidebar.tsx");

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) {
    console.log(`• ${label} is already fixed`);
    return source;
  }

  const firstIndex = source.indexOf(oldText);
  if (firstIndex === -1) {
    throw new Error(`Could not find ${label}. No files were written.`);
  }

  const secondIndex = source.indexOf(oldText, firstIndex + oldText.length);
  if (secondIndex !== -1) {
    throw new Error(`Found more than one ${label}. No files were written.`);
  }

  return source.slice(0, firstIndex) + newText + source.slice(firstIndex + oldText.length);
}

let header = read(headerPath);
let sidebar = read(sidebarPath);

header = replaceOnce(
  header,
  '<div className="px-3 py-2 flex items-center justify-between">',
  '<div className="flex min-h-14 items-center justify-between py-2 pl-16 pr-3">',
  "mobile header layout"
);

sidebar = replaceOnce(
  sidebar,
  'className="fixed left-4 top-4 z-[60] rounded-xl bg-[var(--accent-500)] p-2.5 text-white shadow-lg md:hidden"',
  'className="fixed left-3 top-2.5 z-[60] flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-500)] text-white shadow-lg md:hidden"',
  "mobile sidebar toggle position"
);

fs.writeFileSync(headerPath, header, "utf8");
fs.writeFileSync(sidebarPath, sidebar, "utf8");

console.log("✓ Reserved space for the mobile sidebar toggle");
console.log("✓ Aligned the toggle cleanly inside the header height");
console.log("✓ The organization name now truncates without overlapping the toggle");
