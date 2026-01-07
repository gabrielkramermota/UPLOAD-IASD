import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

try {
  ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
  ).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Erro ao renderizar aplicação:", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: #fee; border: 2px solid #fcc; border-radius: 8px; padding: 20px; max-width: 600px;">
          <h2 style="color: #c00; margin-bottom: 10px;">Erro ao carregar aplicação</h2>
          <p style="color: #800; margin-bottom: 20px;">${error instanceof Error ? error.message : "Erro desconhecido"}</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #c00; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Recarregar Página
          </button>
        </div>
      </div>
    `;
  }
}
