const fs = require("fs");
const path = require("path");

const root = process.cwd();
const themePath = path.join(root, "contexts", "theme-context.tsx");
const cssPath = path.join(root, "app", "globals.css");

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function replaceSection(source, startMarker, endMarker, replacement, label) {
  if (source.includes(replacement.trim())) {
    console.log(`• ${label} is already fixed`);
    return source;
  }

  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start === -1 || end === -1) {
    throw new Error(`Could not locate ${label}. No files were written.`);
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

let theme = readRequired(themePath);
let css = readRequired(cssPath);

/* 1. Add immediate DOM theme helpers. */
if (!theme.includes("function applyThemeToDocument(")) {
  const defaultAccentPattern =
    /const\s+defaultAccentColor:\s*AccentColor\s*=\s*["']orange["'];/;

  const match = theme.match(defaultAccentPattern);

  if (!match) {
    throw new Error(
      "Could not locate defaultAccentColor in theme-context.tsx. No files were written.",
    );
  }

  const helpers = `${match[0]}

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
}`;

  theme = theme.replace(defaultAccentPattern, helpers);
}

/* 2. Replace the delayed class add/remove inside the effect. */
if (!theme.includes("applyThemeToDocument(currentTheme);")) {
  const classUpdatePattern =
    /if\s*\(\s*currentTheme\s*===\s*["']dark["']\s*\)\s*\{\s*root\.classList\.add\(\s*["']dark["']\s*\);\s*\}\s*else\s*\{\s*root\.classList\.remove\(\s*["']dark["']\s*\);\s*\}/m;

  if (!classUpdatePattern.test(theme)) {
    throw new Error(
      "Could not locate the currentTheme class update. No files were written.",
    );
  }

  theme = theme.replace(
    classUpdatePattern,
    "applyThemeToDocument(currentTheme);",
  );
}

/* 3. Make the header button toggle directly between light and dark. */
theme = replaceSection(
  theme,
  "  const toggleTheme = () => {",
  "\n\n  const handleSetTheme",
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

/* 4. Keep Settings theme choices immediate too. */
theme = replaceSection(
  theme,
  "  const handleSetTheme = (newTheme: Theme) => {",
  "\n\n  const handleSetFollowDeviceTheme",
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
  "Settings theme selection",
);

theme = replaceSection(
  theme,
  "  const handleSetFollowDeviceTheme = (follow: boolean) => {",
  "\n\n  const handleSetAccentColor",
  `  const handleSetFollowDeviceTheme = (follow: boolean) => {
    const nextTheme = follow ? getSystemTheme() : resolvedTheme;

    applyThemeToDocument(nextTheme);
    setResolvedTheme(nextTheme);
    setFollowDeviceTheme(follow);
    setTheme(follow ? "system" : nextTheme);

    localStorage.setItem("theme", follow ? "system" : nextTheme);
    localStorage.setItem("followDeviceTheme", String(follow));
  };`,
  "follow-device theme control",
);

/* 5. Remove the expensive transition from every element. */
if (!css.includes("html.theme-switching *")) {
  const globalTransitionPattern =
    /\/\*\s*Smooth transitions\s*\*\/\s*\*\s*\{\s*transition:\s*background-color\s+0\.3s\s+ease,\s*border-color\s+0\.3s\s+ease,\s*color\s+0\.3s\s+ease,\s*box-shadow\s+0\.3s\s+ease;\s*\}/m;

  if (!globalTransitionPattern.test(css)) {
    throw new Error(
      "Could not locate the global transition rule in globals.css. No files were written.",
    );
  }

  css = css.replace(
    globalTransitionPattern,
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
  );
}

fs.writeFileSync(themePath, theme, "utf8");
fs.writeFileSync(cssPath, css, "utf8");

console.log("✓ Theme now applies immediately when the icon is clicked");
console.log("✓ Header icon switches directly between light and dark");
console.log("✓ Removed the page-wide staggered 0.3s transition");
console.log("✓ System theme remains available from Settings");
