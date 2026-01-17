import { FiInfo, FiGithub, FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import { FaWhatsapp, FaGithub } from "react-icons/fa";
import { useState, useEffect } from "react";
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

export default function AboutPage() {
  const [currentVersion, setCurrentVersion] = useState<string>("2.1.0");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Obter versão atual ao carregar
    const loadVersion = async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI__" in window) {
          const version = await invoke<string>("get_app_version");
          setCurrentVersion(version);
        }
      } catch (error) {
        console.error("Erro ao obter versão:", error);
      }
    };
    loadVersion();
  }, []);
  const handleOpenLink = async (url: string) => {
    try {
      // Verificar se está no Tauri
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        await openUrl(url);
      } else {
        // Fallback para navegador
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Erro ao abrir link:", error);
      // Fallback final
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const version = await invoke<string>("get_app_version");
      const response = await invoke<string>("check_for_updates", {
        currentVersion: version,
      });

      const updateData: UpdateInfo = JSON.parse(response);
      setUpdateInfo(updateData);

      if (updateData.hasUpdate) {
        toast.success(
          `Nova versão disponível! Versão ${updateData.latestVersion}`,
          {
            duration: 5000,
          }
        );
      } else {
        toast.success("Você está usando a versão mais recente!", {
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error("Erro ao verificar atualizações:", error);
      const errorMsg = error?.toString() || "";
      
      // Mensagens de erro mais específicas
      if (errorMsg.includes("403") || errorMsg.includes("Forbidden")) {
        toast.error("Acesso negado ao verificar atualizações. O repositório pode estar privado ou há limitações de acesso.", {
          duration: 5000,
        });
      } else if (errorMsg.includes("404")) {
        toast.error("Repositório não encontrado. Verifique a configuração do sistema de atualizações.", {
          duration: 5000,
        });
      } else {
        toast.error("Erro ao verificar atualizações. Verifique sua conexão com a internet.", {
          duration: 5000,
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full overflow-hidden ring-4 ring-primary/20 flex items-center justify-center bg-primary/10">
            <FiInfo className="text-primary" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sobre o Sistema</h1>
            <p className="text-gray-500 mt-1">Upload IASD Desktop v{currentVersion}</p>
          </div>
        </div>

        {/* Verificação de Atualizações */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Verificar Atualizações</h3>
              <p className="text-sm text-gray-500 mt-1">
                {updateInfo?.hasUpdate
                  ? `Nova versão ${updateInfo.latestVersion} disponível!`
                  : "Verifique se há novas versões disponíveis"}
              </p>
            </div>
            {updateInfo?.hasUpdate && updateInfo.downloadUrl && (
              <button
                onClick={() => handleOpenLink(updateInfo.downloadUrl!)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FiCheckCircle />
                Baixar Atualização
              </button>
            )}
            <button
              onClick={checkForUpdates}
              disabled={isChecking}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw className={isChecking ? "animate-spin" : ""} />
              {isChecking ? "Verificando..." : "Verificar"}
            </button>
          </div>
          {updateInfo?.releaseName && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                {updateInfo.releaseName}
              </p>
              {updateInfo.releaseNotes && (
                <p className="text-xs text-blue-700 mt-1 line-clamp-2">
                  {updateInfo.releaseNotes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Links e Contato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grupo WhatsApp */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FaWhatsapp className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Grupo do WhatsApp</h3>
              <p className="text-sm text-gray-500">Entre em contato com a comunidade</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenLink("https://chat.whatsapp.com/CleKCNu34096HRpspf080q")}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer"
          >
            <FaWhatsapp />
            Entrar no Grupo
          </button>
        </div>

        {/* Repositório GitHub */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center">
              <FaGithub className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Repositório</h3>
              <p className="text-sm text-gray-500">Código-fonte no GitHub</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenLink("https://github.com/gabrielkramermota/UPLOAD-IASD")}
            className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer"
          >
            <FiGithub />
            Ver no GitHub
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>© 2026 Upload IASD. Desenvolvido com ❤️ por Gabriel Kramer Mota.</p>
        <p className="mt-1">Versão Desktop v{currentVersion}</p>
      </div>
    </div>
  );
}
