import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

// The approved light palette is the only supported theme; no partial dark toggle.
export const ThemeProvider = ({ children }) => {
  return <ThemeContext.Provider value={{ theme: "light" }}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);
