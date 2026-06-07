import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppRoutes from "./routes/AppRoutes";
import QASwitcher from "./components/dev/QASwitcher";

// Development-only QA quick-login panel. Rendered ONLY when
// VITE_SHOW_QA_TOOLS === "true". With the flag unset/false (the default,
// and always in production) this is a compile-time constant false, so Vite
// tree-shakes both the check and the QASwitcher import out of the bundle.
// It uses REAL logins against seeded accounts — no auth bypass.
const SHOW_QA_TOOLS = import.meta.env.VITE_SHOW_QA_TOOLS === "true";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          {SHOW_QA_TOOLS && <QASwitcher />}
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
