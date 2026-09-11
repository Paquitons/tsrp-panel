import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { queryClient } from "./queryClient.js";
import { captureManualDeepLink } from "./manualVerifyDeepLink.js";
import "./styles.css";

// Before React renders, and before anything redirects to Discord to sign
// in: the parameter does not survive that round trip, so it has to be
// taken off the URL and put somewhere that does.
captureManualDeepLink();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
