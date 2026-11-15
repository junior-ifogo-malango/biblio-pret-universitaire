import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Package, 
  BookOpen, 
  Users, 
  History, 
  Bell, 
  Settings, 
  Barcode, 
  Scan, 
  Search, 
  Menu, 
  X,
  LogOut
} from 'lucide-react';
import { useLibrary, ManagerTab } from '../context/LibraryContext';
import { THEME } from '../utils/theme';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

const TAB_TITLES: Record<ManagerTab, string> = {
  dashboard: 'Accueil',
  loans: 'Prêts en cours',
  catalog: 'Catalogue & Exemplaires',
  students: 'Étudiants Inscrits',
  history: 'Historique des Retours',
  alerts: 'Gestion des Retards & Alertes',
  settings: 'Réglages du Système',
  help: 'Guide d\'utilisation'
};

export const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children }) => {
  const { 
    activeManagerTab, 
    setActiveManagerTab, 
    stats, 
    currentDate,
    setIsGlobalSearchOpen,
    setIsScanReturnOpen,
    openNewLoan,
    logoutManager
  } = useLibrary();

  // Détection fiable du viewport < 1280px via useMediaQuery
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1280;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Fermer le drawer avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation principale
  const navItems: { id: ManagerTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Accueil',
      icon: <Home className="w-4 h-4 shrink-0" />
    },
    {
      id: 'loans',
      label: 'Prêts',
      icon: <Package className="w-4 h-4 shrink-0" />
    },
    {
      id: 'catalog',
      label: 'Catalogue',
      icon: <BookOpen className="w-4 h-4 shrink-0" />
    },
    {
      id: 'students',
      label: 'Étudiants',
      icon: <Users className="w-4 h-4 shrink-0" />
    },
    {
      id: 'history',
      label: 'Historique',
      icon: <History className="w-4 h-4 shrink-0" />
    },
    {
      id: 'alerts',
      label: 'Alertes',
      icon: <Bell className="w-4 h-4 shrink-0" />,
      badge: stats.empruntsEnRetard > 0 ? stats.empruntsEnRetard : undefined
    }
  ];

  const handleTabClick = (tab: ManagerTab) => {
    setActiveManagerTab(tab);
    setMobileDrawerOpen(false);
  };

  const formattedDate = new Date(currentDate).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen flex font-sans" style={{ backgroundColor: THEME.content.bg }}>
      
      {/* 1. BARRE LATÉRALE DESKTOP (≥ 1280px) : FIXE (240px) BLEU MARINE (#0F2742) */}
      {!isMobileOrTablet && (
        <aside
          className="fixed top-0 bottom-0 left-0 z-30 w-[240px] flex flex-col justify-between select-none"
          style={{ backgroundColor: THEME.sidebar.bg, color: THEME.sidebar.text }}
        >
          {/* Haut : Logo + Nom « BiblioPrêt » (16px bold) + Onglets */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="h-12 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div 
                onClick={() => handleTabClick('dashboard')}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs"
                  style={{ backgroundColor: THEME.topbar.btnLoanOrange }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-[16px] tracking-tight text-white font-sans">
                  BiblioPrêt
                </span>
              </div>
            </div>

            {/* Onglets verticaux : 13px, actif #1E3A5F */}
            <nav className="p-3 space-y-1 overflow-y-auto flex-1 text-[13px]">
              {navItems.map(item => {
                const isActive = activeManagerTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer text-left ${
                      isActive 
                        ? 'text-white font-semibold' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: isActive ? THEME.sidebar.bgActive : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = THEME.sidebar.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>

                    {/* Pastille de nombre rouge (#E24B4A) */}
                    {item.badge !== undefined && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-[12px] font-bold"
                        style={{
                          backgroundColor: THEME.sidebar.badgeRedBg,
                          color: THEME.sidebar.badgeRed
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bas : Réglages et sortie vers Espace Étudiant */}
          <div className="p-3 border-t border-white/10 space-y-1 shrink-0 text-[13px]">
            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer text-left ${
                activeManagerTab === 'settings' 
                  ? 'text-white font-semibold' 
                  : 'text-slate-300 hover:text-white'
              }`}
              style={{
                backgroundColor: activeManagerTab === 'settings' ? THEME.sidebar.bgActive : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (activeManagerTab !== 'settings') e.currentTarget.style.backgroundColor = THEME.sidebar.bgHover;
              }}
              onMouseLeave={(e) => {
                if (activeManagerTab !== 'settings') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Réglages</span>
            </button>

            <button
              type="button"
              onClick={logoutManager}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer text-left"
              title="Sortir vers l'espace étudiant"
            >
              <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Espace Étudiant</span>
            </button>
          </div>
        </aside>
      )}

      {/* 2. DRAWER MOBILE (< 1280px) : MENU COULISSANT BLEU MARINE (#0F2742) */}
      {isMobileOrTablet && (
        <>
          {/* Backdrop Layer semi-transparent : z-40, visible seulement si drawer ouvert */}
          <div 
            onClick={() => setMobileDrawerOpen(false)}
            className={`fixed inset-0 bg-slate-950/70 z-40 backdrop-blur-xs transition-opacity duration-200 ${
              mobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Tiroir coulissant fixe à gauche : w-[240px], z-50, translation fluide */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`fixed left-0 top-0 h-full w-[240px] z-50 transform transition-transform duration-250 ease-in-out flex flex-col justify-between shadow-2xl border-r border-white/10 ${
              mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ backgroundColor: THEME.sidebar.bg, color: THEME.sidebar.text }}
          >
            {/* Drawer Top */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="h-12 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
                <div 
                  onClick={() => handleTabClick('dashboard')}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-2xs"
                    style={{ backgroundColor: THEME.topbar.btnLoanOrange }}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[16px] tracking-tight text-white font-sans">
                    BiblioPrêt
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Drawer Navigation */}
              <nav className="p-3 space-y-1.5 overflow-y-auto flex-1 text-[13px]">
                {navItems.map(item => {
                  const isActive = activeManagerTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer text-left ${
                        isActive 
                          ? 'text-white font-semibold' 
                          : 'text-slate-300 hover:text-white'
                      }`}
                      style={{
                        backgroundColor: isActive ? THEME.sidebar.bgActive : 'transparent'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[12px] font-bold"
                          style={{
                            backgroundColor: THEME.sidebar.badgeRedBg,
                            color: THEME.sidebar.badgeRed
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom */}
            <div className="p-3 border-t border-white/10 space-y-1.5 shrink-0 text-[13px]">
              <button
                type="button"
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition cursor-pointer text-left ${
                  activeManagerTab === 'settings' ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
                style={{
                  backgroundColor: activeManagerTab === 'settings' ? THEME.sidebar.bgActive : 'transparent'
                }}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Réglages</span>
              </button>

              <button
                type="button"
                onClick={logoutManager}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Espace Étudiant</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 3. CONTENEUR PRINCIPAL (DÉCALÉ DE 240px SUR DESKTOP ≥ 1280px, PLEINE LARGEUR SUR MOBILE) */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ paddingLeft: isMobileOrTablet ? '0px' : '240px' }}
      >
        {/* BARRE DU HAUT FINE (48px) FOND BLANC (#FFFFFF), BORDURE INFÉRIEURE 1px #E3E8EF */}
        <header 
          className="sticky top-0 z-20 h-12 flex items-center justify-between px-3 sm:px-6 select-none"
          style={{
            backgroundColor: THEME.topbar.bg,
            borderBottom: `1px solid ${THEME.topbar.border}`
          }}
        >
          {/* Gauche : Sur mobile (< 1280px), bouton hamburger visible avec icône blanche 24px */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobileOrTablet && (
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(prev => !prev);
                }}
                className="h-9 w-9 rounded-lg flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 z-20"
                style={{ backgroundColor: THEME.sidebar.bg }}
                aria-label="Ouvrir le menu de navigation"
                title="Menu de navigation"
              >
                <Menu className="w-6 h-6 text-white" style={{ color: '#FFFFFF', width: 24, height: 24 }} />
              </button>
            )}

            <div className="flex items-baseline gap-2 truncate">
              <span 
                className="text-[14px] font-bold tracking-tight truncate"
                style={{ color: THEME.topbar.title }}
              >
                {TAB_TITLES[activeManagerTab] || 'Gestionnaire'}
              </span>
              <span 
                className="text-[12px] hidden sm:inline capitalize"
                style={{ color: THEME.topbar.dateText }}
              >
                · {formattedDate}
              </span>
            </div>
          </div>

          {/* Droite : Recherche Ctrl+K, Scanner un retour (contour), Scanner un emprunt (orange), 16px d'espace à droite */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 pr-4">
            
            {/* Recherche globale Ctrl+K (desktop) */}
            {!isMobileOrTablet && (
              <button
                onClick={() => setIsGlobalSearchOpen(true)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-slate-600 text-xs transition cursor-pointer"
                title="Recherche globale (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 text-[11px]">Rechercher</span>
                <kbd className="px-1 py-0.2 text-[9px] font-mono bg-white border border-slate-200 rounded text-slate-400">
                  Ctrl+K
                </kbd>
              </button>
            )}

            {/* Bouton « Scanner un retour » (contour, bordure #0F2742, texte noir, h=36) */}
            <button
              onClick={() => setIsScanReturnOpen(true)}
              className="h-9 px-2.5 sm:px-3 rounded-lg bg-transparent hover:bg-slate-50 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
              style={{
                border: `1px solid ${THEME.topbar.btnReturnBorder}`
              }}
              title="Scanner un retour d'exemplaire"
            >
              <Barcode className="w-4 h-4 text-slate-800" />
              <span className="hidden sm:inline">Scanner un retour</span>
            </button>

            {/* Bouton « Scanner un emprunt » (fond orange #E8741A, texte blanc, icône scan, h=36) */}
            <button
              onClick={() => openNewLoan()}
              className="h-9 px-2.5 sm:px-3 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
              style={{
                backgroundColor: THEME.topbar.btnLoanOrange
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = THEME.topbar.btnLoanOrangeHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.topbar.btnLoanOrange}
              title="Scanner un emprunt (exemplaire + carte)"
            >
              <Scan className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Scanner un emprunt</span>
            </button>
          </div>
        </header>

        {/* 4. ZONE DE CONTENU : sur desktop padding 24px, sur mobile padding 16px, fond #F4F7FB */}
        <main 
          className="flex-1 min-w-0" 
          style={{ 
            backgroundColor: THEME.content.bg,
            padding: isMobileOrTablet ? '16px' : '24px'
          }}
        >
          {children}
        </main>

      </div>

    </div>
  );
};
