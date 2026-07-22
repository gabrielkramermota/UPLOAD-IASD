import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FiClipboard, FiDownload, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { useSettings } from "../../lib/useSettings";

type LogLevel = "INFO" | "WARN" | "ERROR";
type LogFilter = "all" | "info" | "warn" | "error" | "whatsapp" | "upload";

interface LogEntry {
  id: string;
  raw: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

function parseLogLine(raw: string, index: number): LogEntry {
  const match = raw.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/);
  const level = match?.[2]?.toUpperCase();
  return {
    id: `${index}-${raw}`,
    raw,
    timestamp: match?.[1] || "",
    level: level === "ERROR" || level === "WARN" ? level : "INFO",
    message: match?.[3] || raw,
  };
}

export default function LogsPage() {
  const { settings } = useSettings();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(200);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await invoke<string>("get_system_logs", { limit });
      const lines = JSON.parse(response) as string[];
      setLogs(lines.map(parseLogLine));
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      if (!silent) toast.error("Não foi possível carregar os logs");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void loadLogs();
    const interval = window.setInterval(() => void loadLogs(true), 5000);
    return () => window.clearInterval(interval);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter((entry) => {
      if (filter === "info" && entry.level !== "INFO") return false;
      if (filter === "warn" && entry.level !== "WARN") return false;
      if (filter === "error" && entry.level !== "ERROR") return false;
      if (filter === "whatsapp" && !entry.message.toLowerCase().includes("whatsapp") && !entry.message.includes("WA-BOT")) return false;
      if (filter === "upload" && !entry.message.toLowerCase().includes("upload") && !entry.message.toLowerCase().includes("arquivo")) return false;
      return !query || entry.raw.toLowerCase().includes(query);
    });
  }, [filter, logs, searchTerm]);

  const handleClearLogs = async () => {
    try {
      await invoke("clear_system_logs");
      setLogs([]);
      toast.success("Logs limpos");
    } catch (error) {
      toast.error(`Erro ao limpar logs: ${String(error)}`);
    }
  };

  const handleCopyLogs = async () => {
    await navigator.clipboard.writeText(filteredLogs.map((entry) => entry.raw).join("\n"));
    toast.success("Logs copiados");
  };

  const handleExportLogs = () => {
    const data = filteredLogs.map((entry) => entry.raw).join("\n");
    const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `upload-iasd-logs-${new Date().toISOString().slice(0, 10)}.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const levelClass = (level: LogLevel) => {
    if (level === "ERROR") return "bg-red-50 border-red-200 text-red-900";
    if (level === "WARN") return "bg-yellow-50 border-yellow-200 text-yellow-900";
    return "bg-blue-50 border-blue-200 text-gray-800";
  };

  return (
    <div className="p-4 h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: settings.primaryColor }}>Logs do Sistema</h1>
        <p className="text-gray-600 text-sm">Eventos reais registrados pelo aplicativo e pelo bot</p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar nos logs..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as LogFilter)} className="px-3 py-2 border rounded-lg">
            <option value="all">Todos</option>
            <option value="info">Informações</option>
            <option value="warn">Avisos</option>
            <option value="error">Erros</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="upload">Uploads</option>
          </select>
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="px-3 py-2 border rounded-lg">
            <option value={100}>100 linhas</option>
            <option value={200}>200 linhas</option>
            <option value={500}>500 linhas</option>
            <option value={1000}>1000 linhas</option>
          </select>
          <button onClick={() => void loadLogs()} className="p-2 bg-gray-100 rounded-lg" title="Atualizar"><FiRefreshCw /></button>
          <button onClick={() => void handleCopyLogs()} className="p-2 bg-gray-100 rounded-lg" title="Copiar"><FiClipboard /></button>
          <button onClick={handleExportLogs} className="p-2 bg-gray-100 rounded-lg" title="Exportar"><FiDownload /></button>
          <button onClick={() => void handleClearLogs()} className="p-2 bg-red-50 text-red-700 rounded-lg" title="Limpar"><FiTrash2 /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Nenhum log encontrado.</p>
        ) : filteredLogs.map((entry) => (
          <div key={entry.id} className={`border rounded-lg px-3 py-2 font-mono text-xs ${levelClass(entry.level)}`}>
            <div className="flex gap-3">
              <span className="font-semibold shrink-0">{entry.level}</span>
              <span className="text-gray-500 shrink-0">{entry.timestamp}</span>
              <span className="break-all">{entry.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
