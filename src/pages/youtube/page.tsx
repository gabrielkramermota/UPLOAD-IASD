import { useState } from "react";
import { FiDownload, FiYoutube, FiMusic, FiVideo, FiLoader, FiFolder, FiClock, FiUser, FiEye } from "react-icons/fi";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "../../lib/useSettings";

type DownloadType = "video" | "audio" | null;
type Quality = "best" | "2160p" | "1440p" | "1080p" | "720p" | "480p" | "360p" | "240p";

interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  view_count: number;
  thumbnail: string;
}

export default function YoutubePage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [url, setUrl] = useState("");
  const [downloadType, setDownloadType] = useState<DownloadType>(null);
  const [quality, setQuality] = useState<Quality>("1080p");
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [downloadedFile, setDownloadedFile] = useState<{ path: string; name: string } | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const isValidYoutubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/,
      /^https?:\/\/youtube\.com\/watch\?v=.+$/,
      /^https?:\/\/youtu\.be\/.+$/,
    ];
    return patterns.some((pattern) => pattern.test(url));
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error("Por favor, insira a URL do vídeo do YouTube");
      return;
    }

    if (!isValidYoutubeUrl(url)) {
      toast.error("Por favor, insira uma URL válida do YouTube");
      return;
    }

    if (!downloadType) {
      toast.error("Por favor, selecione o tipo de download (Áudio ou Vídeo)");
      return;
    }

    setIsDownloading(true);
    setProgress("Iniciando download...");

    try {
      // Tentar chamar o comando Tauri diretamente
      setProgress("Preparando download...");
      const result = await invoke<string>("download_youtube", {
        url: url.trim(),
        format: downloadType,
        quality: downloadType === "video" ? quality : null,
      });

      // Separar caminho completo e nome do arquivo
      const [filePath, fileName] = result.split("|");
      
      setDownloadedFile({ path: filePath, name: fileName });
      toast.success("Download concluído com sucesso!");
      setProgress(`Download concluído: ${fileName}`);
    } catch (error: any) {
      console.error("Erro ao baixar:", error);
      const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
      
      // Verificar se é erro de Tauri não disponível
      if (errorMessage.includes("invoke") || errorMessage.includes("Tauri") || errorMessage.includes("not found")) {
        toast.error("Funcionalidade disponível apenas na versão desktop. Execute o aplicativo Tauri.");
        setProgress("Execute o aplicativo desktop para usar esta funcionalidade");
      } else if (errorMessage.includes("yt-dlp não encontrado") || errorMessage.includes("não encontrado")) {
        toast.error("Erro ao baixar yt-dlp. Verifique sua conexão com a internet.");
        setProgress("Erro: yt-dlp não encontrado");
      } else {
        toast.error(`Erro ao baixar: ${errorMessage}`);
        setProgress(`Erro: ${errorMessage}`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClear = () => {
    setUrl("");
    setDownloadType(null);
    setProgress("");
    setDownloadedFile(null);
    setVideoInfo(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FiYoutube className="text-red-600" />
          Baixar Vídeo do YouTube
        </h1>

        {/* Input URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL do Vídeo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isDownloading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Cole a URL completa do vídeo do YouTube
          </p>
        </div>

        {/* Informações do Vídeo */}
        {videoInfo && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
            <div className="flex gap-4">
              {videoInfo.thumbnail && (
                <img
                  src={videoInfo.thumbnail}
                  alt="Thumbnail"
                  className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                  {videoInfo.title}
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-500" size={14} />
                    <span>{videoInfo.uploader}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FiClock className="text-gray-500" size={14} />
                      <span>{formatDuration(videoInfo.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiEye className="text-gray-500" size={14} />
                      <span>{formatNumber(videoInfo.view_count)} visualizações</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tipo de Download */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Download
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setDownloadType("video")}
              disabled={isDownloading}
              className={`
                p-6 rounded-lg border-2 transition-all
                flex flex-col items-center gap-3
                ${
                  downloadType === "video"
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }
                ${isDownloading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <FiVideo
                className={downloadType === "video" ? "text-primary" : "text-gray-400"}
                size={32}
              />
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">Vídeo</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Baixa o vídeo completo com áudio
                </p>
              </div>
            </button>

            <button
              onClick={() => setDownloadType("audio")}
              disabled={isDownloading}
              className={`
                p-6 rounded-lg border-2 transition-all
                flex flex-col items-center gap-3
                ${
                  downloadType === "audio"
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50"
                }
                ${isDownloading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <FiMusic
                className={downloadType === "audio" ? "text-primary" : "text-gray-400"}
                size={32}
              />
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">Áudio</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Baixa apenas o áudio (MP3)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Qualidade (apenas para vídeo) */}
        {downloadType === "video" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Qualidade do Vídeo
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as Quality)}
              disabled={isDownloading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="best">Melhor disponível</option>
              <option value="2160p">2160p (4K)</option>
              <option value="1440p">1440p (2K)</option>
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="360p">360p</option>
              <option value="240p">240p</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              A qualidade pode variar dependendo do vídeo disponível
            </p>
          </div>
        )}

        {/* Progresso Detalhado */}
        {progress && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {isDownloading && <FiLoader className="animate-spin text-blue-600" />}
                <p className="text-sm font-medium text-blue-900">{progress}</p>
              </div>
              {isDownloading && (
                <div className="space-y-1">
                  <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-blue-700">
                    Aguarde... O download pode levar alguns minutos dependendo do tamanho do arquivo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Arquivo baixado */}
        {downloadedFile && !isDownloading && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-bold text-green-900">
                    Download concluído com sucesso!
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-white/50 rounded p-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Nome do arquivo:</p>
                    <p className="text-green-800 font-mono break-all">{downloadedFile.name}</p>
                  </div>
                  <div className="bg-white/50 rounded p-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Localização:</p>
                    <p className="text-green-800 font-mono text-xs break-all">{downloadedFile.path}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    if (typeof window !== "undefined" && "__TAURI__" in window) {
                      const { openPath } = await import("@tauri-apps/plugin-opener");
                      // Extrair pasta do caminho completo
                      let folderPath = downloadedFile.path;
                      
                      // Encontrar o último separador (Windows usa \, Linux/Mac usa /)
                      const lastBackslash = folderPath.lastIndexOf("\\");
                      const lastSlash = folderPath.lastIndexOf("/");
                      const lastSeparator = Math.max(lastBackslash, lastSlash);
                      
                      if (lastSeparator > 0) {
                        folderPath = folderPath.substring(0, lastSeparator);
                      }
                      
                      console.log("Abrindo pasta:", folderPath);
                      await openPath(folderPath);
                      toast.success("Pasta aberta!");
                    } else {
                      toast.info("Funcionalidade disponível apenas na versão desktop");
                    }
                  } catch (error: any) {
                    console.error("Erro ao abrir pasta:", error);
                    toast.error(`Erro ao abrir pasta: ${error?.message || error}`);
                  }
                }}
                className="px-4 py-2 text-white rounded-lg transition-opacity flex items-center gap-2 text-sm font-medium shadow-sm hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: settingsLoading ? "#9ca3af" : settings.primaryColor }}
              >
                <FiFolder />
                Abrir Pasta
              </button>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading || !url.trim() || !downloadType}
            className="flex-1 px-6 py-3 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-opacity flex items-center justify-center gap-2 font-medium hover:opacity-90 cursor-pointer"
            style={{ 
              backgroundColor: settingsLoading ? "#9ca3af" : settings.primaryColor,
              opacity: (isDownloading || !url.trim() || !downloadType) ? 0.6 : 1
            }}
          >
            {isDownloading ? (
              <>
                <FiLoader className="animate-spin" />
                Baixando...
              </>
            ) : (
              <>
                <FiDownload />
                Baixar
              </>
            )}
          </button>
          {downloadedFile && (
            <button
              onClick={handleClear}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>✨ Automático:</strong> O yt-dlp será baixado automaticamente na primeira execução. 
          Não é necessário instalar nada manualmente!
        </p>
        <p className="text-sm text-green-800 mt-2">
          <strong>📁 Local:</strong> Os arquivos serão salvos na pasta Downloads/UploadIASD
        </p>
      </div>
    </div>
  );
}
