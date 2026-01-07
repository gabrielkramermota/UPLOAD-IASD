import { useState, useEffect } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiPlay, FiSquare, FiRefreshCw, FiLoader, FiCheckCircle, FiXCircle, FiAlertCircle } from "react-icons/fi";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import QRCode from "react-qr-code";
import { useSettings } from "../../lib/useSettings";

type BotStatus = "stopped" | "qr" | "ready" | "error" | "disconnected" | "loading";

export default function WhatsappPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [status, setStatus] = useState<BotStatus>("stopped");
  const [qrCode, setQrCode] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const loadStatus = async () => {
    try {
      const statusJson = await invoke<string>("get_whatsapp_status");
      const statusData = JSON.parse(statusJson);
      setStatus(statusData.status || "stopped");
      setStatusMessage(statusData.message || "");

      if (statusData.status === "qr") {
        const qr = await invoke<string>("get_whatsapp_qr");
        setQrCode(qr);
      } else {
        setQrCode("");
      }
    } catch (error: any) {
      console.error("Erro ao carregar status:", error);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 2000); // Atualizar a cada 2 segundos
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    setStatus("loading");
    setStatusMessage("Iniciando bot... Aguarde, o QR Code será gerado em breve.");
    try {
      const result = await invoke<string>("start_whatsapp_bot");
      toast.success("Bot iniciado! Aguarde alguns segundos para o QR Code aparecer...", {
        duration: 4000,
      });
      // Aguardar um pouco antes de verificar o status
      setTimeout(loadStatus, 2000);
    } catch (error: any) {
      toast.error(`Erro ao iniciar bot: ${error}`);
      setStatus("stopped");
      setStatusMessage("");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const result = await invoke<string>("stop_whatsapp_bot");
      toast.success(result);
      // Limpar estado imediatamente
      setStatus("stopped");
      setQrCode("");
      setStatusMessage("");
      // Forçar atualização do status
      setTimeout(loadStatus, 500);
    } catch (error: any) {
      toast.error(`Erro ao parar bot: ${error}`);
      // Mesmo em caso de erro, limpar o estado
      setStatus("stopped");
      setQrCode("");
      setStatusMessage("");
    } finally {
      setIsStopping(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "ready":
        return <FiCheckCircle className="text-green-600" size={24} />;
      case "qr":
        return <FiLoader className="animate-spin text-blue-600" size={24} />;
      case "loading":
        return <FiLoader className="animate-spin text-yellow-600" size={24} />;
      case "error":
      case "disconnected":
        return <FiXCircle className="text-red-600" size={24} />;
      default:
        return <FiAlertCircle className="text-gray-400" size={24} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "ready":
        return "bg-green-50 border-green-200";
      case "qr":
        return "bg-blue-50 border-blue-200";
      case "loading":
        return "bg-yellow-50 border-yellow-200";
      case "error":
      case "disconnected":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "ready":
        return "Conectado e pronto";
      case "qr":
        return "Aguardando leitura do QR Code - Escaneie o código abaixo";
      case "loading":
        return "Iniciando bot... Aguarde, o QR Code será gerado em breve";
      case "error":
        return "Erro na conexão";
      case "disconnected":
        return "Desconectado";
      default:
        return "Parado";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FaWhatsapp className="text-green-600" />
          Bot WhatsApp
        </h1>

        {/* Status do Bot */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor()}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-semibold text-gray-900">{getStatusText()}</p>
                {statusMessage && (
                  <p className="text-sm text-gray-600 mt-1">{statusMessage}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {status === "stopped" ? (
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-opacity flex items-center gap-2 font-medium hover:opacity-90 cursor-pointer"
                  style={{ 
                    backgroundColor: settingsLoading ? "#9ca3af" : settings.primaryColor,
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
                      Iniciar Bot
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={isStopping}
                  className="px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-opacity flex items-center gap-2 font-medium hover:opacity-90 cursor-pointer"
                  style={{ 
                    backgroundColor: settingsLoading ? "#9ca3af" : settings.primaryColor,
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
                      Parar Bot
                    </>
                  )}
                </button>
              )}
              <button
                onClick={loadStatus}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FiRefreshCw />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* QR Code */}
        {status === "qr" && qrCode && (
          <div className="mb-6 p-6 bg-white border-2 border-blue-300 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Escaneie o QR Code com o WhatsApp
            </h2>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <QRCode value={qrCode} size={256} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Abra o WhatsApp no seu celular → Menu (três pontos) → Aparelhos conectados → Conectar um aparelho
            </p>
          </div>
        )}

        {/* Comandos Disponíveis */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Comandos Disponíveis</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-mono bg-gray-200 px-2 py-1 rounded">!upload [nome]</span>
              <span className="text-gray-600">ou</span>
              <span className="font-mono bg-gray-200 px-2 py-1 rounded">!arquivo [nome]</span>
            </div>
            <p className="text-gray-600 ml-2">
              Envie uma mídia (foto, vídeo, etc.) com este comando para fazer upload. O nome é opcional.
            </p>

            <div className="mt-3">
              <span className="font-mono bg-gray-200 px-2 py-1 rounded">!links [nome] [link1] [link2] ...</span>
            </div>
            <p className="text-gray-600 ml-2">
              Salva os links fornecidos em um arquivo de texto. O nome do arquivo é opcional.
            </p>

            <div className="mt-3">
              <span className="font-mono bg-gray-200 px-2 py-1 rounded">!ajuda</span>
            </div>
            <p className="text-gray-600 ml-2">
              Mostra a lista de comandos disponíveis.
            </p>
          </div>
        </div>

        {/* Informações */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>⚠️ Importante:</strong> O bot funciona apenas em conversas privadas (não em grupos).
            Envie os comandos diretamente para o número conectado ao bot.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            <strong>📁 Localização:</strong> Os arquivos são salvos na pasta de dados do aplicativo.
          </p>
          <p className="text-sm text-blue-800 mt-2">
            <strong>🔄 Limpeza Automática:</strong> O cache é limpo automaticamente ao parar o bot, evitando acúmulo de arquivos.
          </p>
          <p className="text-sm text-yellow-800 mt-2 bg-yellow-50 p-2 rounded">
            <strong>⏳ Ao iniciar:</strong> Aguarde alguns segundos para o QR Code aparecer. Escaneie-o com o WhatsApp para conectar.
          </p>
        </div>
      </div>
    </div>
  );
}
