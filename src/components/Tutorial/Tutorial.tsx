import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiChevronRight, FiChevronLeft, FiCheck } from "react-icons/fi";
import { hasSeenWelcome, hasSeenTutorial, setTutorialSeen } from "../../lib/app-store";

interface TutorialStep {
  id: string;
  route: string;
  title: string;
  description: string;
  highlight?: string; // ID ou classe do elemento a destacar
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "home",
    route: "/",
    title: "Upload - Tela Inicial",
    description: "Esta é a tela principal do sistema. Aqui você pode iniciar o servidor de upload para receber arquivos enviados pelo navegador do celular ou computador.",
  },
  {
    id: "whatsapp",
    route: "/bot-whatsapp",
    title: "Bot WhatsApp",
    description: "Aqui você pode iniciar o bot do WhatsApp para receber arquivos automaticamente. Escaneie o QR Code com seu WhatsApp para conectar.",
  },
  {
    id: "youtube",
    route: "/baixar-video-youtube",
    title: "Baixar vídeo do YouTube",
    description: "Nesta tela você pode baixar vídeos e músicas do YouTube. Basta colar o link do vídeo, escolher a qualidade e clicar em baixar.",
  },
  {
    id: "settings",
    route: "/configuracoes",
    title: "Configurações",
    description: "Nesta tela você pode personalizar o sistema: alterar o nome da igreja, escolher a cor do tema e adicionar o logo da sua igreja.",
  },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar se deve mostrar o tutorial
    Promise.all([hasSeenWelcome(), hasSeenTutorial()]).then(([seenWelcome, seenTutorial]) => {
      // Mostrar tutorial apenas se viu a tela de boas-vindas mas não viu o tutorial
      if (seenWelcome && !seenTutorial) {
        setIsVisible(true);
        // Navegar para a primeira tela do tutorial
        navigate(tutorialSteps[0].route, { replace: true });
      }
    });
  }, [navigate]);

  useEffect(() => {
    // Atualizar rota quando mudar o passo do tutorial
    if (isVisible && tutorialSteps[currentStep]) {
      navigate(tutorialSteps[currentStep].route, { replace: true });
    }
  }, [currentStep, isVisible, navigate]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await setTutorialSeen(true);
    setIsVisible(false);
    // Navegar para a home após o tutorial
    navigate("/", { replace: true });
  };

  if (!isVisible || !tutorialSteps[currentStep]) {
    return null;
  }

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"></div>

      {/* Card do Tutorial */}
      <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-50 transform transition-all duration-300 animate-[slideUp_0.3s_ease-out]">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {currentStep + 1}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Tutorial</h3>
                <p className="text-blue-100 text-xs">
                  Passo {currentStep + 1} de {tutorialSteps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              title="Pular tutorial"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h4>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">{step.description}</p>

            {/* Barra de progresso */}
            <div className="mb-6">
              <div className="flex gap-1">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index <= currentStep ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  isFirstStep
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiChevronLeft size={18} />
                Anterior
              </button>

              {isLastStep ? (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  Finalizar
                  <FiCheck size={18} />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  Próximo
                  <FiChevronRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

