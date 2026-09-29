import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.tsx";

// Tell the MAX host we're ready to be shown as soon as possible — before
// mount, not after, since the host's own loading chrome is what covers the
// first paint either way.
window.WebApp?.ready?.();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
