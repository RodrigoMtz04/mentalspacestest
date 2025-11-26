import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerClientErrorHandlers } from "./lib/logger";
import { applySavedTheme } from "@/lib/theme";

registerClientErrorHandlers();
applySavedTheme();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
