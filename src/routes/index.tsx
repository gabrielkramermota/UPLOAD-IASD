import { createBrowserRouter } from "react-router-dom";
import App from "../App";

import WhatsappPage from "../pages/whatsapp/page";
import YoutubePage from "../pages/youtube/page";
import SettingsPage from "../pages/settings/page";
import AboutPage from "../pages/about/page";
import Home from "../pages/home/page";
import WelcomePage from "../pages/welcome/page";
import HistoryPage from "../pages/history/page";
import DashboardPage from "../pages/dashboard/page";
import LogsPage from "../pages/logs/page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "welcome",
        element: <WelcomePage />,
      },
      {
        index: true,
        element: <Home />,
      },
      {
        path: "bot-whatsapp",
        element: <WhatsappPage />,
      },
      {
        path: "baixar-video-youtube",
        element: <YoutubePage />,
      },
      {
        path: "configuracoes",
        element: <SettingsPage />,
      },
      {
        path: "sobre-o-sistema",
        element: <AboutPage />,
      },
      {
        path: "historico",
        element: <HistoryPage />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "logs",
        element: <LogsPage />,
      },
    ],
  },
]);
