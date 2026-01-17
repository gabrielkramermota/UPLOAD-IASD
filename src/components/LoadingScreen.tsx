import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mostrar por 2 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-8">
          <div className="h-32 w-32 rounded-full bg-white p-6 shadow-2xl mx-auto mb-6 flex items-center justify-center">
            <img 
              src="/logo.svg" 
              alt="Upload IASD Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-2">UPLOAD IASD</h1>
          <p className="text-blue-100 text-lg">Versão Desktop 2.2.0</p>
        </div>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto animate-spin"></div>
      </div>
    </div>
  );
}

