import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiArrowRight } from "react-icons/fi";
import { useSettings } from "../../lib/useSettings";
import { hasSeenWelcome, setWelcomeSeen } from "../../lib/app-store";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkWelcome = async () => {
      try {
        const seen = await hasSeenWelcome();
        if (seen) {
          navigate("/", { replace: true });
        } else {
          setIsVisible(true);
        }
      } catch (error) {
        console.error("Erro ao verificar welcome:", error);
        setIsVisible(true);
      }
    };
    setTimeout(checkWelcome, 100);
  }, [navigate]);

  const handleContinue = async () => {
    await setWelcomeSeen(true);
    navigate("/", { replace: true });
  };

  if (!isVisible) return null;

  const features = [
    { bg: "bg-blue-50 border-blue-100",     icon: "bg-blue-600",   title: "Baixar do YouTube",     desc: "Baixe vídeos e músicas do YouTube facilmente" },
    { bg: "bg-green-50 border-green-100",   icon: "bg-green-600",  title: "Receber pelo WhatsApp", desc: "Receba arquivos enviados pelo WhatsApp automaticamente" },
    { bg: "bg-purple-50 border-purple-100", icon: "bg-purple-600", title: "Receber Arquivos",      desc: "Receba arquivos via navegador do celular ou computador" },
    { bg: "bg-orange-50 border-orange-100", icon: "bg-orange-600", title: "Personalizável",        desc: "Personalize cores e logo da sua igreja" },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center z-50">
      {/* Card principal — mais largo e com cantos bem arredondados */}
      <div
        className="w-full flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxWidth: "680px", maxHeight: "calc(100vh - 48px)" }}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-10 py-6 text-center relative overflow-hidden flex-shrink-0">
          {/* Decoração */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="relative z-10 flex items-center justify-center gap-5">
            {/* Logo com borda branca e shadow */}
            <div className="h-16 w-16 rounded-full bg-white p-1.5 flex items-center justify-center shadow-lg ring-2 ring-white/40 flex-shrink-0">
              <img
                src="/logo.svg"
                alt="Upload IASD Logo"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="text-left">
              <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase leading-none mb-1">Bem-vindo ao</p>
              <h1 className="text-3xl font-extrabold text-white leading-tight">UPLOAD IASD</h1>
              <p className="text-blue-200 text-xs leading-none mt-1">Versão Desktop 2.2.1</p>
            </div>
          </div>
        </div>

        {/* ── Corpo ── */}
        <div className="flex-1 flex flex-col px-8 py-5 min-h-0 overflow-hidden">

          {/* Subtítulo */}
          <div className="text-center mb-4 flex-shrink-0">
            <p className="text-lg font-semibold text-gray-800">
              Obrigado por usar o <span className="text-blue-600 font-bold">Upload IASD</span>!
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Ferramenta desenvolvida especialmente para sonoplastas e técnicos de som
            </p>
          </div>

          {/* Grid de funcionalidades */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            {features.map((f) => (
              <div key={f.title} className={`flex items-start gap-3 p-4 rounded-xl border ${f.bg}`}>
                <div className={`w-9 h-9 rounded-full ${f.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <FiCheckCircle className="text-white" size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divisor */}
          <div className="my-4 border-t border-gray-100 flex-shrink-0" />

          {/* Crédito */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center flex-shrink-0">
            <p className="text-xs text-gray-500">Desenvolvido com ❤️ por</p>
            <p className="text-base font-bold text-blue-700 leading-tight mt-0.5">Gabriel Kramer Mota</p>
          </div>

          {/* Botão */}
          <div className="flex justify-center mt-4 pb-1 flex-shrink-0">
            <button
              onClick={handleContinue}
              className="px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              style={
                settings?.primaryColor
                  ? { background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.primaryColor}dd)` }
                  : undefined
              }
            >
              <span>Começar a Usar</span>
              <FiArrowRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}