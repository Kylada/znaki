import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

try {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (err: any) {
  document.getElementById("root")!.innerHTML = `
    <div style="color:#ff6b6b;background:#111;min-height:100vh;padding:40px;font-family:monospace">
      <h1 style="font-size:24px;margin-bottom:16px">⚠️ Ошибка запуска</h1>
      <pre style="white-space:pre-wrap;font-size:12px;color:#ccc">${err?.message}\n${err?.stack}</pre>
    </div>
  `;
}
