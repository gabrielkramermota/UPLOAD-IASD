import { FiInfo, FiGithub } from "react-icons/fi";
import { FaWhatsapp, FaGithub } from "react-icons/fa";

export default function AboutPage() {
  const handleOpenLink = async (url: string) => {
    try {
      // Verificar se está no Tauri
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        const { open } = await import("@tauri-apps/plugin-opener");
        await open(url);
      } else {
        // Fallback para navegador
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Erro ao abrir link:", error);
      // Fallback final
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full overflow-hidden ring-4 ring-primary/20 flex items-center justify-center bg-primary/10">
            <FiInfo className="text-primary" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sobre o Sistema</h1>
            <p className="text-gray-500 mt-1">Upload IASD Desktop v2.0.0</p>
          </div>
        </div>
      </div>

      {/* Links e Contato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grupo WhatsApp */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FaWhatsapp className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Grupo do WhatsApp</h3>
              <p className="text-sm text-gray-500">Entre em contato com a comunidade</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenLink("https://chat.whatsapp.com/CleKCNu34096HRpspf080q")}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer"
          >
            <FaWhatsapp />
            Entrar no Grupo
          </button>
        </div>

        {/* Repositório GitHub */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center">
              <FaGithub className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Repositório</h3>
              <p className="text-sm text-gray-500">Código-fonte no GitHub</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenLink("https://github.com/gabrielkramermota/UPLOAD-IASD")}
            className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer"
          >
            <FiGithub />
            Ver no GitHub
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        <p>© 2026 Upload IASD. Desenvolvido com ❤️ por Gabriel Kramer Mota.</p>
        <p className="mt-1">Versão Desktop 2.0.0</p>
      </div>
    </div>
  );
}
