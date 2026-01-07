import { useState, useEffect, useRef } from "react";
import { useSettings } from "../../lib/useSettings";
import { FiSave, FiUpload, FiImage, FiDroplet, FiHome, FiSettings, FiFolder, FiVideo, FiFile } from "react-icons/fi";
import { toast } from "sonner";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

const PRESET_COLORS = [
  { name: "Azul Escuro", value: "#003366" },
  { name: "Azul Royal", value: "#1e3a8a" },
  { name: "Verde Escuro", value: "#065f46" },
  { name: "Roxo", value: "#6b21a8" },
  { name: "Vermelho Escuro", value: "#991b1b" },
  { name: "Laranja", value: "#c2410c" },
  { name: "Rosa", value: "#9f1239" },
  { name: "Ciano", value: "#155e75" },
];

export default function SettingsPage() {
  const { settings, loading, saveSettings } = useSettings();
  const [formData, setFormData] = useState({
    churchName: "",
    primaryColor: "#003366",
    logoPath: "",
    uploadsPath: "",
    videosPath: "",
  });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [forceShow, setForceShow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug
  useEffect(() => {
    console.log("SettingsPage renderizado", { loading, settings, formData });
  }, [loading, settings, formData]);

  useEffect(() => {
    if (!loading && settings) {
      setFormData({
        churchName: settings.churchName,
        primaryColor: settings.primaryColor,
        logoPath: settings.logoPath,
        uploadsPath: settings.uploadsPath || "",
        videosPath: settings.videosPath || "",
      });
      setLogoPreview(settings.logoPath);
    }
  }, [settings, loading]);

  // Timeout de segurança - mostrar formulário mesmo se loading demorar muito
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("Timeout: forçando exibição do formulário");
        setForceShow(true);
        // Usar valores padrão se ainda estiver carregando
        if (!formData.churchName) {
          setFormData({
            churchName: "IASD XII",
            primaryColor: "#003366",
            logoPath: "/logo.png",
            uploadsPath: "",
            videosPath: "",
          });
          setLogoPreview("/logo.png");
        }
      }
    }, 2000); // Reduzido para 2 segundos

    return () => clearTimeout(timer);
  }, [loading]);

  const handleColorChange = (color: string) => {
    setFormData((prev) => ({ ...prev, primaryColor: color }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setFormData((prev) => ({ ...prev, logoPath: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.churchName.trim()) {
      toast.error("Por favor, informe o nome da igreja");
      return;
    }

    const pastaUploadsMudou = formData.uploadsPath !== settings.uploadsPath;

    // Salvar caminho de uploads diretamente via comando Tauri (alternativa confiável)
    if (formData.uploadsPath) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("set_uploads_path", { path: formData.uploadsPath });
        console.log("✅ Caminho de uploads salvo via comando Tauri");
      } catch (error) {
        console.error("Erro ao salvar caminho via comando Tauri:", error);
      }
    }

    const success = await saveSettings({
      churchName: formData.churchName.trim(),
      primaryColor: formData.primaryColor,
      logoPath: logoPreview || formData.logoPath,
      uploadsPath: formData.uploadsPath,
      videosPath: formData.videosPath,
    });

    if (success) {
      if (pastaUploadsMudou && formData.uploadsPath) {
        toast.warning("Pasta de uploads alterada! Reinicie o servidor de upload na página inicial para aplicar a mudança.", {
          duration: 6000,
        });
      }
      // Recarregar a página para aplicar mudanças
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (loading && !forceShow) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <FiSettings className="text-primary" />
          Configurações
        </h1>

        {/* Nome da Igreja */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FiHome />
            Nome da Igreja
          </label>
          <input
            type="text"
            value={formData.churchName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, churchName: e.target.value }))
            }
            placeholder="Ex: IASD XII"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FiImage />
            Logo da Igreja
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100 flex items-center justify-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                ) : (
                  <FiImage className="text-gray-400" size={32} />
                )}
              </div>
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FiUpload />
                Selecionar Imagem
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Cor Primária */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FiDroplet />
            Cor Primária (Tema)
          </label>
          
          {/* Cores pré-definidas */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">Cores pré-definidas:</p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`
                    h-10 w-full rounded-lg border-2 transition-all cursor-pointer
                    ${
                      formData.primaryColor === color.value
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:scale-105"
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Seletor de cor personalizada */}
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-12 w-24 rounded-lg border border-gray-300 cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    handleColorChange(e.target.value);
                  }
                }}
                placeholder="#003366"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite o código hexadecimal da cor
              </p>
            </div>
          </div>

          {/* Preview da cor */}
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: formData.primaryColor }}>
            <p className="text-white text-sm font-medium">
              Preview da cor primária
            </p>
          </div>
        </div>

        {/* Pasta de Uploads */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FiFile />
            Pasta de Uploads
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.uploadsPath || "Usando pasta padrão"}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              placeholder="Nenhuma pasta selecionada"
            />
            <button
              onClick={async () => {
                try {
                  const selected = await openDialog({
                    directory: true,
                    multiple: false,
                    title: "Selecionar pasta para uploads",
                  });
                  
                  if (selected) {
                    const path = Array.isArray(selected) ? selected[0] : selected;
                    setFormData((prev) => ({ ...prev, uploadsPath: path }));
                    toast.success("Pasta de uploads selecionada!");
                  }
                } catch (error: any) {
                  console.error("Erro ao selecionar pasta:", error);
                  toast.error(`Erro ao selecionar pasta: ${error.message || error}`);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FiFolder />
              Selecionar
            </button>
            {formData.uploadsPath && (
              <button
                onClick={async () => {
                  try {
                    if (typeof window !== "undefined" && "__TAURI__" in window) {
                      const { open } = await import("@tauri-apps/plugin-opener");
                      await open(formData.uploadsPath);
                    } else {
                      window.open(formData.uploadsPath, "_blank");
                    }
                  } catch (error: any) {
                    toast.error(`Erro ao abrir pasta: ${error.message || error}`);
                  }
                }}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                title="Abrir pasta"
              >
                <FiFolder />
                Abrir
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pasta onde serão salvos os arquivos enviados via upload e bot WhatsApp
          </p>
        </div>

        {/* Pasta de Vídeos */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FiVideo />
            Pasta de Vídeos do YouTube
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.videosPath || "Usando pasta padrão (Downloads/UploadIASD)"}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              placeholder="Nenhuma pasta selecionada"
            />
            <button
              onClick={async () => {
                try {
                  const selected = await openDialog({
                    directory: true,
                    multiple: false,
                    title: "Selecionar pasta para vídeos do YouTube",
                  });
                  
                  if (selected) {
                    const path = Array.isArray(selected) ? selected[0] : selected;
                    setFormData((prev) => ({ ...prev, videosPath: path }));
                    toast.success("Pasta de vídeos selecionada!");
                  }
                } catch (error: any) {
                  console.error("Erro ao selecionar pasta:", error);
                  toast.error(`Erro ao selecionar pasta: ${error.message || error}`);
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FiFolder />
              Selecionar
            </button>
            {formData.videosPath && (
              <button
                onClick={async () => {
                  try {
                    if (typeof window !== "undefined" && "__TAURI__" in window) {
                      const { open } = await import("@tauri-apps/plugin-opener");
                      await open(formData.videosPath);
                    } else {
                      window.open(formData.videosPath, "_blank");
                    }
                  } catch (error: any) {
                    toast.error(`Erro ao abrir pasta: ${error.message || error}`);
                  }
                }}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                title="Abrir pasta"
              >
                <FiFolder />
                Abrir
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pasta onde serão salvos os vídeos baixados do YouTube
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-medium cursor-pointer"
            style={{ backgroundColor: formData.primaryColor }}
          >
            <FiSave />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
