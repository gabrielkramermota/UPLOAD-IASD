import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiUploadCloud,
  FiDownload,
  FiInfo,
  FiSettings,
  FiMenu,
  FiX,
  FiBarChart2,
  FiClock,
  FiFileText,
  FiHelpCircle,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { useSettings } from "../../lib/useSettings";
import { startTutorial } from "../Tutorial/Tutorial";

function MenuToggle({
  isOpen,
  setIsOpen,
  primaryColor,
  hoverColor,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  primaryColor: string;
  hoverColor: string;
}) {
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      className="
        md:hidden fixed top-4 left-4 z-50
        p-2 rounded-full
        text-white
        shadow-lg transition-colors
      "
      style={{ backgroundColor: primaryColor }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = primaryColor;
      }}
    >
      {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
    </button>
  );
}

export default function Aside() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, loading } = useSettings();

  // Função para escurecer a cor (para hover)
  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent / 100)));
    const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent / 100)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  const hoverColor = darkenColor(settings.primaryColor, 20);
  const activeColor = darkenColor(settings.primaryColor, 15);

  const itemClass = "mx-3 rounded-lg";
  const linkBase =
    "flex items-center px-3 py-3 text-sm transition-colors";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkBase} ${
      isActive
        ? "text-white"
        : "text-blue-100 hover:text-white"
    }`;

  return (
    <>
      <MenuToggle 
        isOpen={isOpen} 
        setIsOpen={setIsOpen}
        primaryColor={settings.primaryColor}
        hoverColor={hoverColor}
      />

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={`
          fixed z-50 h-screen w-64
          bg-primary text-white shadow-2xl
          transition-transform duration-300
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ backgroundColor: settings.primaryColor }}
      >
        <div className="py-4 border-b border-white/10 text-center">
          <h1 className="text-xl font-extrabold tracking-wide text-blue-200">
            UPLOAD IASD
          </h1>
          <p className="text-xs text-blue-300 mt-1">v2.1.0</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="flex flex-col gap-1">
            {/* Dashboard - Primeiro */}
            <li className={itemClass}>
              <NavLink 
                to="/dashboard" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiBarChart2 className="mr-3" />
                Dashboard
              </NavLink>
            </li>

            {/* Funcionalidades principais */}
            <li className={itemClass}>
              <NavLink 
                to="/" 
                end 
                className={({ isActive }) => `${linkClass({ isActive })} ${isActive ? '' : ''}`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiUploadCloud className="mr-3" />
                Upload
              </NavLink>
            </li>

            <li className={itemClass}>
              <NavLink 
                to="/bot-whatsapp" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FaWhatsapp className="mr-3" />
                Bot Whatsapp
              </NavLink>
            </li>

            <li className={itemClass}>
              <NavLink 
                to="/baixar-video-youtube" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiDownload className="mr-3" />
                Baixar vídeo do YouTube
              </NavLink>
            </li>

            {/* Informações e histórico */}
            <li className={itemClass}>
              <NavLink 
                to="/historico" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiClock className="mr-3" />
                Histórico
              </NavLink>
            </li>

            <li className={itemClass}>
              <NavLink 
                to="/logs" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiFileText className="mr-3" />
                Logs
              </NavLink>
            </li>

            <li className={itemClass}>
              <NavLink 
                to="/configuracoes" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiSettings className="mr-3" />
                Configurações
              </NavLink>
            </li>

            <li className={itemClass}>
              <NavLink 
                to="/sobre-o-sistema" 
                className={linkClass}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? activeColor : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }
                }}
                onMouseLeave={(e) => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  e.currentTarget.style.backgroundColor = isActive ? activeColor : 'transparent';
                }}
              >
                <FiInfo className="mr-3" />
                Sobre o sistema
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Botão de Tutorial */}
        <div className="px-3 py-2 border-t border-white/10">
          <button
            onClick={() => startTutorial()}
            className="w-full flex items-center px-3 py-2 text-sm text-blue-100 hover:text-white rounded-lg transition-colors"
            style={{
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Rever tutorial"
          >
            <FiHelpCircle className="mr-3" />
            Rever Tutorial
          </button>
        </div>

        <div 
          className="absolute bottom-0 w-full border-t border-white/10 p-4"
          style={{ backgroundColor: settings.primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-blue-300 flex-shrink-0">
              {!loading && (
                <img
                  src={settings.logoPath}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.svg";
                  }}
                />
              )}
            </div>

            <div className="min-w-0">
              <h5 className="text-sm font-semibold truncate">
                {loading ? "Carregando..." : settings.churchName}
              </h5>
              <p className="text-xs text-blue-200">Upload IASD v2.1.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
