import { useState, useEffect } from "react";
import { FiUploadCloud, FiPlay, FiSquare, FiRefreshCw, FiLoader } from "react-icons/fi";
import { useSettings } from "../../lib/useSettings";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import QRCode from "react-qr-code";

export default function Home() {
  const { settings, loading } = useSettings();
  const [serverUrl, setServerUrl] = useState<string>("");
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const loadServerStatus = async () => {
    try {
      const url = await invoke<string>("get_upload_server_url");
      setServerUrl(url);
      setIsServerRunning(true);
    } catch {
      setServerUrl("");
      setIsServerRunning(false);
    }
  };

  useEffect(() => {
    loadServerStatus();
    const interval = setInterval(loadServerStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartServer = async () => {
    setIsStarting(true);
    try {
      const url = await invoke<string>("start_upload_server");
      setServerUrl(url);
      setIsServerRunning(true);
      toast.success("Servidor iniciado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao iniciar servidor: ${error}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopServer = async () => {
    setIsStopping(true);
    try {
      await invoke<string>("stop_upload_server");
      setServerUrl("");
      setIsServerRunning(false);
      toast.success("Servidor parado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao parar servidor: ${error}`);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] px-6">
      <div className="text-center space-y-8 max-w-4xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="h-32 w-32 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-2xl">
              {!loading && (
                <img
                  src={settings.logoPath}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.svg";
                  }}
                />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-3 shadow-lg">
              <FiUploadCloud className="text-white" size={24} />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-primary tracking-tight">
            UPLOAD IASD
          </h1>
          <p className="text-xl text-gray-400 font-medium">
            Versão 2.0.0
          </p>
        </div>

        {/* Servidor de Upload */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Servidor de Upload
          </h2>

          {/* Status e Controles */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      isServerRunning ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {isServerRunning ? "● Ativo" : "○ Parado"}
                  </span>
                </p>
                {serverUrl && (
                  <p className="text-xs text-gray-500 mt-1 break-all">
                    {serverUrl}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!isServerRunning ? (
                  <button
                    onClick={handleStartServer}
                    disabled={isStarting}
                    className="px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-opacity flex items-center gap-2 font-medium hover:opacity-90 cursor-pointer"
                    style={{ 
                      backgroundColor: loading ? "#9ca3af" : settings.primaryColor,
                      opacity: isStarting ? 0.7 : 1
                    }}
                  >
                    {isStarting ? (
                      <>
                        <FiLoader className="animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <FiPlay />
                        Iniciar Servidor
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleStopServer}
                    disabled={isStopping}
                    className="px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-opacity flex items-center gap-2 font-medium hover:opacity-90 cursor-pointer"
                    style={{ 
                      backgroundColor: loading ? "#9ca3af" : settings.primaryColor,
                      opacity: isStopping ? 0.7 : 1
                    }}
                  >
                    {isStopping ? (
                      <>
                        <FiLoader className="animate-spin" />
                        Parando...
                      </>
                    ) : (
                      <>
                        <FiSquare />
                        Parar Servidor
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={loadServerStatus}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FiRefreshCw />
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {isServerRunning && serverUrl && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Escaneie o QR Code para acessar
              </h3>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                  <QRCode value={serverUrl} size={256} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Ou acesse diretamente:
                </p>
                <a
                  href={serverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-mono text-sm break-all"
                >
                  {serverUrl}
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                📱 Escaneie com seu celular para fazer upload de arquivos e links
              </p>
            </div>
          )}

          {/* Informações */}
          {!isServerRunning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Como funciona:</strong> Inicie o servidor para gerar um QR code.
                Escaneie com seu celular para acessar a página de upload e enviar arquivos ou links.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
