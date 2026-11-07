import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import Provider from "./app/Context/Provider.jsx";

const PRELOAD_RELOAD_KEY = "vite:preload-reload-at";

window.addEventListener("vite:preloadError", (event) => {
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0);
  if (Date.now() - lastReload < 30_000) return;

  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider>
        <App />
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
