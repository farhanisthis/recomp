// RECOMP design tokens (light + dark). Keys shared by both schemes.
import { useMemo, useSyncExternalStore } from "react";
import { Appearance, ImageStyle, StyleSheet, TextStyle, useColorScheme, ViewStyle } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F7F4FF", // lavender screen background
  onSurface: "#241B36",
  surfaceSecondary: "#FFFFFF", // cards
  onSurfaceSecondary: "#241B36",
  surfaceTertiary: "#F0EAFF", // inputs, chips, soft purple fills
  onSurfaceTertiary: "#5B5170",
  surfaceInverse: "#241B36",
  onSurfaceInverse: "#FFFFFF",
  muted: "#817A91",

  brand: "#8B5CF6",
  onBrand: "#FFFFFF",
  brandPrimary: "#7C4DEB",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E9E0FF",
  onBrandSecondary: "#6D42D8",
  brandTertiary: "#F0EAFF",
  onBrandTertiary: "#6D42D8",
  brandDeep: "#6D42D8",

  protein: "#9565ED",
  carbs: "#F4AA57",
  fat: "#4FBF94",
  water: "#60B5F9",
  sleep: "#7B6CF0",
  steps: "#4FBF94",
  weightLine: "#7C4DEB",
  fatLine: "#F4AA57",

  success: "#22A06B",
  onSuccess: "#FFFFFF",
  warning: "#C97A1A",
  onWarning: "#FFFFFF",
  error: "#D64545",
  onError: "#FFFFFF",
  info: "#3A8BDD",
  onInfo: "#FFFFFF",

  border: "#ECE6FA",
  borderStrong: "#C9B8F5",
  divider: "#F0EBFA",
  shadow: "#6D42D8",
  overlay: "rgba(36,27,54,0.45)",
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  surface: "#15111F",
  onSurface: "#F2EEFB",
  surfaceSecondary: "#211B30",
  onSurfaceSecondary: "#F2EEFB",
  surfaceTertiary: "#2C2440",
  onSurfaceTertiary: "#C9C0DD",
  surfaceInverse: "#F2EEFB",
  onSurfaceInverse: "#15111F",
  muted: "#9D95B2",

  brand: "#A383F7",
  onBrand: "#15111F",
  brandPrimary: "#9470F5",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#342A52",
  onBrandSecondary: "#CDBBFF",
  brandTertiary: "#2C2440",
  onBrandTertiary: "#CDBBFF",
  brandDeep: "#B79CFA",

  protein: "#AB85F5",
  carbs: "#F2B46E",
  fat: "#6FD3AC",
  water: "#7CC2FA",
  sleep: "#958AF5",
  steps: "#6FD3AC",
  weightLine: "#B79CFA",
  fatLine: "#F2B46E",

  success: "#45C08A",
  onSuccess: "#0E1A14",
  warning: "#E3A04A",
  onWarning: "#1A1206",
  error: "#F07272",
  onError: "#1F0B0B",
  info: "#6AAEF0",
  onInfo: "#08121D",

  border: "#2F2843",
  borderStrong: "#4A3F69",
  divider: "#2A2339",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.6)",
};

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export type ThemePref = "light" | "dark" | "system";

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

let currentPref: ThemePref = "light";
const prefSubs = new Set<() => void>();
export function applyThemePref(pref: ThemePref) {
  currentPref = pref;
  setColorScheme(pref === "system" ? null : pref);
  prefSubs.forEach((f) => f());
}
function subscribePref(f: () => void) {
  prefSubs.add(f);
  return () => { prefSubs.delete(f); };
}


export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const pref = useSyncExternalStore(subscribePref, () => currentPref, () => currentPref);
  const scheme: ColorScheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return { scheme, colors: themes[scheme] ?? light };
}

export function makeStyles<T extends { [k: string]: ViewStyle | TextStyle | ImageStyle }>(factory: (colors: ThemeColors) => T): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
