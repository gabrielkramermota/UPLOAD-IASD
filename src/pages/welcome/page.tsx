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
    // Verificar se já foi mostrado antes
    // Adicionar um pequeno delay para garantir que o store está pronto
    const checkWelcome = async () => {
      try {
        const seen = await hasSeenWelcome();
        if (seen) {
          // Se já viu, redirecionar para home
          navigate("/", { replace: true });
        } else {
          // Mostrar tela de boas-vindas imediatamente
          setIsVisible(true);
        }
      } catch (error) {
        // Em caso de erro, mostrar a tela de boas-vindas
        console.error("Erro ao verificar welcome:", error);
        setIsVisible(true);
      }
    };
    
    // Pequeno delay para garantir que tudo está inicializado
    setTimeout(checkWelcome, 100);
  }, [navigate]);

  const handleContinue = async () => {
    // Marcar como visto usando plugin-store
    await setWelcomeSeen(true);
    // Não marcar o tutorial como visto ainda - ele será iniciado automaticamente
    // Redirecionar para home (o tutorial será iniciado pelo componente Tutorial)
    navigate("/", { replace: true });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="max-w-3xl w-full my-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header Compacto */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-6 sm:px-8 py-8 sm:py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white p-3 flex items-center justify-center shadow-lg">
                  <img 
                    src="/logo.svg" 
                    alt="Upload IASD Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Bem-vindo ao</h1>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">UPLOAD IASD</h2>
              <p className="text-blue-100 text-sm sm:text-base">Versão Desktop 2.0.0</p>
            </div>
          </div>

          {/* Conteúdo Compacto e Amigável */}
          <div className="px-6 sm:px-8 py-6 sm:py-8">
            {/* Mensagem Simples */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-lg sm:text-xl text-gray-800 mb-2 font-semibold">
                Obrigado por usar o <strong className="text-blue-600">Upload IASD</strong>!
              </p>
              <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
                Ferramenta desenvolvida especialmente para sonoplastas e técnicos de som
              </p>
            </div>

            {/* Funcionalidades - Textos Amigáveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Baixar do YouTube</h3>
                  <p className="text-sm text-gray-600">
                    Baixe vídeos e músicas do YouTube facilmente
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Receber pelo WhatsApp</h3>
                  <p className="text-sm text-gray-600">
                    Receba arquivos enviados pelo WhatsApp automaticamente
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Receber Arquivos</h3>
                  <p className="text-sm text-gray-600">
                    Receba arquivos enviados pelo navegador do celular ou computador
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 text-base">Personalizável</h3>
                  <p className="text-sm text-gray-600">
                    Personalize cores e logo da sua igreja
                  </p>
                </div>
              </div>
            </div>

            {/* Divisor Simples */}
            <div className="my-6 border-t border-gray-200"></div>

            {/* Agradecimento Compacto */}
            <div className="bg-blue-50 rounded-lg p-5 mb-6 border border-blue-100">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Desenvolvido com ❤️ por
                </p>
                <p className="text-xl font-bold text-blue-700 mb-1">
                  Gabriel Kramer Mota
                </p>
              </div>
            </div>

            {/* Botão Continuar */}
            <div className="flex justify-center">
              <button
                onClick={handleContinue}
                className="px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 cursor-pointer transform hover:scale-105"
                style={{ 
                  background: settings?.primaryColor 
                    ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.primaryColor}dd)`
                    : undefined,
                }}
              >
                <span>Começar a Usar</span>
                <FiArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

