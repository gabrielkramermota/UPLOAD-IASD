import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Aside from "./components/aside/aside";
import { Toaster } from "sonner";
import { useSettings } from "./lib/useSettings";
import Tutorial from "./components/Tutorial/Tutorial";
import { hasSeenWelcome } from "./lib/app-store";
import UpdateChecker from "./components/UpdateChecker";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isWelcomePage = location.pathname === "/welcome";
  
  // Carregar configurações para aplicar tema
  try {
    useSettings();
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }

  // Verificar se deve redirecionar para welcome na primeira execução
  useEffect(() => {
    if (!isWelcomePage && location.pathname === "/") {
      hasSeenWelcome().then((seen) => {
        if (!seen) {
          // Se não viu, redirecionar para welcome
          navigate("/welcome", { replace: true });
        }
      }).catch(() => {
        // Em caso de erro, redirecionar para welcome (assumir primeira execução)
        navigate("/welcome", { replace: true });
      });
    }
  }, [location.pathname, isWelcomePage, navigate]);

  // Se for página de boas-vindas, não mostrar sidebar
  if (isWelcomePage) {
    return (
      <>
        <UpdateChecker />
        <Outlet />
        <Toaster position="bottom-right" richColors duration={3000} closeButton />
      </>
    );
  }

  return (
    <>
      <UpdateChecker />
      <div className="flex">
        <Aside />

        <main className="flex-1 ml-64 p-6">
          <Outlet />
        </main>
        <Toaster position="bottom-right" richColors duration={3000} closeButton />
      </div>
      <Tutorial />
    </>
  );
}
