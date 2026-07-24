import { useTheme } from "@/contexts/theme-context";
import { getAccentClasses } from "@/lib/theme-utils";

export function useThemeClasses() {
  const { accentColor } = useTheme();
  return getAccentClasses(accentColor);
}