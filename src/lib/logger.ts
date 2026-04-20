import { invoke } from "@tauri-apps/api/core";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export async function logClientEvent(
  level: LogLevel,
  message: string,
  context?: string,
) {
  try {
    await invoke("log_event", { level, message, context });
  } catch (error) {
    console.error("Erro ao enviar log do cliente:", error);
  }
}
