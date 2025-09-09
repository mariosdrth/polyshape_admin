import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { LoadingProvider } from "./ui/spinner/LoadingProvider";
import { LoadingOverlay } from "./components/LoadingOverlay";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LoadingProvider>
      <LoadingOverlay />
      <App />
    </LoadingProvider>
  </StrictMode>,
);
