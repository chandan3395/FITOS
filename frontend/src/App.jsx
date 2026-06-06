import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppRoutes from "./routes/AppRoutes";
import { DEV_BYPASS } from "./lib/devAuth";
import DevRoleSwitcher from "./components/dev/DevRoleSwitcher";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          {/* Dev-only widget. In production builds DEV_BYPASS is a compile-time
              `false` so this branch is dead code and Vite tree-shakes it out. */}
          {DEV_BYPASS && <DevRoleSwitcher />}
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
