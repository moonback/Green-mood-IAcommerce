import React, { useState, useEffect, useRef } from 'react';
import AdminSidebar, { Tab } from './AdminSidebar';
import AdminMobileMenu from './AdminMobileMenu';
import AdminHeader from './AdminHeader';
import SEO from '../../../components/SEO';
import { useSettingsStore } from '../../../store/settingsStore';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSignOut: () => void;
  showLayout?: boolean;
}

export default function AdminLayout({
  children,
  currentTab,
  onTabChange,
  onSignOut,
  showLayout = true,
}: AdminLayoutProps) {
  const { settings } = useSettingsStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    handleScroll();
    const frameId = requestAnimationFrame(handleScroll);
    return () => cancelAnimationFrame(frameId);
  }, [currentTab]);

  if (!showLayout) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
        <main ref={mainRef} className="flex-1 h-screen overflow-hidden p-2">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080d18] text-slate-100 flex overflow-hidden">
      <SEO
        title={`Administration | ${settings.store_name || 'NeuroCart'}`}
        description={`Panel d'administration pour gérer la boutique ${settings.store_name || 'Eco CBD'}.`}
      />

      <AdminSidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSignOut={onSignOut}
      />

      <AdminMobileMenu
        currentTab={currentTab}
        onTabChange={onTabChange}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main ref={mainRef} className="relative flex-1 overflow-y-auto pt-20 md:pt-0">
        <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-green-neon/5 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/5 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-[1600px] p-4 md:p-8 xl:p-10">
          <AdminHeader currentTab={currentTab} />
          {children}
        </div>
      </main>
    </div>
  );
}
