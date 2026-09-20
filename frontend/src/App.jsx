import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { UnreadProvider } from "./contexts/UnreadContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppRoutes from "./routes/AppRoutes";

// Keep the existing route tree; the data router supplies navigation blocking
// so unsaved BYOT drafts survive cancelled Back/Forward as well as link clicks.
const router = createBrowserRouter([{ path: "*", element: <AppRoutes /> }]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <UnreadProvider>
            <RouterProvider router={router} />
          </UnreadProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
