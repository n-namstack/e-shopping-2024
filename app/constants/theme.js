export const COLORS = {
  // Primary colors inspired by Namibian landscape
  primary: "#6366F1", // Indigo brand color
  secondary: "#8B5CF6", // Indigo secondary
  accent: "#6366F1", // Indigo accent
  namStackMainColor: "#6366F1",

  // Background colors
  background: "#FFFFFF",
  surfaceLight: "#F5F5F5",
  surfaceMedium: "#E0E0E0",

  // Text colors
  textPrimary: "#263238",
  textSecondary: "#546E7A",
  textLight: "#78909C",
  textLighter: "#666666",

  // Status colors
  success: "#2E7D32",
  error: "#C62828",
  warning: "#F9A825",
  info: "#1565C0",
  facebookColor: "#0c64fc",
  blueColor: "#6366F1",

  // Gradient colors
  gradientStart: "#6366F1",
  gradientEnd: "#8B5CF6",

  // Additional UI colors
  border: "#E0E0E0",
  divider: "#EEEEEE",
  shadow: "rgba(0, 0, 0, 0.1)",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Semantic colors
  link: "#6366F1",
  focus: "#6366F1",

  // Brand colors
  white: "#FFFFFF",
  black: "#000000",
};

// Dark theme colors starts
export const LIGHT_THEME = {
  background: "#FFFFFF",
  text: "#000000",
  card: "#F8F8F8",
  primary: "#6366F1",
};

export const DARK_THEME = {
  background: "#121212",
  text: "#FFFFFF",
  card: "#1E1E1E",
  primary: "#6366F1",
};
// Dark theme color5 ends

export const FONTS = {
  regular: "Jost_400Regular",
  medium: "Jost_500Medium",
  semiBold: "Jost_600SemiBold",
  bold: "Jost_700Bold",
};

export const SIZES = {
  // Base sizing
  base: 8,
  small: 12,
  medium: 16,
  large: 24,
  extraLarge: 32,

  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body1: 16,
  body2: 14,
  caption: 12,

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // Border radius
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 999,
  },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
};

export default { COLORS, FONTS, SIZES, SHADOWS, LIGHT_THEME, DARK_THEME };
