import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fichario.css";
import "./styles/app.css";
import App from "./App";
import { UIProvider } from "./lib/ui";
import { SessionProvider } from "./lib/session";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UIProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </UIProvider>
  </StrictMode>,
);
