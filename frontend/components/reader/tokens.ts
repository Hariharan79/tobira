/**
 * Theme tokens for the reader — zine aesthetic with dark/light modes.
 * Adapted from Claude Design spec for Tobira's Tailwind setup.
 */
export type ReaderTheme = "dark" | "light";

export interface ReaderTokens {
  bg: string;
  ink: string;
  dim: string;
  line: string;
  lineStrong: string;
  chip: string;
  accent: string;
  accentInk: string;
  shadow: string;
}

export function tokens(theme: ReaderTheme): ReaderTokens {
  return theme === "dark"
    ? {
        bg: "#0E0E0E",
        ink: "#F2EFE7",
        dim: "rgba(242,239,231,0.45)",
        line: "rgba(242,239,231,0.18)",
        lineStrong: "rgba(242,239,231,0.85)",
        chip: "rgba(242,239,231,0.08)",
        accent: "#FF3B30",
        accentInk: "#0E0E0E",
        shadow: "rgba(242,239,231,0.9)",
      }
    : {
        bg: "#F2EFE7",
        ink: "#0E0E0E",
        dim: "rgba(14,14,14,0.50)",
        line: "rgba(14,14,14,0.18)",
        lineStrong: "rgba(14,14,14,0.85)",
        chip: "rgba(14,14,14,0.06)",
        accent: "#FF3B30",
        accentInk: "#F2EFE7",
        shadow: "rgba(14,14,14,0.9)",
      };
}

/** Zine-style button base styles */
export function zineButtonStyle(t: ReaderTokens, primary = false) {
  return {
    background: primary ? t.accent : t.bg,
    color: primary ? t.accentInk : t.ink,
    border: `2px solid ${t.ink}`,
    boxShadow: `4px 4px 0 0 ${t.shadow}`,
    fontFamily: "'Geist Sans', system-ui, sans-serif",
    cursor: "pointer",
    transition: "transform 80ms, box-shadow 80ms",
  } as const;
}
