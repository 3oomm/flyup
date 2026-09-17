import { Outlet, useLocation } from "react-router"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import ChatWidget from "../components/ChatWidget"
import CookieConsent from "../components/CookieConsent"

const MainLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className={`flex flex-col bg-background ${isHome ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
        <Navbar />
        <main className={`flex-1 ${isHome ? 'min-h-0' : ''}`}>
            <Outlet />
        </main>
        {!isHome && <Footer />}
        <ChatWidget />
        <CookieConsent />
    </div>
  );
};

export default MainLayout;
