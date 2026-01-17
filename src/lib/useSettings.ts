import { useState, useEffect } from "react";
import { getSettingsStore } from "./settings-store";
import { toast } from "sonner";

export interface Settings {
  churchName: string;
  primaryColor: string;
  logoPath: string;
  uploadsPath: string;
  videosPath: string;
}

const DEFAULT_SETTINGS: Settings = {
  churchName: "Upload IASD",
  primaryColor: "#003366",
  logoPath: "/logo.svg",
  uploadsPath: "",
  videosPath: "",
};

// Garantir que os campos novos existam mesmo em configurações antigas
function ensureSettings(settings: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    uploadsPath: settings.uploadsPath || "",
    videosPath: settings.videosPath || "",
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      // Verificar se está no Tauri
      if (typeof window !== "undefined" && !("__TAURI__" in window)) {
        // Modo web - usar localStorage como fallback
        const saved = localStorage.getItem("upload-iasd-settings");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<Settings>;
            const ensured = ensureSettings(parsed);
            setSettings(ensured);
            applyTheme(ensured.primaryColor);
          } catch {
            // Se houver erro ao parsear, usar padrões
            setSettings(DEFAULT_SETTINGS);
            applyTheme(DEFAULT_SETTINGS.primaryColor);
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
          applyTheme(DEFAULT_SETTINGS.primaryColor);
        }
        setLoading(false);
        return;
      }

      // Modo Tauri
      try {
        const store = await getSettingsStore();
        const saved = await store.get<Settings>("settings");
        
        if (saved) {
          const ensured = ensureSettings(saved);
          setSettings(ensured);
          applyTheme(ensured.primaryColor);
        } else {
          // Usar configurações padrão sem salvar ainda
          setSettings(DEFAULT_SETTINGS);
          applyTheme(DEFAULT_SETTINGS.primaryColor);
        }
      } catch (storeError) {
        console.error("Erro ao acessar store:", storeError);
        // Em caso de erro, usar padrões
        setSettings(DEFAULT_SETTINGS);
        applyTheme(DEFAULT_SETTINGS.primaryColor);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setSettings(DEFAULT_SETTINGS);
      applyTheme(DEFAULT_SETTINGS.primaryColor);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(newSettings: Settings) {
    try {
      // Verificar se está no Tauri
      if (typeof window !== "undefined" && !("__TAURI__" in window)) {
        // Modo web - usar localStorage como fallback
        localStorage.setItem("upload-iasd-settings", JSON.stringify(newSettings));
        setSettings(newSettings);
        applyTheme(newSettings.primaryColor);
        toast.success("Configurações salvas com sucesso!");
        return true;
      }

      // Modo Tauri
      const store = await getSettingsStore();
      await store.set("settings", newSettings);
      await store.save();
      
      setSettings(newSettings);
      applyTheme(newSettings.primaryColor);
      toast.success("Configurações salvas com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
      return false;
    }
  }

  function applyTheme(color: string) {
    // Aplicar cor primária dinamicamente
    const root = document.documentElement;
    root.style.setProperty("--color-primary", color);
    
    // Calcular cor hover (mais escura)
    const hoverColor = darkenColor(color, 20);
    root.style.setProperty("--color-primary-hover", hoverColor);
  }

  function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent / 100)));
    const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  return {
    settings,
    loading,
    saveSettings,
    reloadSettings: loadSettings,
  };
}

