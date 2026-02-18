// src/theme.ts
export const colors = {
  background: "#f1f1f1", // deep slate/near-black
  surface: "#fff",
  surfaceSoft: "#f1f1f1",
  primary: "#0e953fff", // green accent
  primarySoft: "#2cc263db",
  text: "#0b0b0bff",
  textMuted: "#525252ff",
  border: "#41414120",
  error: "#f03e3eff",
  buttonDisabled: "#dededeff",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const boxShadows = {
  sm: "0 1px 3px rgba(0,0,0,0.1)",
  md: "0 4px 6px rgba(0,0,0,0.1)",
  lg: "0 10px 15px rgba(0,0,0,0.1)",
};

export const todayTheme = {
  hero: {
    neutral: {
      gradient: ["#64c39b", "#14b270"],
      bubbles: ["#cbd5f5", "#e2e8f0", "#f1f5f9"],
      border: colors.border,
    },
    due: {
      gradient: ["#c1e9f6", "#92def8"],
      bubbles: ["#b6ebfd", "#91d9f1", "#b2e4f5"],
      border: "rgba(14,149,63,0.35)",
    },
    overdue: {
      gradient: ["#e88d8d", "#e15555"],
      bubbles: ["#fca5a5", "#fecaca", "#fee2e2"],
      border: "rgba(240,62,62,0.35)",
    },
    iconTint: "rgba(255, 255, 255, 0.75)",
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.85)",
      muted: "rgba(255, 255, 255, 0.84)",
    },
  },
  streak: {
    background: "rgba(14,149,63,0.12)",
  },
  taskStatus: {
    dueBackground: "rgba(14,149,63,0.15)",
    overdueBackground: "rgba(240,62,62,0.15)",
  },
  stats: {
    primary: {
      background: "rgba(43, 195, 99, 0.87)",
      border: "rgba(14,149,63,0.3)",
    },
    warning: {
      background: "rgba(240, 62, 62, 0.75)",
      border: "rgba(240,62,62,0.25)",
    },
    neutral: {
      background: "rgba(77, 237, 203, 0.87)",
      border: "rgba(82,82,82,0.2)",
    },
  },
} as const;
