import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  FiBarChart2, 
  FiFile, 
  FiHardDrive,
  FiUpload,
  FiRefreshCw,
  FiTrendingUp,
  FiPlay
} from "react-icons/fi";
import { FaWhatsapp as FaWhatsappSolid } from "react-icons/fa";

interface Statistics {
  total_activities: number;
  total_size: number;
  by_type: Record<string, number>;
  by_date: Record<string, number>;
  recent_activities: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const response = await invoke<string>("get_statistics");
      const data = JSON.parse(response);
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "upload":
        return "Uploads";
      case "youtube_download":
        return "YouTube";
      case "whatsapp_receive":
        return "WhatsApp";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
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

  // Preparar dados para gráfico (últimos 7 dias)
  const chartData = stats ? (() => {
    const dates = Object.keys(stats.by_date)
      .sort()
      .slice(-7);
    
    return dates.map(date => ({
      date,
      count: stats.by_date[date] || 0,
    }));
  })() : [];

  const maxCount = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.count))
    : 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FiBarChart2 className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Estatísticas e informações do sistema</p>
            </div>
          </div>
          <button
            onClick={loadStatistics}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FiRefreshCw />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Carregando estatísticas...</p>
        </div>
      ) : stats ? (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <FiFile className="text-blue-600" size={24} />
                </div>
              </div>
              <h3 className="text-sm text-gray-500 mb-1">Total de Atividades</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.total_activities}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiHardDrive className="text-purple-600" size={24} />
                </div>
              </div>
              <h3 className="text-sm text-gray-500 mb-1">Tamanho Total</h3>
              <p className="text-3xl font-bold text-gray-900">{formatFileSize(stats.total_size)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FiTrendingUp className="text-green-600" size={24} />
                </div>
              </div>
              <h3 className="text-sm text-gray-500 mb-1">Tipos de Atividade</h3>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.by_type).length}</p>
            </div>
          </div>

          {/* Gráfico de Atividades por Data */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividades por Data (Últimos 7 dias)</h2>
            {chartData.length > 0 ? (
              <div className="space-y-2">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-gray-600 flex-shrink-0">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      >
                        {item.count > 0 && (
                          <span className="text-xs text-white font-medium">{item.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
            )}
          </div>

          {/* Atividades por Tipo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividades por Tipo</h2>
            <div className="space-y-3">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(type)}
                    <span className="font-medium text-gray-900">{getTypeLabel(type)}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Atividades Recentes */}
          {stats.recent_activities && stats.recent_activities.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h2>
              <div className="space-y-2">
                {stats.recent_activities.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    {getTypeIcon(activity.type || "")}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.file_name || "Arquivo"}
                      </p>
                      <p className="text-xs text-gray-500">{activity.date || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-12 text-center">
          <FiBarChart2 className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhuma estatística disponível.</p>
        </div>
      )}
    </div>
  );
}
