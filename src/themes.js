// ============================================================
// DEV-ONLY THEME PRESETS
// Temporary: for picking a color palette. Once one is chosen, this file
// and the ThemeSwitcher component get removed and the winning values move
// directly into styles.css as the permanent palette.
// ============================================================

export const THEMES = {
  midnight: {
    label: "Midnight Blue",
    vars: {
      "--bg-gradient-start": "#14171f",
      "--bg-gradient-end": "#0b0d12",
      "--card-bg": "#12141b",
      "--sidebar-bg": "#12141b",
      "--accent": "#5865f2",
      "--accent-hover": "#4752c4",
      "--btn-green-1": "#4caf82", "--btn-green-2": "#3a8f68",
      "--btn-orange-1": "#d99a52", "--btn-orange-2": "#c17f3a",
      "--btn-red-1": "#c96a64", "--btn-red-2": "#b3524c",
      "--btn-blue-1": "#6670d6", "--btn-blue-2": "#545dbd",
      "--btn-pink-1": "#c07394", "--btn-pink-2": "#a75c7c",
    },
  },
  slate: {
    label: "Slate & Teal",
    vars: {
      "--bg-gradient-start": "#161c1f",
      "--bg-gradient-end": "#0a0e10",
      "--card-bg": "#141a1d",
      "--sidebar-bg": "#141a1d",
      "--accent": "#2fa89a",
      "--accent-hover": "#268a7e",
      "--btn-green-1": "#3fae8f", "--btn-green-2": "#2f8f74",
      "--btn-orange-1": "#c4924f", "--btn-orange-2": "#a97838",
      "--btn-red-1": "#b3625e", "--btn-red-2": "#984f4b",
      "--btn-blue-1": "#4d8fbf", "--btn-blue-2": "#3d739c",
      "--btn-pink-1": "#a5738f", "--btn-pink-2": "#8a5c76",
    },
  },
  forest: {
    label: "Forest",
    vars: {
      "--bg-gradient-start": "#151a15", "--bg-gradient-end": "#0c0f0c",
      "--card-bg": "#131813", "--sidebar-bg": "#131813",
      "--accent": "#5a9b5f", "--accent-hover": "#4a8250",
      "--btn-green-1": "#5faa62", "--btn-green-2": "#478a4c",
      "--btn-orange-1": "#c19a4c", "--btn-orange-2": "#a67f38",
      "--btn-red-1": "#ad5f52", "--btn-red-2": "#914b40",
      "--btn-blue-1": "#5c8f7a", "--btn-blue-2": "#4a7563",
      "--btn-pink-1": "#9c7f5c", "--btn-pink-2": "#82684a",
    },
  },
  royal: {
    label: "Royal Purple",
    vars: {
      "--bg-gradient-start": "#181321", "--bg-gradient-end": "#0d0a13",
      "--card-bg": "#161020", "--sidebar-bg": "#161020",
      "--accent": "#8a63d6", "--accent-hover": "#7350b8",
      "--btn-green-1": "#5a9b78", "--btn-green-2": "#488062",
      "--btn-orange-1": "#c48f5a", "--btn-orange-2": "#a97645",
      "--btn-red-1": "#b3597f", "--btn-red-2": "#984868",
      "--btn-blue-1": "#7d6bd6", "--btn-blue-2": "#6456b8",
      "--btn-pink-1": "#a562a8", "--btn-pink-2": "#8a4f8c",
    },
  },
  warm: {
    label: "Warm Neutral",
    vars: {
      "--bg-gradient-start": "#1a1715", "--bg-gradient-end": "#100e0c",
      "--card-bg": "#171310", "--sidebar-bg": "#171310",
      "--accent": "#c98b4a", "--accent-hover": "#ab7439",
      "--btn-green-1": "#7a9b5c", "--btn-green-2": "#63804a",
      "--btn-orange-1": "#cf9a52", "--btn-orange-2": "#b37f3d",
      "--btn-red-1": "#bd6255", "--btn-red-2": "#9f4f44",
      "--btn-blue-1": "#7893a8", "--btn-blue-2": "#63798c",
      "--btn-pink-1": "#b5806e", "--btn-pink-2": "#996a5a",
    },
  },
  ocean: {
    label: "Ocean",
    vars: {
      "--bg-gradient-start": "#0f1a20", "--bg-gradient-end": "#080e12",
      "--card-bg": "#0e181d", "--sidebar-bg": "#0e181d",
      "--accent": "#3d9bc4", "--accent-hover": "#3081a3",
      "--btn-green-1": "#3fa88f", "--btn-green-2": "#308a74",
      "--btn-orange-1": "#c2934f", "--btn-orange-2": "#a67838",
      "--btn-red-1": "#b06258", "--btn-red-2": "#944f47",
      "--btn-blue-1": "#4b9dcf", "--btn-blue-2": "#3a80ab",
      "--btn-pink-1": "#5c8fa5", "--btn-pink-2": "#4a748a",
    },
  },
  monochrome: {
    label: "Monochrome",
    vars: {
      "--bg-gradient-start": "#161616", "--bg-gradient-end": "#0c0c0c",
      "--card-bg": "#141414", "--sidebar-bg": "#141414",
      "--accent": "#8a8a8a", "--accent-hover": "#707070",
      "--btn-green-1": "#5c5c5c", "--btn-green-2": "#484848",
      "--btn-orange-1": "#6b6b6b", "--btn-orange-2": "#575757",
      "--btn-red-1": "#7a5555", "--btn-red-2": "#634444",
      "--btn-blue-1": "#5c5c5c", "--btn-blue-2": "#484848",
      "--btn-pink-1": "#6b6b6b", "--btn-pink-2": "#575757",
    },
  },
  charcoal: {
    label: "Charcoal Neutral",
    vars: {
      "--bg-gradient-start": "#17181a", "--bg-gradient-end": "#0d0e0f",
      "--card-bg": "#161718", "--sidebar-bg": "#161718",
      "--accent": "#7a8a99", "--accent-hover": "#647380",
      "--btn-green-1": "#5a7a68", "--btn-green-2": "#486356",
      "--btn-orange-1": "#8a7455", "--btn-orange-2": "#725f47",
      "--btn-red-1": "#87605c", "--btn-red-2": "#6f4d4a",
      "--btn-blue-1": "#5c7080", "--btn-blue-2": "#4a5c6b",
      "--btn-pink-1": "#75677a", "--btn-pink-2": "#605365",
    },
  },
};

export function applyTheme(key) {
  const theme = THEMES[key];
  if (!theme) return;
  for (const [prop, value] of Object.entries(theme.vars)) {
    document.documentElement.style.setProperty(prop, value);
  }
  localStorage.setItem("tsrp_theme", key);
}

export function loadSavedTheme() {
  const saved = localStorage.getItem("tsrp_theme");
  applyTheme(saved && THEMES[saved] ? saved : "midnight");
  return saved && THEMES[saved] ? saved : "midnight";
}
