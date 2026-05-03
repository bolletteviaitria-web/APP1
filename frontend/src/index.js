import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import "@/index.css";
import App from "@/App";

// Global 401 interceptor: clears stale JWT so the user never gets stuck in a
// zombie auth state (e.g. old token from a previous admin email still in localStorage).
axios.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      try { localStorage.removeItem("token"); } catch (_) {}
      delete axios.defaults.headers.common["Authorization"];
      if (typeof window !== "undefined") {
        const p = window.location.pathname;
        if (p.startsWith("/admin") || p.startsWith("/booking")) {
          window.location.assign("/login");
        }
      }
    }
    return Promise.reject(err);
  }
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
