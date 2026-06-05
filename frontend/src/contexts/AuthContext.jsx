import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Scaffold only — logic added in a later phase
export const AuthProvider = ({ children }) => {
  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
