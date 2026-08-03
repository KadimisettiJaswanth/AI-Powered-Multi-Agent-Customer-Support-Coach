import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

// Minimal MUI theme, deliberately quiet -- Tailwind carries the visual identity,
// MUI is only used for a few complex interactive widgets (tables, dialogs, selects).
const theme = createTheme({
  palette: {
    primary: { main: "#0F8B8D" },
    error: { main: "#C1554D" },
    warning: { main: "#E8A33D" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  shape: { borderRadius: 8 },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
