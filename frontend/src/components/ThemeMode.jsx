import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "ledgerly-theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return ["system", "light", "dark"].includes(saved) ? saved : "system";
  });

  useEffect(() => {
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = theme === "system" ? (systemPreference.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
    };

    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme();
    systemPreference.addEventListener("change", applyTheme);
    return () => systemPreference.removeEventListener("change", applyTheme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeModeControl() {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <label className="theme-control">
      <span>Theme</span>
      <select aria-label="Color theme" value={theme} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
