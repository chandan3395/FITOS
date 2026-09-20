import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

// The approved Black + Champagne palette is the only supported theme; no partial dark toggle.
export const ThemeProvider = ({ children }) => {
  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);
