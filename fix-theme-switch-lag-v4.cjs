const fs = require("fs");
const path = require("path");

const root = process.cwd();
const themePath = path.join(root, "contexts", "theme-context.tsx");
const cssPath = path.join(root, "app", "globals.css");

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";

  return {
    eol,
    text: raw.replace(/\r\n/g, "\n"),
  };
}

function replaceRegex(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Could not locate ${label}. Nothing was written.`);
  }

  return source.replace(pattern, replacement);
}

const themeFile = readFile(themePath);
const cssFile = readFile(cssPath);

let theme = themeFile.text;
let css = cssFile.text;

/* Add synchronous DOM theme helpers once. */
if (!theme.includes("function applyThemeToDocument(")) {
  theme = replaceRegex(
    theme,
    /const defaultAccentColor:\s*AccentColor\s*=\s*["']orange["'];/,
    `const defaultAccentColor: AccentColor = "orange";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeToDocument(nextTheme: "light" | "dark") {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.classList.add("theme-switching");
  root.classList.toggle("dark", nextTheme === "dark");
  root.style.colorScheme = nextTheme;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
}`,
    "default accent declaration",
  );
}

/* Replace only the actual class add/remove section inside the existing effect. */
if (!theme.includes("applyThemeToDocument(currentTheme);")) {
  theme = replaceRegex(
    theme,
    /if\s*\(\s*currentTheme\s*===\s*["']dark["']\s*\)\s*\{\s*root\.classList\.add\(\s*["']dark["']\s*\);\s*\}\s*else\s*\{\s*root\.classList\.remove\(\s*["']dark["']\s*\);\s*\}/m,
    "applyThemeToDocument(currentTheme);",
    "document theme class update",
  );
}

/* Apply device-theme changes immediately. */
if (!theme.includes("applyThemeToDocument(nextTheme);\n        setResolvedTheme(nextTheme);")) {
  theme = replaceRegex(
    theme,
    /const handleThemeChange = \(e: MediaQueryListEvent\) => \{\s*if \(followDeviceTheme\) \{\s*setResolvedTheme\(e\.matches \? ["']dark["'] : ["']light["']\);\s*\}\s*\};/m,
    `const handleThemeChange = (e: MediaQueryListEvent) => {
      if (followDeviceTheme) {
        const nextTheme = e.matches ? "dark" : "light";
        applyThemeToDocument(nextTheme);
        setResolvedTheme(nextTheme);
      }
    };`,
    "system theme listener",
  );
}

/* Header button: direct light <-> dark toggle. */
theme = replaceRegex(
  theme,
  /  const toggleTheme = \(\) => \{[\s\S]*?\n  \};(?=\n\n  const handleSetTheme)/,
  `  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

    applyThemeToDocument(nextTheme);
    setResolvedTheme(nextTheme);
    setTheme(nextTheme);
    setFollowDeviceTheme(false);

    localStorage.setItem("theme", nextTheme);
    localStorage.setItem("followDeviceTheme", "false");
  };`,
  "header theme toggle",
);

/* Settings theme picker: immediate application. */
theme = replaceRegex(
  theme,
  /  const handleSetTheme = \(newTheme: Theme\) => \{[\s\S]*?\n  \};(?=\n\n  const handleSetFollowDeviceTheme)/,
  `  const handleSetTheme = (newTheme: Theme) => {
    const nextResolvedTheme =
      newTheme === "system" ? getSystemTheme() : newTheme;

    applyThemeToDocument(nextResolvedTheme);
    setResolvedTheme(nextResolvedTheme);
    setTheme(newTheme);
    setFollowDeviceTheme(newTheme === "system");

    localStorage.setItem("theme", newTheme);
    localStorage.setItem(
      "followDeviceTheme",
      String(newTheme === "system"),
    );
  };`,
  "Settings theme setter",
);

theme = replaceRegex(
  theme,
  /  const handleSetFollowDeviceTheme = \(follow: boolean\) => \{[\s\S]*?\n  \};(?=\n\n  const handleSetAccentColor)/,
  `  const handleSetFollowDeviceTheme = (follow: boolean) => {
    const nextTheme = follow ? getSystemTheme() : resolvedTheme;

    applyThemeToDocument(nextTheme);
    setResolvedTheme(nextTheme);
    setFollowDeviceTheme(follow);
    setTheme(follow ? "system" : nextTheme);

    localStorage.setItem("theme", follow ? "system" : nextTheme);
    localStorage.setItem("followDeviceTheme", String(follow));
  };`,
  "follow-device theme setter",
);

/* Remove the costly transition from every element. */
if (!css.includes("html.theme-switching *")) {
  css = replaceRegex(
    css,
    /\/\*\s*Smooth transitions\s*\*\/\s*\*\s*\{\s*transition:\s*background-color\s+0\.3s\s+ease,\s*border-color\s+0\.3s\s+ease,\s*color\s+0\.3s\s+ease,\s*box-shadow\s+0\.3s\s+ease;\s*\}/m,
    `/* Theme changes should paint as one state instead of making every
   element animate separately. Components keep their own hover effects. */
html.theme-switching *,
html.theme-switching *::before,
html.theme-switching *::after {
  transition: none !important;
}

html,
body {
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

@media (prefers-reduced-motion: reduce) {
  html,
  body {
    transition: none;
  }
}`,
    "global theme transition rule",
  );
}

/* Final validation before either file is written. */
const validations = [
  [theme.includes("function applyThemeToDocument("), "theme helper"],
  [theme.includes("applyThemeToDocument(currentTheme);"), "theme effect"],
  [theme.includes('const nextTheme = resolvedTheme === "dark" ? "light" : "dark";'), "direct toggle"],
  [css.includes("html.theme-switching *"), "transition suppression"],
];

const failed = validations.find(([passed]) => !passed);

if (failed) {
  throw new Error(`Validation failed: ${failed[1]}. Nothing was written.`);
}

fs.writeFileSync(
  themePath,
  theme.replace(/\n/g, themeFile.eol),
  "utf8",
);

fs.writeFileSync(
  cssPath,
  css.replace(/\n/g, cssFile.eol),
  "utf8",
);

console.log("✓ Normalized Windows line endings before matching");
console.log("✓ Theme class now changes immediately");
console.log("✓ Header icon now switches directly between light and dark");
console.log("✓ System mode remains available in Settings");
console.log("✓ Removed the expensive transition from every DOM element");
