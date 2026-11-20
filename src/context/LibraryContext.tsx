import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Ouvrage, 
  Exemplaire, 
  Adherent, 
  Emprunt, 
  EmailNotification,
  Emplacement, 
  
  StatutExemplaire,
  BookCategory,
  UserRole,
  MessageLevel
} from '../types';
import { 
  INITIAL_OUVRAGES, 
  INITIAL_EXEMPLAIRES, 
  INITIAL_ADHERENTS, 
  INITIAL_EMPRUNTS,
  INITIAL_NOTIFICATIONS,
  LOCAL_COVERS_MAP
} from '../data/mockData';
import { ConnectedStudent } from '../services/authService';
import { getNotificationTypeForLevel } from '../utils/overdueUtils';

export { LOCAL_COVERS_MAP };

export type ManagerTab = 'dashboard' | 'loans' | 'catalog' | 'students' | 'history' | 'alerts' | 'settings' | 'help';

interface LibraryContextType {
  // Role & Authentication
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isManagerLoginOpen: boolean;
  setIsManagerLoginOpen: (open: boolean) => void;
  loginAsManager: () => void;
  logoutManager: () => void;
  activeManagerTab: ManagerTab;
  setActiveManagerTab: (tab: ManagerTab) => void;

  // Date réelle
  currentDate: string; // YYYY-MM-DD
  allowedAcademicDomain: string;
  setAllowedAcademicDomain: (domain: string) => void;
  ensureStudentAdherent: (student: ConnectedStudent) => Adherent;

  // Core Data
  ouvrages: Ouvrage[];
  exemplaires: Exemplaire[];
  adherents: Adherent[];
  emprunts: Emprunt[];
  notifications: EmailNotification[];

  // Dynamic Calculated Helpers (Never stored, calculated on the fly)
  getOuvrageById: (id: string) => Ouvrage | undefined;
  getExemplaireById: (id: string) => Exemplaire | undefined;
  getExemplaireByQR: (codeQR: string) => Exemplaire | undefined;
  getAdherentById: (id: string) => Adherent | undefined;
  getAdherentByNumero: (numero: string) => Adherent | undefined;
  getExemplairesByOuvrage: (ouvrageId: string) => Exemplaire[];
  getAvailableCopiesCount: (ouvrageId: string) => number;
  getTotalCopiesCount: (ouvrageId: string) => number;
  
  // Student authorization check (rule 3)
  isAdherentAutorise: (adherentId: string) => { autorise: boolean; motif?: string };
  getAdherentActiveEmprunts: (adherentId: string) => Emprunt[];
  
  // Overdue calculation (rule 5)
  isEmpruntEnRetard: (emprunt: Emprunt) => boolean;
  getJoursDeRetard: (dateRetourPrevue: string) => number;
  isEmpruntAContacter: (emprunt: Emprunt) => boolean;
  recordManualReminder: (empruntId: string, payload: { level: MessageLevel; subject: string; body: string; daysLate: number }) => void;
  recordGroupReminders: (
    items: Array<{ empruntId: string; level: MessageLevel; subject: string; body: string; daysLate: number }>
  ) => Array<{
    empruntId: string;
    notificationId: string;
    previousNbRappels: number;
    previousDateDernierRappel?: string;
    previousDernierNiveauMessage?: MessageLevel;
    previousDernierJourRetardMessage?: number;
  }>;
  revertGroupReminders: (
    records: Array<{
      empruntId: string;
      notificationId: string;
      previousNbRappels: number;
      previousDateDernierRappel?: string;
      previousDernierNiveauMessage?: MessageLevel;
      previousDernierJourRetardMessage?: number;
    }>
  ) => void;
  markLoansAsContacted: (empruntIds: string[]) => { count: number };

  // Configuration
  loanDurationDays: number;
  setLoanDurationDays: (days: number) => void;

  // Actions
  addOuvrage: (
    data: Omit<Ouvrage, 'id'>, 
    nbExemplaires: number, 
    emplacement: Emplacement
  ) => { ouvrage: Ouvrage; exemplaires: Exemplaire[] };
  addBulkOuvrages: (
    items: Array<{
      isbn: string;
      titre: string;
      auteur: string;
      editeur: string;
      anneeEdition: number;
      pagination: number;
      resume: string;
      coverUrl: string;
      categorie: BookCategory;
    }>,
    copiesPerBook: number
  ) => { addedOuvrages: Ouvrage[]; addedExemplaires: Exemplaire[]; skippedCount: number };
  updateOuvrage: (id: string, updates: Partial<Ouvrage>) => void;
  
  addExemplairesToOuvrage: (
    ouvrageId: string, 
    count: number, 
    emplacement: Emplacement
  ) => Exemplaire[];
  updateExemplaire: (id: string, updates: Partial<Exemplaire>) => void;
  
  // Physical life management actions
  declarerPerdu: (id: string) => { success: boolean };
  declarerRetrouve: (id: string) => { success: boolean };

  // Loans & Returns by Scan (Without typing)
  addLoan: (
    exemplaireId: string, 
    adherentId: string, 
    notes?: string
  ) => { success: boolean; error?: string; emprunt?: Emprunt };

  cancelLoan: (empruntId: string) => { success: boolean; error?: string };
  addLoanByScan: (
    exemplaireCodeOrId: string,
    studentCodeOrId: string
  ) => {
    success: boolean;
    error?: string;
    emprunt?: Emprunt;
    ouvrage?: Ouvrage;
    exemplaire?: Exemplaire;
    adherent?: Adherent;
  };
  
  returnLoan: (
    empruntId: string, 
    notes?: string
  ) => { success: boolean; exemplaire?: Exemplaire; emplacement?: Emplacement };

  markLoanReclasse: (empruntId?: string, codeQR?: string) => void;
  returnByScan: (
    exemplaireCodeOrId: string
  ) => {
    success: boolean;
    error?: string;
    hadActiveLoan: boolean;
    exemplaire?: Exemplaire;
    emplacement?: Emplacement;
    ouvrage?: Ouvrage;
    adherent?: Adherent;
    isOverdue?: boolean;
    daysLate?: number;
  };

  // QR Scanning & Lookups
  isQRScannerOpen: boolean;
  setIsQRScannerOpen: (open: boolean) => void;
  isScanReturnOpen: boolean;
  setIsScanReturnOpen: (open: boolean) => void;
  scanQRCode: (code: string) => { found: boolean; type?: 'exemplaire' | 'adherent'; item?: any };

  // Selected sheets & Modals
  scannedExemplaire: Exemplaire | null;
  setScannedExemplaire: (ex: Exemplaire | null) => void;
  selectedOuvrage: Ouvrage | null;
  setSelectedOuvrage: (ow: Ouvrage | null) => void;
  selectedAdherent: Adherent | null;
  setSelectedAdherent: (adh: Adherent | null) => void;
  activePrintLabelsOuvrageId: string | null;
  setActivePrintLabelsOuvrageId: (id: string | null) => void;
  activePrintLabelExemplaireIds: string[] | null;
  setActivePrintLabelExemplaireIds: (ids: string[] | null) => void;
  activeReceiptEmprunt: Emprunt | null;
  setActiveReceiptEmprunt: (emp: Emprunt | null) => void;

  // New Loan Modal state
  isNewLoanOpen: boolean;
  setIsNewLoanOpen: (open: boolean) => void;
  preselectedOuvrageId?: string;
  preselectedExemplaireId?: string;
  preselectedAdherentId?: string;
  openNewLoan: (ouvrageId?: string, adherentId?: string, exemplaireId?: string) => void;

  // Other modals
  isNewOuvrageOpen: boolean;
  setIsNewOuvrageOpen: (open: boolean) => void;
  isImportStudentsOpen: boolean;
  setIsImportStudentsOpen: (open: boolean) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;

  // Import function
  importStudentsFromCSV: (csvContent: string) => {
    success: boolean;
    errors?: string[];
    stats?: {
      created: number;
      updated: number;
      resilies: number;
      total: number;
    };
  };

  // Stats for Manager Dashboard
  stats: {
    totalOuvrages: number;
    totalExemplaires: number;
    disponiblesEnRayon: number;
    empruntsEnCours: number;
    empruntsEnRetard: number;
    empruntsAContacter: number;
    rupturesStock: number;
    adherentsActifs: number;
    notificationsTotal: number;
  };

  // Maintenance
  resetToDefaultData: () => void;
  exportDatabaseJSON: () => void;
  syncLocalCovers: () => Promise<{ success: boolean; count: number; error?: string }>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const STORAGE_KEY_OUVRAGES = 'unilib_ouvrages_v8';
const STORAGE_KEY_EXEMPLAIRES = 'unilib_exemplaires_v8';
const STORAGE_KEY_ADHERENTS = 'unilib_adherents_v8';
const STORAGE_KEY_EMPRUNTS = 'unilib_emprunts_v8';
const STORAGE_KEY_NOTIFICATIONS = 'unilib_notifications_v8';
const STORAGE_KEY_ROLE = 'unilib_role_v8';
const STORAGE_KEY_DEMO_40_MIGRATED = 'unilib_demo_40_migrated';

export const addDaysToDate = (baseDateStr: string, days: number): string => {
  const parts = baseDateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Role
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE);
      return (saved as UserRole) || 'student';
    } catch {
      return 'student';
    }
  });

  const [activeManagerTab, setActiveManagerTabState] = useState<ManagerTab>(() => {
    try {
      const stateTab = window.history.state?.managerTab as ManagerTab | undefined;
      return stateTab || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const setActiveManagerTab = (tab: ManagerTab) => {
    setActiveManagerTabState(prev => {
      if (prev !== tab) {
        try {
          window.history.pushState({ managerTab: tab }, '', window.location.pathname + window.location.search);
        } catch {}
      }
      return tab;
    });
  };

  useEffect(() => {
    try {
      if (!window.history.state?.managerTab) {
        window.history.replaceState({ managerTab: activeManagerTab }, '', window.location.pathname + window.location.search);
      }
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      const targetTab = (e.state?.managerTab as ManagerTab | undefined) || 'dashboard';
      setActiveManagerTabState(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isManagerLoginOpen, setIsManagerLoginOpen] = useState(false);

  // Date réelle du jour
  const currentDate = new Date().toISOString().split('T')[0];
  const [allowedAcademicDomain, setAllowedAcademicDomainState] = useState<string>(() => {
    try {
      const migrated = localStorage.getItem('biblio_all_accounts_migrated_v1');
      const saved = localStorage.getItem('biblio_academic_domain');
      if (!migrated) {
        localStorage.setItem('biblio_all_accounts_migrated_v1', '1');
        if (!saved || saved === '@gmail.com' || saved === '@usmba.ac.ma') {
          localStorage.setItem('biblio_academic_domain', '*');
          return '*';
        }
      }
      if (!saved) {
        localStorage.setItem('biblio_academic_domain', '*');
        return '*';
      }
      return saved;
    } catch {
      return '*';
    }
  });

  const setAllowedAcademicDomain = (domain: string) => {
  const clean = domain.trim().toLowerCase();

  const formatted = (!clean || clean === '*' || clean === 'all')
    ? '*'
    : clean
        .split(',')
        .map(item => {
          const value = item.trim().replace(/^@+/, '');
          return value ? `@${value}` : '';
        })
        .filter(Boolean)
        .join(', ');

  setAllowedAcademicDomainState(formatted);

  try {
    localStorage.setItem('biblio_academic_domain', formatted);
  } catch (err) {
    console.error('Erreur sauvegarde domaine:', err);
  }
};

  const deduplicateByNumero = (list: Adherent[]): Adherent[] => {
    const map = new Map<string, Adherent>();
    for (const adh of list) {
      const key = (adh.numeroEtudiant || '').trim().toUpperCase();
      if (!key) continue;
      if (map.has(key)) {
        const prev = map.get(key)!;
        map.set(key, { ...prev, ...adh, id: prev.id || adh.id });
      } else {
        map.set(key, adh);
      }
    }
    return Array.from(map.values());
  };

  // Remplacement unique des anciennes données de démonstration (ETU-2026-*) par les 40 adhérents (ETU-001 à ETU-040)
  const shouldMigrateOldDemo = (() => {
    try {
      if (localStorage.getItem(STORAGE_KEY_DEMO_40_MIGRATED) === '1') return false;
      const savedAdh = localStorage.getItem(STORAGE_KEY_ADHERENTS);
      if (!savedAdh) {
        localStorage.setItem(STORAGE_KEY_DEMO_40_MIGRATED, '1');
        return false;
      }
      const parsed = JSON.parse(savedAdh);
      const hasOldDemo = Array.isArray(parsed) && parsed.some((a: any) =>
        a?.id === 'adh_user' || String(a?.numeroEtudiant || '').startsWith('ETU-2026-')
      );
      if (hasOldDemo) {
        localStorage.setItem(STORAGE_KEY_EXEMPLAIRES, JSON.stringify(INITIAL_EXEMPLAIRES));
        localStorage.setItem(STORAGE_KEY_ADHERENTS, JSON.stringify(INITIAL_ADHERENTS));
        localStorage.setItem(STORAGE_KEY_EMPRUNTS, JSON.stringify(INITIAL_EMPRUNTS));
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      }
      localStorage.setItem(STORAGE_KEY_DEMO_40_MIGRATED, '1');
      return hasOldDemo;
    } catch {
      return false;
    }
  })();

  const ensureStudentAdherent = (student: ConnectedStudent): Adherent => {
    const cleanEmail = student.email.trim().toLowerCase();
    const existing = adherents.find(a =>
      (a.emailAcademique && a.emailAcademique.trim().toLowerCase() === cleanEmail) ||
      a.id === student.id
    );
    if (existing) return existing;

    const currD = new Date(currentDate);
    const currYear = currD.getFullYear();
    const currMonth = currD.getMonth() + 1;
    const targetEndYear = currMonth >= 9 ? currYear + 1 : currYear;
    const endOfAcademicYear = `${targetEndYear}-08-31`;

    const newAdh: Adherent = {
      id: student.id || `adh_${Date.now()}`,
      numeroEtudiant: `ETU-${String(adherents.length + 1).padStart(3, '0')}`,
      nom: student.prenom ? 'Étudiant' : cleanEmail.split('@')[0],
      prenom: student.prenom || 'Lecteur',
      emailAcademique: cleanEmail,
      dateInscription: currentDate,
      dateExpiration: endOfAcademicYear,
      statut: 'actif'
    };

    setAdherents(prev => {
      const upperNum = newAdh.numeroEtudiant.trim().toUpperCase();
      const idx = prev.findIndex(a => a.numeroEtudiant.trim().toUpperCase() === upperNum);
      const updated = idx >= 0
        ? prev.map((a, i) => (i === idx ? { ...a, ...newAdh, id: a.id } : a))
        : [newAdh, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_ADHERENTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    return newAdh;
  };

  // Core Data
  const [ouvrages, setOuvrages] = useState<Ouvrage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OUVRAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const needsResumeMigration = localStorage.getItem('unilib_resumes_5sentences_v1') !== '1';
          const initialById = new Map(INITIAL_OUVRAGES.map(item => [item.id, item]));
          const migratedList = parsed.map((o: Ouvrage) => {
            let next = o;
            // Si une couverture locale dédiée existe et que l'URL actuelle est vide ou openlibrary ou obsolète
            if (LOCAL_COVERS_MAP[next.id] && (!next.coverUrl || next.coverUrl.includes('openlibrary.org') || !next.coverUrl.startsWith('/covers/'))) {
              next = { ...next, coverUrl: LOCAL_COVERS_MAP[next.id] };
            }
            if (needsResumeMigration) {
              const seed = initialById.get(next.id);
              if (seed && (!next.resume || next.resume.trim().length < seed.resume.length)) {
                next = { ...next, resume: seed.resume };
              }
            }
            return next;
          });
          if (needsResumeMigration) {
            localStorage.setItem('unilib_resumes_5sentences_v1', '1');
          }
          return migratedList;
        }
      }
      localStorage.setItem('unilib_resumes_5sentences_v1', '1');
      return INITIAL_OUVRAGES;
    } catch {
      return INITIAL_OUVRAGES;
    }
  });

  const [exemplaires, setExemplaires] = useState<Exemplaire[]>(() => {
    if (shouldMigrateOldDemo) return INITIAL_EXEMPLAIRES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXEMPLAIRES);
      const list = saved ? JSON.parse(saved) : INITIAL_EXEMPLAIRES;
      return list.map((e: any) => ({
        id: e.id,
        ouvrageId: e.ouvrageId,
        codeQR: e.codeQR,
        emplacement: e.emplacement,
        statut: (e.statut === 'EN_REPARATION' || e.statut === 'DETRUIT') ? 'DISPONIBLE' : (e.statut || 'DISPONIBLE')
      }));
    } catch {
      return INITIAL_EXEMPLAIRES;
    }
  });

  const [adherents, setAdherents] = useState<Adherent[]>(() => {
    if (shouldMigrateOldDemo) return INITIAL_ADHERENTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADHERENTS);
      const list = saved ? JSON.parse(saved) : INITIAL_ADHERENTS;
      const initialByNum = new Map(
        INITIAL_ADHERENTS.map(a => [a.numeroEtudiant.trim().toUpperCase(), a])
      );
      const cleaned = list.map((a: any) => {
        const { codeQR, ...cleanAdh } = a;
        const numKey = String(cleanAdh.numeroEtudiant || '').trim().toUpperCase();
        const seed = initialByNum.get(numKey);
        return {
          ...cleanAdh,
          filiere: cleanAdh.filiere || seed?.filiere,
          niveau: cleanAdh.niveau || seed?.niveau
        } as Adherent;
      });
      return deduplicateByNumero(cleaned);
    } catch {
      return INITIAL_ADHERENTS;
    }
  });

  const [emprunts, setEmprunts] = useState<Emprunt[]>(() => {
    if (shouldMigrateOldDemo) return INITIAL_EMPRUNTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPRUNTS);
      const list = saved ? JSON.parse(saved) : INITIAL_EMPRUNTS;
      return list.map((l: any) => {
        const { etatAuRetour, ...cleanLoan } = l;
        if (!cleanLoan.dernierNiveauMessage && (cleanLoan.nbRappels || 0) > 0) {
          cleanLoan.dernierNiveauMessage = cleanLoan.nbRappels === 1 ? 'J+1' : 'J+2';
          cleanLoan.dernierJourRetardMessage = cleanLoan.nbRappels === 1 ? 1 : 2;
        }
        return cleanLoan;
      });
    } catch {
      return INITIAL_EMPRUNTS;
    }
  });


  const [notifications, setNotifications] = useState<EmailNotification[]>(() => {
    if (shouldMigrateOldDemo) return INITIAL_NOTIFICATIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (!saved) return INITIAL_NOTIFICATIONS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_NOTIFICATIONS;
      return parsed.map((n: EmailNotification) => {
        if (n.niveauMessage) return n;
        const inferredLevel: MessageLevel =
          n.type === 'RAPPEL_RETARD_1' || n.type === 'MESSAGE_J1'
            ? 'J+1'
            : n.type === 'RAPPEL_RETARD_2' || n.type === 'MESSAGE_J2'
              ? 'J+2'
              : n.type === 'MESSAGE_J5'
                ? 'J+5'
                : n.type === 'MESSAGE_J6'
                  ? 'J+6'
                  : n.type === 'MESSAGE_J7_PLUS'
                    ? 'J+7+'
                    : 'J+3-4';
        return { ...n, niveauMessage: inferredLevel };
      });
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Modals & Sheets
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scannedExemplaire, setScannedExemplaire] = useState<Exemplaire | null>(null);
  const [selectedOuvrage, setSelectedOuvrage] = useState<Ouvrage | null>(null);
  const [selectedAdherent, setSelectedAdherent] = useState<Adherent | null>(null);
  const [activePrintLabelsOuvrageId, setActivePrintLabelsOuvrageIdState] = useState<string | null>(null);
  const [activePrintLabelExemplaireIds, setActivePrintLabelExemplaireIdsState] = useState<string[] | null>(null);
  const [activeReceiptEmprunt, setActiveReceiptEmprunt] = useState<Emprunt | null>(null);

  const setActivePrintLabelsOuvrageId = (id: string | null) => {
    setActivePrintLabelExemplaireIdsState(null);
    setActivePrintLabelsOuvrageIdState(id);
  };

  const setActivePrintLabelExemplaireIds = (ids: string[] | null) => {
    setActivePrintLabelsOuvrageIdState(null);
    setActivePrintLabelExemplaireIdsState(ids);
  };

  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [preselectedOuvrageId, setPreselectedOuvrageId] = useState<string | undefined>();
  const [preselectedExemplaireId, setPreselectedExemplaireId] = useState<string | undefined>();
  const [preselectedAdherentId, setPreselectedAdherentId] = useState<string | undefined>();

  const [isNewOuvrageOpen, setIsNewOuvrageOpen] = useState(false);
  const [isImportStudentsOpen, setIsImportStudentsOpen] = useState(false);
  const [isScanReturnOpen, setIsScanReturnOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [loanDurationDays, setLoanDurationDays] = useState<number>(15);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Import students from CSV provided by university registration service
  const importStudentsFromCSV = (csvContent: string) => {
    if (!csvContent || !csvContent.trim()) {
      return {
        success: false,
        errors: ["Le fichier d'importation est vide."]
      };
    }

    // Normalize line endings
    const lines = csvContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        errors: ["Le fichier ne contient aucune ligne."]
      };
    }

    // Detect delimiter
    const headerLine = lines[0];
    let delimiter = ',';
    if (headerLine.includes(';') && (headerLine.split(';').length >= headerLine.split(',').length)) {
      delimiter = ';';
    } else if (headerLine.includes('\t')) {
      delimiter = '\t';
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseCSVLine(headerLine).map(h => 
      h.toLowerCase()
       .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
       .replace(/[^a-z0-9]/g, '')
    );

    // Identify required columns & optional columns (filiere, niveau)
    const idxNum = headers.findIndex(h => 
      h.includes('numero') || h.includes('etudiant') || h.includes('cne') || h.includes('matricule') || h === 'id'
    );
    const idxNom = headers.findIndex(h => h === 'nom' || (h.includes('nom') && !h.includes('prenom')));
    const idxPrenom = headers.findIndex(h => h.includes('prenom'));
    const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('courriel'));
    const idxFiliere = headers.findIndex(h => h.includes('filiere') || h.includes('departement') || h.includes('branche'));
    const idxNiveau = headers.findIndex(h => h.includes('niveau') || h.includes('cycle') || h.includes('annee') || h.includes('semestre'));

    const missingColumns: string[] = [];
    if (idxNum === -1) missingColumns.push("Numéro d'étudiant");
    if (idxNom === -1) missingColumns.push("Nom");
    if (idxPrenom === -1) missingColumns.push("Prénom");
    if (idxEmail === -1) missingColumns.push("E-mail académique");

    if (missingColumns.length > 0) {
      return {
        success: false,
        errors: [
          `Fichier rejeté en entier : colonne(s) obligatoire(s) manquante(s) : ${missingColumns.join(', ')}.`,
          `En-têtes détectés : [${parseCSVLine(headerLine).join(', ')}]`,
          "Le fichier doit comporter : Numéro d'étudiant, Nom, Prénom, E-mail académique."
        ]
      };
    }

    // Validate all rows
    const errors: string[] = [];
    interface ParsedRow {
      lineNum: number;
      numeroEtudiant: string;
      nom: string;
      prenom: string;
      emailAcademique: string;
      filiere?: string;
      niveau?: string;
    }
    const parsedRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      const row = parseCSVLine(lines[i]);
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const numeroEtudiant = (row[idxNum] || '').trim();
      const nom = (row[idxNom] || '').trim();
      const prenom = (row[idxPrenom] || '').trim();
      const emailAcademique = (row[idxEmail] || '').trim();
      const filiere = idxFiliere >= 0 ? (row[idxFiliere] || '').trim() : '';
      const niveau = idxNiveau >= 0 ? (row[idxNiveau] || '').trim() : '';

      if (!numeroEtudiant) {
        errors.push(`Ligne ${lineNum} : Le numéro d'étudiant est vide.`);
      }

      parsedRows.push({
        lineNum,
        numeroEtudiant,
        nom,
        prenom,
        emailAcademique,
        filiere: filiere || undefined,
        niveau: niveau || undefined
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors: [
          `Fichier rejeté en entier : ${errors.length} anomalie(s) détectée(s) :`,
          ...errors.slice(0, 10),
          ...(errors.length > 10 ? [`...et ${errors.length - 10} autre(s) erreur(s).`] : [])
        ]
      };
    }

    // Determine academic year expiration date (August 31)
    const currD = new Date(currentDate);
    const currYear = currD.getFullYear();
    const currMonth = currD.getMonth() + 1; // 1-12
    const targetEndYear = currMonth >= 9 ? currYear + 1 : currYear;
    const endOfAcademicYear = `${targetEndYear}-08-31`;

    let createdCount = 0;
    let updatedCount = 0;
    let resiliesCount = 0;

    const importedNumeros = new Set<string>();

    // Copy existing students list
    let updatedAdherents = [...adherents];

    parsedRows.forEach(row => {
      const upperNum = row.numeroEtudiant.toUpperCase();
      importedNumeros.add(upperNum);

      const existingIndex = updatedAdherents.findIndex(
        a => a.numeroEtudiant.trim().toUpperCase() === upperNum
      );

      if (existingIndex >= 0) {
        // Update existing student and renew validity
        updatedAdherents[existingIndex] = {
          ...updatedAdherents[existingIndex],
          nom: row.nom || updatedAdherents[existingIndex].nom,
          prenom: row.prenom || updatedAdherents[existingIndex].prenom,
          emailAcademique: row.emailAcademique || updatedAdherents[existingIndex].emailAcademique,
          filiere: row.filiere !== undefined ? row.filiere : updatedAdherents[existingIndex].filiere,
          niveau: row.niveau !== undefined ? row.niveau : updatedAdherents[existingIndex].niveau,
          dateExpiration: endOfAcademicYear,
          statut: 'actif'
        };
        updatedCount++;
      } else {
        // Create new student
        const newStudent: Adherent = {
          id: `adh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          numeroEtudiant: row.numeroEtudiant,
          nom: row.nom,
          prenom: row.prenom,
          emailAcademique: row.emailAcademique,
          ...(row.filiere ? { filiere: row.filiere } : {}),
          ...(row.niveau ? { niveau: row.niveau } : {}),
          dateInscription: currentDate,
          dateExpiration: endOfAcademicYear,
          statut: 'actif'
        };
        updatedAdherents.push(newStudent);
        createdCount++;
      }
    });

    // Students absent from the new list are set to 'resilie'
    updatedAdherents = updatedAdherents.map(adh => {
      const upperNum = adh.numeroEtudiant.trim().toUpperCase();
      if (!importedNumeros.has(upperNum)) {
        if (adh.statut === 'actif') {
          resiliesCount++;
        }
        return {
          ...adh,
          statut: 'resilie'
        };
      }
      return adh;
    });

    setAdherents(updatedAdherents);

    return {
      success: true,
      stats: {
        created: createdCount,
        updated: updatedCount,
        resilies: resiliesCount,
        total: parsedRows.length
      }
    };
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OUVRAGES, JSON.stringify(ouvrages));
  }, [ouvrages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXEMPLAIRES, JSON.stringify(exemplaires));
  }, [exemplaires]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ADHERENTS, JSON.stringify(adherents));
  }, [adherents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EMPRUNTS, JSON.stringify(emprunts));
  }, [emprunts]);


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, userRole);
  }, [userRole]);

  const loginAsManager = () => {
    setUserRole('manager');
  };

  const logoutManager = () => {
    setUserRole('student');
  };

  // Lookup helpers
  const getOuvrageById = (id: string) => ouvrages.find(o => o.id === id);
  const getExemplaireById = (id: string) => exemplaires.find(e => e.id === id);
  const getExemplaireByQR = (codeQR: string) => exemplaires.find(e => e.codeQR.trim().toUpperCase() === codeQR.trim().toUpperCase());
  const getAdherentById = (id: string) => adherents.find(a => a.id === id);
  const getAdherentByNumero = (num: string) => adherents.find(a => a.numeroEtudiant.trim().toUpperCase() === num.trim().toUpperCase());

  const getExemplairesByOuvrage = (ouvrageId: string) => {
    return exemplaires.filter(e => e.ouvrageId === ouvrageId);
  };

  const getAvailableCopiesCount = (ouvrageId: string): number => {
    return exemplaires.filter(e => e.ouvrageId === ouvrageId && e.statut === 'DISPONIBLE').length;
  };

  const getTotalCopiesCount = (ouvrageId: string): number => {
    return exemplaires.filter(e => e.ouvrageId === ouvrageId).length;
  };

  const getAdherentActiveEmprunts = (adherentId: string): Emprunt[] => {
    return emprunts.filter(e => e.adherentId === adherentId && e.statut === 'en_cours' && !e.annule);
  };

  // Overdue calculations
  const isEmpruntEnRetard = (emp: Emprunt): boolean => {
    if (emp.statut !== 'en_cours' || emp.annule) return false;
    return emp.dateRetourPrevue < currentDate;
  };

  const getJoursDeRetard = (dateRetourPrevue: string): number => {
    if (dateRetourPrevue >= currentDate) return 0;
    const due = new Date(dateRetourPrevue);
    const curr = new Date(currentDate);
    const diff = Math.floor((curr.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // « À contacter » = retard de 7 jours ou plus (contact hors application)
  const isEmpruntAContacter = (emp: Emprunt): boolean => {
    if (emp.statut !== 'en_cours' || emp.annule) return false;
    return getJoursDeRetard(emp.dateRetourPrevue) >= 7;
  };

  // Student authorization check (rule 3: calculé à la volée)
  const isAdherentAutorise = (adherentId: string): { autorise: boolean; motif?: string } => {
    const adherent = getAdherentById(adherentId);
    if (!adherent) return { autorise: false, motif: 'Étudiant non trouvé dans les registres' };
    
    if (adherent.statut !== 'actif') {
      return { autorise: false, motif: 'Compte étudiant résilié ou inactif' };
    }

    if (adherent.dateExpiration < currentDate) {
      return { autorise: false, motif: `Inscription universitaire expirée depuis le ${new Date(adherent.dateExpiration).toLocaleDateString('fr-FR')}` };
    }

    // Has overdue loan?
    const activeLoans = getAdherentActiveEmprunts(adherentId);
    const hasLate = activeLoans.some(l => isEmpruntEnRetard(l));
    if (hasLate) {
      return { 
        autorise: false, 
        motif: 'Blocage automatique : l\'étudiant a au moins un emprunt en retard non restitué' 
      };
    }

    return { autorise: true };
  };

  // Adding Ouvrage with multiple physical Exemplaires
  const addOuvrage = (
    data: Omit<Ouvrage, 'id'>, 
    nbExemplaires: number, 
    emplacement: Emplacement
  ) => {
    const ouvrageId = `ow_${Date.now()}`;
    const newOuvrage: Ouvrage = {
      ...data,
      id: ouvrageId
    };

    // Auto-generate QR codes for copies
    const newCopies: Exemplaire[] = [];
    const baseCodeNum = 1000 + Math.floor(Math.random() * 8000);

    for (let i = 0; i < nbExemplaires; i++) {
      const copyId = `ex_${Date.now()}_${i}`;
      newCopies.push({
        id: copyId,
        ouvrageId,
        codeQR: `EX-${baseCodeNum + i}`,
        statut: 'DISPONIBLE',
        emplacement: { ...emplacement }
      });
    }

    setOuvrages(prev => [...prev, newOuvrage]);
    setExemplaires(prev => [...prev, ...newCopies]);

    return { ouvrage: newOuvrage, exemplaires: newCopies };
  };

  // Ajout en lot depuis Google Books : contrôle anti-doublon ISBN, génération automatique cote/QR/emplacement
  const addBulkOuvrages = (
    items: Array<{
      isbn: string;
      titre: string;
      auteur: string;
      editeur: string;
      anneeEdition: number;
      pagination: number;
      resume: string;
      coverUrl: string;
      categorie: BookCategory;
    }>,
    copiesPerBook: number
  ) => {
    const CATEGORY_COTE_PREFIX: Record<BookCategory, string> = {
      'Informatique & Numérique': 'INFO',
      'Sciences & Techniques': 'SCI',
      'Mathématiques & Physique': 'MATH',
      'Histoire & Géographie': 'HIST',
      'Économie & Gestion': 'ECO',
      'Droit & Sciences Politiques': 'DROIT',
      'Philosophie & Éthique': 'PHIL',
      'Langues & Littérature': 'LETT',
      'Médecine & Santé': 'MED',
      'Général & Référence': 'GEN'
    };

    const CATEGORY_DRAWER: Record<BookCategory, string> = {
      'Informatique & Numérique': 'T1',
      'Économie & Gestion': 'T2',
      'Mathématiques & Physique': 'T3',
      'Sciences & Techniques': 'T4',
      'Droit & Sciences Politiques': 'T5',
      'Histoire & Géographie': 'T6',
      'Philosophie & Éthique': 'T7',
      'Langues & Littérature': 'T8',
      'Médecine & Santé': 'T9',
      'Général & Référence': 'T10'
    };

    const cleanIsbn = (raw?: string) => (raw || '').replace(/[^0-9X]/gi, '').toUpperCase();

    const existingIsbns = new Set(
      ouvrages.map(o => cleanIsbn(o.isbn)).filter(Boolean)
    );

    // Numéro continu le plus élevé pour les cotes par préfixe
    const maxCoteByPrefix = new Map<string, number>();
    for (const o of ouvrages) {
      const m = o.cote?.match(/^([A-Z]+)-(\d+)$/i);
      if (m) {
        const pref = m[1].toUpperCase();
        const num = parseInt(m[2], 10);
        if (!isNaN(num)) {
          maxCoteByPrefix.set(pref, Math.max(maxCoteByPrefix.get(pref) || 0, num));
        }
      }
    }

    // Numéro continu le plus élevé pour EX-xxxx
    let maxCopyCodeNum = 2000;
    for (const ex of exemplaires) {
      const m = ex.codeQR?.match(/^EX-(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxCopyCodeNum) {
          maxCopyCodeNum = num;
        }
      }
    }

    // Compteur d'ouvrages déjà présents par tiroir pour faire tourner les rangées R1..R4
    const drawerRotationCount = new Map<string, number>();
    for (const ex of exemplaires) {
      const t = ex.emplacement?.tiroir;
      if (t) {
        drawerRotationCount.set(t, (drawerRotationCount.get(t) || 0) + 1);
      }
    }

    const safeCopiesCount = Math.min(3, Math.max(1, Math.round(copiesPerBook || 2)));
    const addedOuvrages: Ouvrage[] = [];
    const addedExemplaires: Exemplaire[] = [];
    let skippedCount = 0;
    const baseTimestamp = Date.now();

    items.forEach((item, idx) => {
      const normIsbn = cleanIsbn(item.isbn);
      if (!normIsbn || !item.titre?.trim() || existingIsbns.has(normIsbn)) {
        skippedCount++;
        return;
      }
      existingIsbns.add(normIsbn);

      const prefix = CATEGORY_COTE_PREFIX[item.categorie] || 'GEN';
      const nextCoteNum = (maxCoteByPrefix.get(prefix) || 0) + 1;
      maxCoteByPrefix.set(prefix, nextCoteNum);
      const cote = `${prefix}-${String(nextCoteNum).padStart(3, '0')}`;

      const ouvrageId = `ow_${baseTimestamp}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      const newOuvrage: Ouvrage = {
        id: ouvrageId,
        titre: item.titre.trim(),
        auteur: item.auteur.trim() || 'Auteur non renseigné',
        isbn: normIsbn,
        editeur: item.editeur.trim() || 'Éditeur non renseigné',
        anneeEdition: item.anneeEdition || new Date().getFullYear(),
        categorie: item.categorie,
        cote,
        pagination: item.pagination || 0,
        resume: item.resume.trim(),
        empruntable: true,
        coverUrl: item.coverUrl ? item.coverUrl.replace(/^http:\/\//i, 'https://') : ''
      };
      addedOuvrages.push(newOuvrage);

      const tiroir = CATEGORY_DRAWER[item.categorie] || 'T10';
      const drawerStep = drawerRotationCount.get(tiroir) || 0;
      drawerRotationCount.set(tiroir, drawerStep + 1);
      const rangee = `R${(drawerStep % 4) + 1}`;

      for (let c = 0; c < safeCopiesCount; c++) {
        maxCopyCodeNum++;
        addedExemplaires.push({
          id: `ex_${baseTimestamp}_${idx}_${c}_${Math.random().toString(36).slice(2, 6)}`,
          ouvrageId,
          codeQR: `EX-${String(maxCopyCodeNum).padStart(4, '0')}`,
          statut: 'DISPONIBLE',
          emplacement: { tiroir, rangee }
        });
      }
    });

    if (addedOuvrages.length > 0) {
      setOuvrages(prev => [...prev, ...addedOuvrages]);
      setExemplaires(prev => [...prev, ...addedExemplaires]);
    }

    return { addedOuvrages, addedExemplaires, skippedCount };
  };

  const updateOuvrage = (id: string, updates: Partial<Ouvrage>) => {
    setOuvrages(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    if (selectedOuvrage?.id === id) {
      setSelectedOuvrage(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addExemplairesToOuvrage = (
    ouvrageId: string, 
    count: number, 
    emplacement: Emplacement
  ) => {
    const newCopies: Exemplaire[] = [];
    const baseCodeNum = 1000 + Math.floor(Math.random() * 8000);

    for (let i = 0; i < count; i++) {
      newCopies.push({
        id: `ex_${Date.now()}_${i}`,
        ouvrageId,
        codeQR: `EX-${baseCodeNum + i}`,
        statut: 'DISPONIBLE',
        emplacement: { ...emplacement }
      });
    }

    setExemplaires(prev => [...newCopies, ...prev]);
    return newCopies;
  };

  const updateExemplaire = (id: string, updates: Partial<Exemplaire>) => {
    setExemplaires(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (scannedExemplaire?.id === id) {
      setScannedExemplaire(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Seules actions physiques : declarerPerdu et declarerRetrouve
  // 3. Perdu : statut PERDU, réversible vers DISPONIBLE si retrouvé
  const declarerPerdu = (id: string): { success: boolean } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false };
    updateExemplaire(id, {
      statut: 'PERDU'
    });
    return { success: true };
  };

  // 4. Retrouvé : réversible vers DISPONIBLE sans notification
  const declarerRetrouve = (id: string): { success: boolean } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false };

    updateExemplaire(ex.id, {
      statut: 'DISPONIBLE',
    });
    return { success: true };
  };

  // Loans
  const addLoan = (
    exemplaireId: string, 
    adherentId: string, 
    notes?: string
  ): { success: boolean; error?: string; emprunt?: Emprunt } => {
    const ex = getExemplaireById(exemplaireId);
    if (!ex) return { success: false, error: "Exemplaire introuvable" };
    if (ex.statut !== 'DISPONIBLE') {
      return { success: false, error: `Cet exemplaire n'est pas disponible (statut actuel : ${ex.statut})` };
    }

    const ow = getOuvrageById(ex.ouvrageId);
    if (!ow) return { success: false, error: "Ouvrage référencé introuvable" };
    if (!ow.empruntable) {
      return { success: false, error: "Cet ouvrage est réservé à la consultation sur place uniquement." };
    }

    const auth = isAdherentAutorise(adherentId);
    if (!auth.autorise) {
      return { success: false, error: auth.motif || "Étudiant non autorisé à emprunter" };
    }

    // Default university loan duration: loanDurationDays (15 days by default)
    const due = new Date(currentDate);
    due.setDate(due.getDate() + loanDurationDays);
    const dateRetourPrevue = due.toISOString().split('T')[0];

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newEmprunt: Emprunt = {
      id: `emp_${Date.now()}`,
      loanNumber: `PRT-${new Date(currentDate).getFullYear()}-${randomNum}`,
      adherentId,
      exemplaireId,
      ouvrageId: ow.id,
      dateEmprunt: currentDate,
      dateRetourPrevue,
      nbRappels: 0,
      statut: 'en_cours',
      notes
    };

    // Update exemplaire statut to EMPRUNTE
    updateExemplaire(exemplaireId, { statut: 'EMPRUNTE' });
    setEmprunts(prev => [newEmprunt, ...prev]);

    return { success: true, emprunt: newEmprunt };
  };

  // Return Loan
  const returnLoan = (
    empruntId: string, 
    notes?: string
  ) => {
    const emp = emprunts.find(e => e.id === empruntId);
    if (!emp || emp.statut !== 'en_cours') {
      return { success: false };
    }

    const ex = getExemplaireById(emp.exemplaireId);

    // Update emprunt
    setEmprunts(prev => prev.map(e => e.id === empruntId ? {
      ...e,
      statut: 'rendu',
      dateRetourEffective: currentDate,
      notes: notes ? (e.notes ? `${e.notes} | ${notes}` : notes) : e.notes
    } : e));

    // Update exemplaire to DISPONIBLE
    if (ex) {
      updateExemplaire(ex.id, {
        statut: 'DISPONIBLE'
      });
      return { success: true, exemplaire: ex, emplacement: ex.emplacement };
    }

    return { success: true };
  };

  // Annuler un emprunt (erreur de scan)
  const cancelLoan = (empruntId: string): { success: boolean; error?: string } => {
    const target = emprunts.find(e => e.id === empruntId);
    if (!target) {
      return { success: false, error: "Emprunt introuvable." };
    }
    const cancelNote = "Emprunt annulé";
    setEmprunts(prev => prev.map(e => e.id === empruntId ? {
      ...e,
      annule: true,
      notes: e.notes ? (e.notes + " | " + cancelNote) : cancelNote
    } : e));

    // Remettre l'exemplaire au statut DISPONIBLE
    updateExemplaire(target.exemplaireId, { statut: 'DISPONIBLE' });

    return { success: true };
  };

  // Automated Loan by Dual QR Scan
  const addLoanByScan = (
    exemplaireCodeOrId: string,
    studentCodeOrId: string
  ) => {
    // 1. Resolve Exemplaire
    const cleanExCode = exemplaireCodeOrId.trim().toUpperCase();
    const ex = exemplaires.find(e => e.codeQR.trim().toUpperCase() === cleanExCode || e.id === exemplaireCodeOrId);
    if (!ex) {
      return { success: false, error: `Exemplaire introuvable avec le code QR "${exemplaireCodeOrId}".` };
    }

    const ow = getOuvrageById(ex.ouvrageId);
    if (!ow) {
      return { success: false, error: "Ouvrage référencé introuvable." };
    }

    // Rule 1: L'ouvrage est empruntable
    if (!ow.empruntable) {
      return { 
        success: false, 
        error: `Refus d'emprunt : L'ouvrage "${ow.titre}" est réservé à la consultation sur place uniquement.` 
      };
    }

    // 2. Resolve Student (carte étudiante EST portant le numeroEtudiant)
    const cleanStudCode = studentCodeOrId.trim().toUpperCase();
    const student = adherents.find(a => 
      a.numeroEtudiant.trim().toUpperCase() === cleanStudCode || 
      a.id === studentCodeOrId
    );
    if (!student) {
      return { success: false, error: "Carte non reconnue : étudiant absent de la liste importée" };
    }

    // Rule 2: L'exemplaire doit être DISPONIBLE
    if (ex.statut !== 'DISPONIBLE') {
      return { 
        success: false, 
        error: `Refus d'emprunt : Cet exemplaire n'est pas disponible pour le prêt (statut actuel : ${ex.statut}).` 
      };
    }

    // Rule 3: L'adhérent est actif avec un abonnement valide
    if (student.statut !== 'actif') {
      return { success: false, error: "Refus d'emprunt : L'inscription de cet étudiant est résiliée." };
    }

    if (student.dateExpiration < currentDate) {
      return { 
        success: false, 
        error: `Refus d'emprunt : Inscription universitaire expirée depuis le ${new Date(student.dateExpiration).toLocaleDateString('fr-FR')}.` 
      };
    }

    // Rule 4: L'adhérent n'a aucun emprunt en retard (calculé dynamiquement à la volée)
    const activeStudentLoans = getAdherentActiveEmprunts(student.id);
    const lateLoan = activeStudentLoans.find(l => isEmpruntEnRetard(l));
    if (lateLoan) {
      const days = getJoursDeRetard(lateLoan.dateRetourPrevue);
      return { 
        success: false, 
        error: `Refus d'emprunt : Blocage automatique pour retard. L'étudiant a un emprunt en dépassement (+${days} jour(s)) non restitué.` 
      };
    }

    // All rules passed: create loan
    const due = new Date(currentDate);
    due.setDate(due.getDate() + loanDurationDays);
    const dateRetourPrevue = due.toISOString().split('T')[0];

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newEmprunt: Emprunt = {
      id: `emp_${Date.now()}`,
      loanNumber: `PRT-${new Date(currentDate).getFullYear()}-${randomNum}`,
      adherentId: student.id,
      exemplaireId: ex.id,
      ouvrageId: ow.id,
      dateEmprunt: currentDate,
      dateRetourPrevue,
      nbRappels: 0,
      statut: 'en_cours'
    };

    // Update copy status
    updateExemplaire(ex.id, { statut: 'EMPRUNTE' });
    setEmprunts(prev => [newEmprunt, ...prev]);

    return {
      success: true,
      emprunt: newEmprunt,
      ouvrage: ow,
      exemplaire: ex,
      adherent: student
    };
  };

  // Enregistrement purement manuel d'un message envoyé via la messagerie du gestionnaire
  const recordManualReminder = (
    empruntId: string,
    payload: { level: MessageLevel; subject: string; body: string; daysLate: number }
  ) => {
    const emp = emprunts.find(e => e.id === empruntId);
    if (!emp) return;
    const adh = getAdherentById(emp.adherentId);
    const ow = getOuvrageById(emp.ouvrageId);
    const ex = getExemplaireById(emp.exemplaireId);
    if (!adh || !ow) return;

    const now = new Date();
    const heureEnvoi = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newNotif: EmailNotification = {
      id: `notif_${emp.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      destinataireEmail: adh.emailAcademique,
      destinataireNom: `${adh.prenom} ${adh.nom}`,
      destinataireNumero: adh.numeroEtudiant,
      sujet: payload.subject,
      corps: payload.body,
      dateEnvoi: currentDate,
      heureEnvoi,
      type: getNotificationTypeForLevel(payload.level),
      niveauMessage: payload.level,
      joursRetard: payload.daysLate,
      empruntId: emp.id,
      ouvrageId: ow.id,
      ouvrageTitre: ow.titre,
      exemplaireId: ex?.id,
      exemplaireCode: ex?.codeQR,
      adherentId: adh.id
    };

    setNotifications(prev => [newNotif, ...prev]);
    setEmprunts(prev => prev.map(e => e.id === empruntId ? {
      ...e,
      nbRappels: (e.nbRappels || 0) + 1,
      dateDernierRappel: currentDate,
      dernierNiveauMessage: payload.level,
      dernierJourRetardMessage: payload.daysLate
    } : e));
  };

  // Enregistrement groupé pour un palier (avec instantané d'annulation en cas de décoche)
  const recordGroupReminders = (
    items: Array<{ empruntId: string; level: MessageLevel; subject: string; body: string; daysLate: number }>
  ) => {
    const now = new Date();
    const heureEnvoi = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newNotifications: EmailNotification[] = [];
    const undoRecords: Array<{
      empruntId: string;
      notificationId: string;
      previousNbRappels: number;
      previousDateDernierRappel?: string;
      previousDernierNiveauMessage?: MessageLevel;
      previousDernierJourRetardMessage?: number;
    }> = [];
    const updatesById = new Map<string, { level: MessageLevel; daysLate: number }>();

    items.forEach((item, index) => {
      const emp = emprunts.find(e => e.id === item.empruntId);
      if (!emp) return;
      const adh = getAdherentById(emp.adherentId);
      const ow = getOuvrageById(emp.ouvrageId);
      const ex = getExemplaireById(emp.exemplaireId);
      if (!adh || !ow) return;

      const notificationId = `notif_${emp.id}_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`;
      newNotifications.push({
        id: notificationId,
        destinataireEmail: adh.emailAcademique,
        destinataireNom: `${adh.prenom} ${adh.nom}`,
        destinataireNumero: adh.numeroEtudiant,
        sujet: item.subject,
        corps: item.body,
        dateEnvoi: currentDate,
        heureEnvoi,
        type: getNotificationTypeForLevel(item.level),
        niveauMessage: item.level,
        joursRetard: item.daysLate,
        empruntId: emp.id,
        ouvrageId: ow.id,
        ouvrageTitre: ow.titre,
        exemplaireId: ex?.id,
        exemplaireCode: ex?.codeQR,
        adherentId: adh.id
      });

      undoRecords.push({
        empruntId: emp.id,
        notificationId,
        previousNbRappels: emp.nbRappels || 0,
        previousDateDernierRappel: emp.dateDernierRappel,
        previousDernierNiveauMessage: emp.dernierNiveauMessage,
        previousDernierJourRetardMessage: emp.dernierJourRetardMessage
      });

      updatesById.set(emp.id, { level: item.level, daysLate: item.daysLate });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
      setEmprunts(prev =>
        prev.map(e => {
          const upd = updatesById.get(e.id);
          if (!upd) return e;
          return {
            ...e,
            nbRappels: (e.nbRappels || 0) + 1,
            dateDernierRappel: currentDate,
            dernierNiveauMessage: upd.level,
            dernierJourRetardMessage: upd.daysLate
          };
        })
      );
    }

    return undoRecords;
  };

  // Annulation d'un enregistrement groupé si le gestionnaire décoche « Envoyé »
  const revertGroupReminders = (
    records: Array<{
      empruntId: string;
      notificationId: string;
      previousNbRappels: number;
      previousDateDernierRappel?: string;
      previousDernierNiveauMessage?: MessageLevel;
      previousDernierJourRetardMessage?: number;
    }>
  ) => {
    if (records.length === 0) return;
    const notifIdSet = new Set(records.map(r => r.notificationId));
    const restoreMap = new Map(records.map(r => [r.empruntId, r]));

    setNotifications(prev => prev.filter(n => !notifIdSet.has(n.id)));
    setEmprunts(prev =>
      prev.map(e => {
        const snap = restoreMap.get(e.id);
        if (!snap) return e;
        return {
          ...e,
          nbRappels: snap.previousNbRappels,
          dateDernierRappel: snap.previousDateDernierRappel,
          dernierNiveauMessage: snap.previousDernierNiveauMessage,
          dernierJourRetardMessage: snap.previousDernierJourRetardMessage
        };
      })
    );
  };

  // Marquer une sélection d'emprunts (J+7+) comme contactés hors application
  const markLoansAsContacted = (empruntIds: string[]): { count: number } => {
    if (empruntIds.length === 0) return { count: 0 };
    const idSet = new Set(empruntIds);
    let updatedCount = 0;

    setEmprunts(prev => prev.map(e => {
      if (idSet.has(e.id) && e.statut === 'en_cours' && !e.annule) {
        updatedCount++;
        return {
          ...e,
          contacte: true,
          dateContact: currentDate
        };
      }
      return e;
    }));

    return { count: empruntIds.length };
  };

  // Confirmation rangement en rayon (« Reclasser ») : sans effet sur les statuts
  const markLoanReclasse = (empruntId?: string, codeQR?: string) => {
    if (empruntId) {
      setEmprunts(prev => prev.map(e => e.id === empruntId ? { ...e, reclasse: true } : e));
    } else if (codeQR) {
      // Pour un livre lu sur place (sans emprunt en cours) ou identifié par QR
      const ex = exemplaires.find(e => e.codeQR.trim().toUpperCase() === codeQR.trim().toUpperCase());
      if (ex) {
        // Recherche du dernier emprunt éventuel
        const lastLoan = emprunts.find(e => e.exemplaireId === ex.id);
        if (lastLoan) {
          setEmprunts(prev => prev.map(e => e.id === lastLoan.id ? { ...e, reclasse: true } : e));
        }
      }
    }
  };

  // Automated Return by Scan : aucun choix d'état, exemplaire repasse à DISPONIBLE
  const returnByScan = (
    exemplaireCodeOrId: string
  ) => {
    const cleanCode = exemplaireCodeOrId.trim().toUpperCase();
    const ex = exemplaires.find(e => e.codeQR.trim().toUpperCase() === cleanCode || e.id === exemplaireCodeOrId);
    
    if (!ex) {
      return { 
        success: false, 
        error: `Exemplaire introuvable avec le code QR "${exemplaireCodeOrId}".`, 
        hadActiveLoan: false 
      };
    }

    const ow = getOuvrageById(ex.ouvrageId);

    // Look for active loan
    const activeLoan = emprunts.find(e => e.exemplaireId === ex.id && e.statut === 'en_cours');
    let student: Adherent | undefined;
    let isOverdue = false;
    let daysLate = 0;

    if (activeLoan) {
      student = getAdherentById(activeLoan.adherentId);
      isOverdue = isEmpruntEnRetard(activeLoan);
      daysLate = isOverdue ? getJoursDeRetard(activeLoan.dateRetourPrevue) : 0;

      // Close the loan
      setEmprunts(prev => prev.map(e => e.id === activeLoan.id ? {
        ...e,
        statut: 'rendu',
        dateRetourEffective: currentDate
      } : e));
    }

    // Physical copy goes back to DISPONIBLE
    updateExemplaire(ex.id, {
      statut: 'DISPONIBLE'
    });
    const updatedEx: Exemplaire = {
      ...ex,
      statut: 'DISPONIBLE'
    };

    return {
      success: true,
      hadActiveLoan: Boolean(activeLoan),
      exemplaire: updatedEx,
      emplacement: ex.emplacement,
      ouvrage: ow,
      adherent: student,
      isOverdue,
      daysLate
    };
  };

  // QR Scanning Router
  const scanQRCode = (code: string): { found: boolean; type?: 'exemplaire' | 'adherent'; item?: any } => {
    const trimmed = code.trim().toUpperCase();

    // Check if it's an Exemplaire QR
    const matchedEx = exemplaires.find(e => e.codeQR.trim().toUpperCase() === trimmed);
    if (matchedEx) {
      setScannedExemplaire(matchedEx);
      return { found: true, type: 'exemplaire', item: matchedEx };
    }

    // Check if it's a student card QR (numeroEtudiant)
    const matchedAdh = adherents.find(a => 
      a.numeroEtudiant.trim().toUpperCase() === trimmed
    );
    if (matchedAdh) {
      setSelectedAdherent(matchedAdh);
      return { found: true, type: 'adherent', item: matchedAdh };
    }

    return { found: false };
  };

  const openNewLoan = (ouvrageId?: string, adherentId?: string, exemplaireId?: string) => {
    setPreselectedOuvrageId(ouvrageId);
    setPreselectedAdherentId(adherentId);
    setPreselectedExemplaireId(exemplaireId);
    setIsNewLoanOpen(true);
  };

  // Stats for manager dashboard
  const stats = useMemo(() => {
    const totalOuvrages = ouvrages.length;
    const totalExemplaires = exemplaires.length;
    const disponiblesEnRayon = exemplaires.filter(e => e.statut === 'DISPONIBLE').length;
    const empruntsEnCours = emprunts.filter(e => e.statut === 'en_cours' && !e.annule).length;
    const empruntsEnRetard = emprunts.filter(e => isEmpruntEnRetard(e)).length;
    const empruntsAContacter = emprunts.filter(e => isEmpruntAContacter(e)).length;
    const rupturesStock = ouvrages.filter(ow => {
      if (!ow.empruntable) return false;
      const copies = exemplaires.filter(e => e.ouvrageId === ow.id);
      const avail = copies.filter(e => e.statut === 'DISPONIBLE').length;
      return avail === 0;
    }).length;
    const adherentsActifs = adherents.filter(a => a.statut === 'actif').length;
    const notificationsTotal = notifications.length;

    return {
      totalOuvrages,
      totalExemplaires,
      disponiblesEnRayon,
      empruntsEnCours,
      empruntsEnRetard,
      empruntsAContacter,
      rupturesStock,
      adherentsActifs,
      notificationsTotal
    };
  }, [ouvrages, exemplaires, emprunts, adherents, notifications, currentDate]);

  const resetToDefaultData = () => {
    localStorage.removeItem(STORAGE_KEY_OUVRAGES);
    localStorage.removeItem(STORAGE_KEY_EXEMPLAIRES);
    localStorage.removeItem(STORAGE_KEY_ADHERENTS);
    localStorage.removeItem(STORAGE_KEY_EMPRUNTS);
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    setOuvrages(INITIAL_OUVRAGES);
    setExemplaires(INITIAL_EXEMPLAIRES);
    setAdherents(INITIAL_ADHERENTS);
    setEmprunts(INITIAL_EMPRUNTS);
    setNotifications(INITIAL_NOTIFICATIONS);
  };

  const exportDatabaseJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      dateExport: currentDate,
      ouvrages,
      exemplaires,
      adherents,
      emprunts,
      notifications
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliopret-univ-sauvegarde-${currentDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncLocalCovers = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    let updatedCount = 0;
    const updated = ouvrages.map((o) => {
      if (LOCAL_COVERS_MAP[o.id]) {
        updatedCount++;
        return { ...o, coverUrl: LOCAL_COVERS_MAP[o.id] };
      }
      return o;
    });

    setOuvrages(updated);
    try {
      localStorage.setItem(STORAGE_KEY_OUVRAGES, JSON.stringify(updated));
    } catch (err) {
      console.warn("Erreur d'écriture localStorage:", err);
    }

    // Synchronisation Firestore (uniquement si un utilisateur vérifié est connecté)
    try {
      const { auth, db, handleFirestoreError, OperationType } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.emailVerified) {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        for (const ow of updated) {
          if (LOCAL_COVERS_MAP[ow.id]) {
            const path = `ouvrages/${ow.id}`;
            try {
              await setDoc(
                doc(db, 'ouvrages', ow.id),
                {
                  id: ow.id.slice(0, 128),
                  titre: ow.titre.slice(0, 300),
                  coverUrl: LOCAL_COVERS_MAP[ow.id].slice(0, 1000),
                  ownerUid: currentUser.uid.slice(0, 128),
                  updatedAt: serverTimestamp()
                },
                { merge: true }
              );
            } catch (fsErr) {
              handleFirestoreError(fsErr, OperationType.WRITE, path);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Synchronisation Firestore :", err);
    }

    return { success: true, count: updatedCount };
  };

  // Mise à jour des 20 couvertures locales vers Firestore uniquement lorsque l'utilisateur est authentifié
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    const initSyncOnAuth = async () => {
      try {
        const { auth, db, handleFirestoreError, OperationType } = await import('../firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (isCancelled || !user || !user.emailVerified) return;
          for (const [id, coverUrl] of Object.entries(LOCAL_COVERS_MAP)) {
            if (isCancelled) break;
            const ow = INITIAL_OUVRAGES.find(o => o.id === id);
            if (ow) {
              const path = `ouvrages/${id}`;
              try {
                await setDoc(
                  doc(db, 'ouvrages', id),
                  {
                    id: id.slice(0, 128),
                    titre: ow.titre.slice(0, 300),
                    coverUrl: coverUrl.slice(0, 1000),
                    ownerUid: user.uid.slice(0, 128),
                    updatedAt: serverTimestamp()
                  },
                  { merge: true }
                );
              } catch (fsErr) {
                handleFirestoreError(fsErr, OperationType.WRITE, path);
              }
            }
          }
        });
      } catch (err) {
        console.warn("Mise à jour automatique Firestore en arrière-plan:", err);
      }
    };

    initSyncOnAuth();
    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        userRole,
        setUserRole,
        isManagerLoginOpen,
        setIsManagerLoginOpen,
        loginAsManager,
        logoutManager,
        activeManagerTab,
        setActiveManagerTab,
        currentDate,
        allowedAcademicDomain,
        setAllowedAcademicDomain,
        ensureStudentAdherent,
        ouvrages,
        exemplaires,
        adherents,
        emprunts,
        notifications,
        getOuvrageById,
        getExemplaireById,
        getExemplaireByQR,
        getAdherentById,
        getAdherentByNumero,
        getExemplairesByOuvrage,
        getAvailableCopiesCount,
        getTotalCopiesCount,
        isAdherentAutorise,
        getAdherentActiveEmprunts,
        isEmpruntEnRetard,
        getJoursDeRetard,
        isEmpruntAContacter,
        recordManualReminder,
        recordGroupReminders,
        revertGroupReminders,
        markLoansAsContacted,
        loanDurationDays,
        setLoanDurationDays,
        addOuvrage,
        addBulkOuvrages,
        updateOuvrage,
        addExemplairesToOuvrage,
        updateExemplaire,
        declarerPerdu,
        declarerRetrouve,
        addLoan,
        cancelLoan,
        addLoanByScan,
        returnLoan,
        markLoanReclasse,
        returnByScan,
        isQRScannerOpen,
        setIsQRScannerOpen,
        isScanReturnOpen,
        setIsScanReturnOpen,
        scanQRCode,
        scannedExemplaire,
        setScannedExemplaire,
        selectedOuvrage,
        setSelectedOuvrage,
        selectedAdherent,
        setSelectedAdherent,
        activePrintLabelsOuvrageId,
        setActivePrintLabelsOuvrageId,
        activePrintLabelExemplaireIds,
        setActivePrintLabelExemplaireIds,
        activeReceiptEmprunt,
        setActiveReceiptEmprunt,
        isNewLoanOpen,
        setIsNewLoanOpen,
        preselectedOuvrageId,
        preselectedExemplaireId,
        preselectedAdherentId,
        openNewLoan,
        isNewOuvrageOpen,
        setIsNewOuvrageOpen,
        isImportStudentsOpen,
        setIsImportStudentsOpen,
        isGlobalSearchOpen,
        setIsGlobalSearchOpen,
        importStudentsFromCSV,
        stats,
        resetToDefaultData,
        exportDatabaseJSON,
        syncLocalCovers
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
};
