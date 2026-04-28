import { useState, useEffect } from "react";
import { FiDownload, FiTrash2, FiSearch } from "react-icons/fi";
import { useSettings } from "../../lib/useSettings";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "upload" | "link" | "error" | "info";
  message: string;
  details?: string;
}

export default function LogsPage() {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "upload" | "link" | "error">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedLogs = localStorage.getItem("upload_logs");
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch {
        setLogs([]);
      }
    }
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.type !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleClearLogs = () => {
    localStorage.removeItem("upload_logs");
    setLogs([]);
  };

  const handleExportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upload-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "upload":
        return "bg-green-100 text-green-800";
      case "link":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "info":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: LogEntry["type"]) => {
    switch (type) {
      case "upload":
        return "Upload";
      case "link":
        return "Link";
      case "error":
        return "Erro";
      case "info":
        return "Info";
      default:
        return type;
    }
  };

  return (
    <div className="p-4 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900" style={{ color: settings.primaryColor }}>
          Logs do Sistema
        </h1>
        <p className="text-gray-600 text-sm">
          Visualize todos os uploads e links processados
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[150px]">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">Todos</option>
            <option value="upload">Uploads</option>
            <option value="link">Links</option>
            <option value="error">Erros</option>
          </select>

          <button
            onClick={handleExportLogs}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-sm"
          >
            <FiDownload size={14} />
            Exportar
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-sm"
          >
            <FiTrash2 size={14} />
            Limpar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex-1 flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
            <FiSearch className="mb-3 text-gray-300" size={36} />
            <p className="text-sm font-medium">Nenhum log encontrado</p>
            <p className="text-xs mt-1 text-gray-400">
              {logs.length === 0
                ? "Os logs aparecerão aqui"
                : "Tente ajustar os filtros"}
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                <div className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${getTypeColor(log.type)}`}>
                    {getTypeLabel(log.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-center text-xs text-gray-500">
        Total: {filteredLogs.length} / {logs.length} logs
      </div>
    </div>
  );
}