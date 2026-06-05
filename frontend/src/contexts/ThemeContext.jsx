import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

// Scaffold only — logic added in a later phase
export const ThemeProvider = ({ children }) => {
  return <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);
