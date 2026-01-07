import { Outlet } from "react-router-dom";
import Aside from "./components/aside/aside";
import { Toaster } from "sonner";
import { useSettings } from "./lib/useSettings";

export default function App() {
  // Carregar configurações para aplicar tema
  try {
    useSettings();
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }

  return (
    <div className="flex">
      <Aside />

      <main className="flex-1 ml-64 p-6">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors duration={3000} closeButton />
    </div>
  );
}
