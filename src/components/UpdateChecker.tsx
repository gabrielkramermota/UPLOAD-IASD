import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export default function UpdateChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  // Verificar atualizações ao montar o componente
  useEffect(() => {
    // Verificar atualizações após 3 segundos (dar tempo para o app carregar)
    const timer = setTimeout(() => {
      checkForUpdates(true); // Silent check
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Verificar atualizações periodicamente (a cada 6 horas)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (!lastCheckTime || now - lastCheckTime > sixHours) {
        checkForUpdates(true); // Silent check
      }
    }, 60 * 60 * 1000); // Verificar a cada hora

    return () => clearInterval(interval);
  }, [lastCheckTime]);

  const checkForUpdates = async (silent: boolean = false) => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      // Obter versão atual
      const currentVersion = await invoke<string>("get_app_version");
      
      // Verificar atualizações
      const response = await invoke<string>("check_for_updates", {
        currentVersion: currentVersion,
      });

      const updateData: UpdateInfo = JSON.parse(response);
      setLastCheckTime(Date.now());

      // Se há atualização disponível e não é check silencioso, mostrar notificação
      if (updateData.hasUpdate && !silent) {
        showUpdateNotification(updateData);
      } else if (updateData.hasUpdate && silent) {
        // Check silencioso: mostrar notificação persistente apenas uma vez
        const lastUpdateShown = localStorage.getItem("lastUpdateShown");
        if (lastUpdateShown !== updateData.latestVersion) {
          showUpdateNotification(updateData, true);
          localStorage.setItem("lastUpdateShown", updateData.latestVersion);
        }
      }
    } catch (error: any) {
      // Log apenas em desenvolvimento ou se for erro crítico
      if (process.env.NODE_ENV === 'development') {
        console.error("Erro ao verificar atualizações:", error);
      }
      // Não mostrar erro para verificação silenciosa (background check)
      if (!silent) {
        // Só mostrar erro se não for um erro de acesso/API
        const errorMsg = error?.toString() || "";
        if (!errorMsg.includes("403") && !errorMsg.includes("Forbidden") && !errorMsg.includes("404")) {
          toast.error("Erro ao verificar atualizações. Tente novamente mais tarde.");
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const showUpdateNotification = (update: UpdateInfo, persistent: boolean = false) => {
    const duration = persistent ? Infinity : 10000; // 10 segundos ou infinito

    toast.info(
      <div className="space-y-2">
        <div className="font-semibold">Nova versão disponível!</div>
        <div className="text-sm">
          Versão {update.currentVersion} → {update.latestVersion}
        </div>
        {update.releaseName && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {update.releaseName}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              if (update.downloadUrl) {
                try {
                  await openUrl(update.downloadUrl);
                  toast.success("Abrindo página de download...");
                } catch (error) {
                  console.error("Erro ao abrir URL:", error);
                  toast.error("Erro ao abrir página de download");
                }
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            Baixar Agora
          </button>
          <button
            onClick={() => {
              toast.dismiss();
            }}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors"
          >
            Mais Tarde
          </button>
        </div>
      </div>,
      {
        duration,
        id: "update-notification",
        position: "bottom-right",
      }
    );
  };

  // Componente não renderiza nada visualmente
  // As atualizações são mostradas via toast notifications
  return null;
}
