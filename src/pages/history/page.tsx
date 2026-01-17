import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  FiClock, 
  FiFilter, 
  FiUpload, 
  FiFile,
  FiRefreshCw,
  FiExternalLink,
  FiPlay
} from "react-icons/fi";
import { FaWhatsapp as FaWhatsappSolid } from "react-icons/fa";
import { toast } from "sonner";

interface Activity {
  id: string;
  type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  metadata: string;
  timestamp: number;
  date: string;
}

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedLimit, setSelectedLimit] = useState(50);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await invoke<string>("get_activity_history", {
        limit: selectedLimit,
        activityType: filterType || null,
      });
      
      const data = JSON.parse(response);
      setActivities(data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filterType, selectedLimit]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload":
        return <FiUpload className="text-blue-600" size={20} />;
      case "youtube_download":
        return <FiPlay className="text-red-600" size={20} />;
      case "whatsapp_receive":
        return <FaWhatsappSolid className="text-green-600" size={20} />;
      default:
        return <FiFile className="text-gray-600" size={20} />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "upload":
        return "Upload";
      case "youtube_download":
        return "YouTube";
      case "whatsapp_receive":
        return "WhatsApp";
      default:
        return type;
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      
      if (!filePath || filePath.trim() === "") {
        toast.error("Caminho do arquivo inválido");
        return;
      }
      
      // Extrair pasta do caminho completo
      let folderPath = filePath.trim();
      
      // Encontrar o último separador (Windows usa \, Linux/Mac usa /)
      const lastBackslash = folderPath.lastIndexOf("\\");
      const lastSlash = folderPath.lastIndexOf("/");
      const lastSeparator = Math.max(lastBackslash, lastSlash);
      
      if (lastSeparator > 0) {
        folderPath = folderPath.substring(0, lastSeparator);
      }
      
      // Validar se o caminho não está vazio
      if (!folderPath || folderPath.trim() === "") {
        toast.error("Não foi possível determinar a pasta do arquivo");
        return;
      }
      
      // Abrir pasta no explorador do sistema
      await openPath(folderPath);
      toast.success("Pasta aberta no explorador!");
    } catch (error: any) {
      console.error("Erro ao abrir pasta:", error);
      const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
      
      // Mensagens de erro mais específicas
      if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
        toast.error("Sem permissão para abrir esta pasta. Verifique as permissões do sistema.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("não encontrado")) {
        toast.error("Pasta não encontrada. O arquivo pode ter sido movido ou deletado.");
      } else {
        toast.error(`Erro ao abrir pasta: ${errorMessage}`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FiClock className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Atividades</h1>
              <p className="text-sm text-gray-500 mt-1">Arquivos recebidos e baixados</p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FiRefreshCw />
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" />
            <span className="text-sm text-gray-600">Filtrar:</span>
          </div>
          <button
            onClick={() => setFilterType(null)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filterType === null
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType("upload")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              filterType === "upload"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FiUpload size={14} />
            Upload
          </button>
          <button
            onClick={() => setFilterType("youtube_download")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              filterType === "youtube_download"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FiPlay size={14} />
            YouTube
          </button>
          <button
            onClick={() => setFilterType("whatsapp_receive")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              filterType === "whatsapp_receive"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FaWhatsappSolid size={14} />
            WhatsApp
          </button>
          
          <select
            value={selectedLimit}
            onChange={(e) => setSelectedLimit(Number(e.target.value))}
            className="px-3 py-1 rounded-lg text-sm border border-gray-300 bg-white"
          >
            <option value={25}>Últimos 25</option>
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
          </select>
        </div>
      </div>

      {/* Lista de Atividades */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Carregando histórico...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <FiClock className="mx-auto text-gray-300" size={48} />
            <p className="mt-4 text-gray-500">Nenhuma atividade registrada ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {activity.file_name}
                        </span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                          {getActivityLabel(activity.type)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {activity.date}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>{formatFileSize(activity.file_size)}</span>
                        {activity.metadata && (
                          <span className="truncate max-w-xs">
                            {activity.metadata}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {activity.file_path}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenFile(activity.file_path)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1 text-sm flex-shrink-0"
                    title="Abrir pasta do arquivo"
                  >
                    <FiExternalLink size={14} />
                    Abrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
