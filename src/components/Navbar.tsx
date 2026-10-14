import React from 'react';
import { 
  BookOpen, 
  ArrowLeftRight, 
  Library, 
  Users, 
  History, 
  PlusCircle, 
  Search, 
  AlertTriangle,
  Download,
  RotateCcw,
  Camera,
  LogOut,
  Shield,
  Calendar,
  Layers,
  Mail,
  FastForward,
  BookCheck,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useLibrary, ManagerTab } from '../context/LibraryContext';

export const Navbar: React.FC = () => {
  const { 
    userRole,
    logoutManager,
    setIsManagerLoginOpen,
    activeManagerTab, 
    setActiveManagerTab, 
    openNewLoan, 
    setIsScanReturnOpen,
    stats, 
    setIsQRScannerOpen,
    exportDatabaseJSON,
    resetToDefaultData,
    currentDate,
    isSimulatedDate,
    setSimulatedDate,
    resetSimulatedDate,
    advanceOneDay,
    advanceDays,
    setIsGlobalSearchOpen
  } = useLibrary();

  const navItems: { id: ManagerTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <Library className="w-4 h-4" />
    },
    {
      id: 'loans',
      label: 'Prêts en cours',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      badge: stats.empruntsEnRetard > 0 ? stats.empruntsEnRetard : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'catalog',
      label: 'Catalogue & Exemplaires',
      icon: <Layers className="w-4 h-4" />,
      badge: stats.totalOuvrages,
      badgeColor: 'bg-slate-200 text-slate-700'
    },
    {
      id: 'students',
      label: 'Étudiants Inscrits',
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 'history',
      label: 'Historique des Retours',
      icon: <History className="w-4 h-4" />
    },
    {
      id: 'queue',
      label: 'Files d\'attente & E-mails',
      icon: <Mail className="w-4 h-4" />,
      badge: stats.demandesEnAttente > 0 ? stats.demandesEnAttente : undefined,
      badgeColor: 'bg-blue-600 text-white'
    },
    {
      id: 'alerts',
      label: 'Alertes',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: (stats.empruntsEnRetard + stats.rupturesStock) > 0 ? (stats.empruntsEnRetard + stats.rupturesStock) : undefined,
      badgeColor: stats.empruntsAContacter > 0 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-rose-600 text-white'
    }
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-xs font-sans">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-14 gap-3">
          
          {/* Logo & Brand (simple, sans sous-titre redondant) */}
          <div className="flex items-center gap-3 shrink-0">
            <div 
              onClick={() => setActiveManagerTab('dashboard')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-base tracking-tight text-white">BiblioPrêt</span>
                <span className="text-xs text-slate-400 font-normal">Universitaire</span>
              </div>
            </div>

            {/* Badge Date simulée (affiché UNIQUEMENT si date simulée active) */}
            {isSimulatedDate && (
              <button
                onClick={() => setActiveManagerTab('settings')}
                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
                title="Date simulée active — Cliquez pour modifier dans Réglages"
              >
                Date simulée : {new Date(currentDate).toLocaleDateString('fr-FR')}
              </button>
            )}
          </div>

          {/* Right actions: Recherche, Scans uniques, Réglages, Espace étudiant */}
          <div className="flex items-center space-x-2">
            
            {/* Global Search Ctrl+K */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
              title="Recherche globale rapide (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline text-slate-400">Rechercher</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">
                Ctrl+K
              </kbd>
            </button>

            {/* UN SEUL ENDROIT : Scanner un retour */}
            <button
              onClick={() => setIsScanReturnOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition active:scale-95"
              title="Scanner la restitution d'un livre (plein écran)"
            >
              <BookCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Scanner un retour</span>
            </button>

            {/* UN SEUL ENDROIT : Scanner un emprunt (Action principale orange) */}
            <button
              onClick={() => openNewLoan()}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-2xs transition active:scale-95"
              title="Scanner le livre et la carte pour enregistrer un emprunt (plein écran)"
            >
              <Camera className="w-3.5 h-3.5 text-amber-100" />
              <span>Scanner un emprunt</span>
            </button>

            {/* Outils de test & Réglages (icône engrenage discrète) */}
            <button
              onClick={() => setActiveManagerTab('settings')}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ${
                activeManagerTab === 'settings' ? 'text-amber-300 bg-slate-800' : ''
              }`}
              title="Réglages & Outils de test"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Guide & Protocoles Aide */}
            <button
              onClick={() => setActiveManagerTab('help')}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ${
                activeManagerTab === 'help' ? 'text-amber-300 bg-slate-800' : ''
              }`}
              title="Guide & Protocole scan"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Espace étudiant */}
            <button
              onClick={logoutManager}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Basculer vers l'espace étudiant"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Espace étudiant</span>
            </button>

          </div>

        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-1.5 no-scrollbar border-t border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeManagerTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveManagerTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-normal'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
