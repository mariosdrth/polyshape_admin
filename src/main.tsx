import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { Auth0Provider } from "@auth0/auth0-react";
import { BrowserRouter } from "react-router-dom";

const domain = "dev-xqk7wpt0s1kfxmwx.us.auth0.com";
const clientId = "Xvny4pDVfirU6pg2Wcxrp46kmXFXDVCf";

async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === "true") {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      serviceWorker: { url: "/mockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin + "/callback",
      }}
    >
      <BrowserRouter>
        <StrictMode>
          <App/>
        </StrictMode>
      </BrowserRouter>
    </Auth0Provider>
  );
});
