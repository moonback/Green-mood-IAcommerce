import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { SEOProvider } from "./seo/SEOProvider.tsx";
import { initMonitoring } from "./lib/monitoring.ts";
import "./index.css";

initMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <SEOProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </SEOProvider>
    </ErrorBoundary>
  </StrictMode>,
);
