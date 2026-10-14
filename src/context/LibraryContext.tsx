import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Ouvrage, 
  Exemplaire, 
  Adherent, 
  Emprunt, 
  DemandeAttente, 
  StatutDemande,
  EmailNotification,
  Emplacement, 
  EtatExemplaire, 
  StatutExemplaire,
  BookCategory,
  UserRole
} from '../types';
import { 
  INITIAL_OUVRAGES, 
  INITIAL_EXEMPLAIRES, 
  INITIAL_ADHERENTS, 
  INITIAL_EMPRUNTS,
  INITIAL_DEMANDES,
  INITIAL_NOTIFICATIONS
} from '../data/mockData';

export type ManagerTab = 'dashboard' | 'loans' | 'catalog' | 'students' | 'history' | 'queue' | 'alerts' | 'settings' | 'help';

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

  // Date Simulation
  currentDate: string; // YYYY-MM-DD (simulated or real)
  isSimulatedDate: boolean;
  setSimulatedDate: (date: string) => void;
  resetSimulatedDate: () => void;
  advanceOneDay: () => void;
  advanceDays: (days: number) => void;

  // Core Data
  ouvrages: Ouvrage[];
  exemplaires: Exemplaire[];
  adherents: Adherent[];
  emprunts: Emprunt[];
  demandes: DemandeAttente[];
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
  
  // Overdue calculation (rule 3)
  isEmpruntEnRetard: (emprunt: Emprunt) => boolean;
  getJoursDeRetard: (dateRetourPrevue: string) => number;
  isEmpruntAContacter: (emprunt: Emprunt) => boolean;
  runDailyChecks: (targetDateStr?: string) => { expiredReservationsCount: number; remindersSentCount: number };

  // Configuration
  loanDurationDays: number;
  setLoanDurationDays: (days: number) => void;

  // Actions
  addOuvrage: (
    data: Omit<Ouvrage, 'id'>, 
    nbExemplaires: number, 
    emplacement: Emplacement
  ) => { ouvrage: Ouvrage; exemplaires: Exemplaire[] };
  updateOuvrage: (id: string, updates: Partial<Ouvrage>) => void;
  
  addExemplairesToOuvrage: (
    ouvrageId: string, 
    count: number, 
    emplacement: Emplacement
  ) => Exemplaire[];
  updateExemplaire: (id: string, updates: Partial<Exemplaire>) => void;
  reformeExemplaire: (id: string, motif: string) => void; // NO hard deletion
  
  // Physical life management actions
  reparerExemplaire: (id: string) => { success: boolean; isReservedForQueue: boolean; reservedStudent?: Adherent };
  declarerDommageRayon: (id: string) => { success: boolean };
  declarerPerdu: (id: string) => { success: boolean };
  declarerRetrouve: (id: string) => { success: boolean; isReservedForQueue: boolean; reservedStudent?: Adherent };

  // Loans & Returns by Scan (Without typing)
  addLoan: (
    exemplaireId: string, 
    adherentId: string, 
    notes?: string
  ) => { success: boolean; error?: string; emprunt?: Emprunt };

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
    etat: EtatExemplaire, 
    notes?: string
  ) => { success: boolean; exemplaire?: Exemplaire; emplacement?: Emplacement };

  returnByScan: (
    exemplaireCodeOrId: string,
    etat: 'bon' | 'abime'
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
    isReservedForQueue?: boolean;
    reservedStudent?: Adherent;
    dateLimiteRetrait?: string;
  };

  // Waiting Queue & Reservation (1-day reservation rule)
  inscrireFileAttente: (
    ouvrageId: string, 
    identifiantEtudiant: string
  ) => { 
    success: boolean; 
    error?: string; 
    rang?: number; 
    tailleFile?: number; 
    demande?: DemandeAttente; 
    adherent?: Adherent; 
    ouvrage?: Ouvrage 
  };
  annulerDemande: (demandeId: string) => { success: boolean; message?: string };
  getQueueForOuvrage: (ouvrageId: string) => DemandeAttente[];
  getStudentRankInQueue: (ouvrageId: string, adherentId: string) => number | null;
  checkExpiredReservations: () => void;
  activeQueueModalOuvrageId: string | null;
  setActiveQueueModalOuvrageId: (id: string | null) => void;
  isNotificationsModalOpen: boolean;
  setIsNotificationsModalOpen: (open: boolean) => void;

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
    demandesEnAttente: number;
    exemplairesReserves: number;
    notificationsTotal: number;
  };

  // Maintenance
  resetToDefaultData: () => void;
  exportDatabaseJSON: () => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const STORAGE_KEY_OUVRAGES = 'unilib_ouvrages_v8';
const STORAGE_KEY_EXEMPLAIRES = 'unilib_exemplaires_v8';
const STORAGE_KEY_ADHERENTS = 'unilib_adherents_v8';
const STORAGE_KEY_EMPRUNTS = 'unilib_emprunts_v8';
const STORAGE_KEY_DEMANDES = 'unilib_demandes_v8';
const STORAGE_KEY_NOTIFICATIONS = 'unilib_notifications_v8';
const STORAGE_KEY_ROLE = 'unilib_role_v8';
const STORAGE_KEY_SIM_DATE = 'unilib_sim_date_v8';

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

  const [activeManagerTab, setActiveManagerTab] = useState<ManagerTab>('dashboard');
  const [isManagerLoginOpen, setIsManagerLoginOpen] = useState(false);

  // Date Simulation
  const [simulatedDate, setSimulatedDateState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIM_DATE) || null;
    } catch {
      return null;
    }
  });

  const currentDate = simulatedDate || new Date().toISOString().split('T')[0];
  const isSimulatedDate = Boolean(simulatedDate);

  const setSimulatedDate = (date: string) => {
    setSimulatedDateState(date);
    localStorage.setItem(STORAGE_KEY_SIM_DATE, date);
  };

  const resetSimulatedDate = () => {
    setSimulatedDateState(null);
    localStorage.removeItem(STORAGE_KEY_SIM_DATE);
  };

  // Core Data
  const [ouvrages, setOuvrages] = useState<Ouvrage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OUVRAGES);
      return saved ? JSON.parse(saved) : INITIAL_OUVRAGES;
    } catch {
      return INITIAL_OUVRAGES;
    }
  });

  const [exemplaires, setExemplaires] = useState<Exemplaire[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXEMPLAIRES);
      return saved ? JSON.parse(saved) : INITIAL_EXEMPLAIRES;
    } catch {
      return INITIAL_EXEMPLAIRES;
    }
  });

  const [adherents, setAdherents] = useState<Adherent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADHERENTS);
      return saved ? JSON.parse(saved) : INITIAL_ADHERENTS;
    } catch {
      return INITIAL_ADHERENTS;
    }
  });

  const [emprunts, setEmprunts] = useState<Emprunt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPRUNTS);
      return saved ? JSON.parse(saved) : INITIAL_EMPRUNTS;
    } catch {
      return INITIAL_EMPRUNTS;
    }
  });

  const [demandes, setDemandes] = useState<DemandeAttente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEMANDES);
      return saved ? JSON.parse(saved) : INITIAL_DEMANDES;
    } catch {
      return INITIAL_DEMANDES;
    }
  });

  const [notifications, setNotifications] = useState<EmailNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Modals & Sheets
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scannedExemplaire, setScannedExemplaire] = useState<Exemplaire | null>(null);
  const [selectedOuvrage, setSelectedOuvrage] = useState<Ouvrage | null>(null);
  const [selectedAdherent, setSelectedAdherent] = useState<Adherent | null>(null);
  const [activePrintLabelsOuvrageId, setActivePrintLabelsOuvrageId] = useState<string | null>(null);
  const [activeReceiptEmprunt, setActiveReceiptEmprunt] = useState<Emprunt | null>(null);
  const [activeQueueModalOuvrageId, setActiveQueueModalOuvrageId] = useState<string | null>(null);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

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

    // Identify required columns
    const idxNum = headers.findIndex(h => 
      h.includes('numero') || h.includes('etudiant') || h.includes('cne') || h.includes('matricule') || h === 'id'
    );
    const idxNom = headers.findIndex(h => h === 'nom' || (h.includes('nom') && !h.includes('prenom')));
    const idxPrenom = headers.findIndex(h => h.includes('prenom'));
    const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('courriel'));

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

      if (!numeroEtudiant) {
        errors.push(`Ligne ${lineNum} : Le numéro d'étudiant est vide.`);
      }

      parsedRows.push({
        lineNum,
        numeroEtudiant,
        nom,
        prenom,
        emailAcademique
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
          codeQR: row.numeroEtudiant,
          dateInscription: currentDate,
          dateExpiration: endOfAcademicYear,
          statut: 'actif'
        };
        updatedAdherents.push(newStudent);
        createdCount++;
      }
    });

    // Students absent from the new list are set to 'resilie' and their queue requests cancelled
    const studentsToCancelRequests = new Set<string>();

    updatedAdherents = updatedAdherents.map(adh => {
      const upperNum = adh.numeroEtudiant.trim().toUpperCase();
      if (!importedNumeros.has(upperNum)) {
        if (adh.statut === 'actif') {
          resiliesCount++;
          studentsToCancelRequests.add(adh.id);
        }
        return {
          ...adh,
          statut: 'resilie'
        };
      }
      return adh;
    });

    // Cancel pending queue requests for resiliated students
    if (studentsToCancelRequests.size > 0) {
      setDemandes(prev => prev.map(d => {
        if (studentsToCancelRequests.has(d.adherentId) && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE')) {
          return { ...d, statut: 'ANNULEE' };
        }
        return d;
      }));
    }

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
    localStorage.setItem(STORAGE_KEY_DEMANDES, JSON.stringify(demandes));
  }, [demandes]);

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
    return exemplaires.filter(e => e.ouvrageId === ouvrageId && e.statut !== 'DETRUIT').length;
  };

  const getAdherentActiveEmprunts = (adherentId: string): Emprunt[] => {
    return emprunts.filter(e => e.adherentId === adherentId && e.statut === 'en_cours');
  };

  // Overdue calculations
  const isEmpruntEnRetard = (emp: Emprunt): boolean => {
    if (emp.statut !== 'en_cours') return false;
    return emp.dateRetourPrevue < currentDate;
  };

  const getJoursDeRetard = (dateRetourPrevue: string): number => {
    if (dateRetourPrevue >= currentDate) return 0;
    const due = new Date(dateRetourPrevue);
    const curr = new Date(currentDate);
    const diff = Math.floor((curr.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Après le 2e rappel sans retour, l'emprunt est « à contacter »
  const isEmpruntAContacter = (emp: Emprunt): boolean => {
    if (emp.statut !== 'en_cours') return false;
    if (!isEmpruntEnRetard(emp)) return false;
    return (emp.nbRappels || 0) >= 2;
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
        etat: 'bon',
        statut: 'DISPONIBLE',
        emplacement: { ...emplacement }
      });
    }

    setOuvrages(prev => [newOuvrage, ...prev]);
    setExemplaires(prev => [...newCopies, ...prev]);

    return { ouvrage: newOuvrage, exemplaires: newCopies };
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
        etat: 'bon',
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

  // Rule 4: On ne supprime jamais rien -> réforme / destruction archivée
  // Irréparable : statut DETRUIT avec dateReforme et motifReforme. L'exemplaire n'est jamais supprimé, DETRUIT est un état final.
  const reformeExemplaire = (id: string, motif: string) => {
    updateExemplaire(id, {
      statut: 'DETRUIT',
      dateReforme: currentDate,
      motifReforme: motif
    });
  };

  // Gestion de la vie physique des exemplaires
  // 1. Signaler un dommage sur un exemplaire en rayon (statut EN_REPARATION, etat = abîmé).
  const declarerDommageRayon = (id: string): { success: boolean } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false };
    updateExemplaire(id, {
      statut: 'EN_REPARATION',
      etat: 'abîmé'
    });
    return { success: true };
  };

  // 2. Réparé : même logique qu'un retour en bon état.
  // File non vide : RESERVE et e-mail à la première demande.
  // File vide : DISPONIBLE.
  const reparerExemplaire = (id: string): { success: boolean; isReservedForQueue: boolean; reservedStudent?: Adherent } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false, isReservedForQueue: false };

    const ow = getOuvrageById(ex.ouvrageId);
    const waitingDemands = demandes
      .filter(d => d.ouvrageId === ex.ouvrageId && d.statut === 'EN_ATTENTE')
      .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

    if (waitingDemands.length > 0 && ow) {
      const firstDemand = waitingDemands[0];
      const dateLimiteRetrait = addDaysToDate(currentDate, 1);
      const studentToNotify = getAdherentById(firstDemand.adherentId);

      updateExemplaire(ex.id, {
        statut: 'RESERVE',
        etat: 'bon'
      });

      setDemandes(prev => prev.map(d => d.id === firstDemand.id ? {
        ...d,
        statut: 'NOTIFIEE',
        dateNotification: currentDate,
        dateLimiteRetrait,
        exemplaireReserveId: ex.id
      } : d));

      if (studentToNotify) {
        sendNotificationEmail({
          destinataireEmail: studentToNotify.emailAcademique,
          destinataireNom: `${studentToNotify.prenom} ${studentToNotify.nom}`,
          destinataireNumero: studentToNotify.numeroEtudiant,
          sujet: `Exemplaire réparé et disponible (File d'attente) : ${ow.titre}`,
          corps: `Bonjour ${studentToNotify.prenom},\n\nUn exemplaire physique de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}) vient d'être réparé et remis en circulation.\nIl vous est exclusivement réservé pour une durée de 24 heures calendaires.\n\nEmplacement de rangement : Tiroir ${ex.emplacement.tiroir}, Rangée ${ex.emplacement.rangee}\nDate limite impérative de retrait : ${dateLimiteRetrait}\n\nVeuillez vous présenter au guichet de la bibliothèque avec votre carte d'étudiant pour scanner et enregistrer votre prêt.\nPassé ce délai de 24h, l'exemplaire sera automatiquement réattribué à l'étudiant suivant dans la file d'attente.\n\nCordialement,\nLe Service des Prêts Universitaire`,
          dateEnvoi: currentDate,
          heureEnvoi: '09:00',
          type: 'RESERVATION_DISPONIBLE',
          ouvrageId: ow.id,
          ouvrageTitre: ow.titre,
          exemplaireId: ex.id,
          exemplaireCode: ex.codeQR,
          emplacement: ex.emplacement,
          dateLimiteRetrait,
          adherentId: studentToNotify.id
        });
      }

      return {
        success: true,
        isReservedForQueue: true,
        reservedStudent: studentToNotify
      };
    } else {
      updateExemplaire(ex.id, {
        statut: 'DISPONIBLE',
        etat: 'bon'
      });
      return {
        success: true,
        isReservedForQueue: false
      };
    }
  };

  // 3. Perdu : statut PERDU, réversible vers DISPONIBLE si retrouvé
  const declarerPerdu = (id: string): { success: boolean } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false };
    updateExemplaire(id, {
      statut: 'PERDU'
    });
    return { success: true };
  };

  // 4. Retrouvé : réversible vers DISPONIBLE ou RESERVE si file d'attente
  const declarerRetrouve = (id: string): { success: boolean; isReservedForQueue: boolean; reservedStudent?: Adherent } => {
    const ex = getExemplaireById(id);
    if (!ex) return { success: false, isReservedForQueue: false };

    const ow = getOuvrageById(ex.ouvrageId);
    const waitingDemands = demandes
      .filter(d => d.ouvrageId === ex.ouvrageId && d.statut === 'EN_ATTENTE')
      .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

    if (waitingDemands.length > 0 && ow) {
      const firstDemand = waitingDemands[0];
      const dateLimiteRetrait = addDaysToDate(currentDate, 1);
      const studentToNotify = getAdherentById(firstDemand.adherentId);

      updateExemplaire(ex.id, {
        statut: 'RESERVE',
        etat: 'bon'
      });

      setDemandes(prev => prev.map(d => d.id === firstDemand.id ? {
        ...d,
        statut: 'NOTIFIEE',
        dateNotification: currentDate,
        dateLimiteRetrait,
        exemplaireReserveId: ex.id
      } : d));

      if (studentToNotify) {
        sendNotificationEmail({
          destinataireEmail: studentToNotify.emailAcademique,
          destinataireNom: `${studentToNotify.prenom} ${studentToNotify.nom}`,
          destinataireNumero: studentToNotify.numeroEtudiant,
          sujet: `Exemplaire retrouvé et disponible (File d'attente) : ${ow.titre}`,
          corps: `Bonjour ${studentToNotify.prenom},\n\nUn exemplaire physique de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}) qui était égaré a été retrouvé et remis en circulation.\nIl vous est exclusivement réservé pour une durée de 24 heures calendaires.\n\nEmplacement de rangement : Tiroir ${ex.emplacement.tiroir}, Rangée ${ex.emplacement.rangee}\nDate limite impérative de retrait : ${dateLimiteRetrait}\n\nVeuillez vous présenter au guichet de la bibliothèque avec votre carte d'étudiant pour scanner et enregistrer votre prêt.\nPassé ce délai de 24h, l'exemplaire sera automatiquement réattribué à l'étudiant suivant dans la file d'attente.\n\nCordialement,\nLe Service des Prêts Universitaire`,
          dateEnvoi: currentDate,
          heureEnvoi: '09:00',
          type: 'RESERVATION_DISPONIBLE',
          ouvrageId: ow.id,
          ouvrageTitre: ow.titre,
          exemplaireId: ex.id,
          exemplaireCode: ex.codeQR,
          emplacement: ex.emplacement,
          dateLimiteRetrait,
          adherentId: studentToNotify.id
        });
      }

      return {
        success: true,
        isReservedForQueue: true,
        reservedStudent: studentToNotify
      };
    } else {
      updateExemplaire(ex.id, {
        statut: 'DISPONIBLE',
        etat: 'bon'
      });
      return {
        success: true,
        isReservedForQueue: false
      };
    }
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
    etat: EtatExemplaire, 
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
      etatAuRetour: etat,
      notes: notes ? (e.notes ? `${e.notes} | ${notes}` : notes) : e.notes
    } : e));

    // Update exemplaire to DISPONIBLE and update etat
    if (ex) {
      updateExemplaire(ex.id, {
        statut: 'DISPONIBLE',
        etat
      });
      return { success: true, exemplaire: ex, emplacement: ex.emplacement };
    }

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

    // 2. Resolve Student
    const cleanStudCode = studentCodeOrId.trim().toUpperCase();
    const student = adherents.find(a => 
      a.codeQR.trim().toUpperCase() === cleanStudCode || 
      a.numeroEtudiant.trim().toUpperCase() === cleanStudCode || 
      a.id === studentCodeOrId
    );
    if (!student) {
      return { success: false, error: `Étudiant introuvable avec le numéro/carte "${studentCodeOrId}".` };
    }

    // Rule 2: L'exemplaire n'est pas réservé pour un autre adhérent
    if (ex.statut === 'RESERVE') {
      const reservation = demandes.find(d => d.exemplaireReserveId === ex.id && (d.statut === 'NOTIFIEE' || d.statut === 'EN_ATTENTE'));
      if (reservation && reservation.adherentId !== student.id) {
        return { 
          success: false, 
          error: "Refus d'emprunt : Réservé pour un autre adhérent." 
        };
      }
    } else if (ex.statut !== 'DISPONIBLE') {
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

    // Rule 5: Toute demande en file de cet adhérent pour cet ouvrage passe à SERVIE
    setDemandes(prev => prev.map(d => 
      d.adherentId === student.id && d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE')
        ? { ...d, statut: 'SERVIE' }
        : d
    ));

    return {
      success: true,
      emprunt: newEmprunt,
      ouvrage: ow,
      exemplaire: ex,
      adherent: student
    };
  };

  const sendNotificationEmail = (data: Omit<EmailNotification, 'id'>) => {
    const newNotif: EmailNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
    setNotifications(prev => [newNotif, ...prev]);
    return newNotif;
  };

  const getQueueForOuvrage = (ouvrageId: string) => {
    return demandes
      .filter(d => d.ouvrageId === ouvrageId && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'))
      .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));
  };

  const getStudentRankInQueue = (ouvrageId: string, adherentId: string): number | null => {
    const queue = getQueueForOuvrage(ouvrageId);
    const idx = queue.findIndex(d => d.adherentId === adherentId);
    return idx !== -1 ? idx + 1 : null;
  };

  // Inscription in waiting queue (Student Catalog)
  const inscrireFileAttente = (
    ouvrageId: string, 
    identifiantEtudiant: string
  ): { 
    success: boolean; 
    error?: string; 
    rang?: number; 
    tailleFile?: number; 
    demande?: DemandeAttente; 
    adherent?: Adherent; 
    ouvrage?: Ouvrage 
  } => {
    const ow = getOuvrageById(ouvrageId);
    if (!ow) {
      return { success: false, error: "Ouvrage introuvable." };
    }

    // Rule: Impossible pour un ouvrage non empruntable
    if (!ow.empruntable) {
      return { 
        success: false, 
        error: "Inscription impossible : cet ouvrage est réservé à la consultation sur place uniquement." 
      };
    }

    // Rule: Impossible pour un ouvrage ayant un exemplaire disponible
    const dispoCount = getAvailableCopiesCount(ow.id);
    if (dispoCount > 0) {
      return { 
        success: false, 
        error: `Inscription impossible : ${dispoCount} exemplaire(s) actuellement disponible(s) en rayon. Vous pouvez le retirer directement.` 
      };
    }

    // Student identification by student number, QR code or id
    const cleanId = identifiantEtudiant.trim().toUpperCase();
    const student = adherents.find(a => 
      a.numeroEtudiant.trim().toUpperCase() === cleanId || 
      a.codeQR.trim().toUpperCase() === cleanId || 
      a.id === identifiantEtudiant
    );

    if (!student) {
      return { 
        success: false, 
        error: `Numéro d'étudiant "${identifiantEtudiant}" introuvable dans la liste officielle des inscriptions.` 
      };
    }

    if (student.statut !== 'actif') {
      return { 
        success: false, 
        error: "Inscription impossible : le compte étudiant est résilié." 
      };
    }

    // Rule: Inscription autorisée même si l'adhérent est en retard !

    // Rule: Une seule demande active par adhérent et par ouvrage
    const existingDemand = demandes.find(d => 
      d.adherentId === student.id && 
      d.ouvrageId === ow.id && 
      (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE')
    );

    if (existingDemand) {
      const activeQueue = demandes
        .filter(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'))
        .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));
      const userIndex = activeQueue.findIndex(d => d.id === existingDemand.id);
      const userRank = userIndex !== -1 ? userIndex + 1 : 1;
      return { 
        success: false, 
        error: `Vous êtes déjà inscrit dans la file d'attente pour cet ouvrage au rang ${userRank} (${activeQueue.length} demande(s) au total).` 
      };
    }

    // Create new demand (ordered by dateInscription)
    const newDemandeId = `dem_${Date.now()}`;
    const newDemande: DemandeAttente = {
      id: newDemandeId,
      adherentId: student.id,
      ouvrageId: ow.id,
      dateInscription: currentDate,
      statut: 'EN_ATTENTE'
    };

    // Calculate rank and size
    const updatedQueue = [...demandes, newDemande]
      .filter(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'))
      .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));
    const newRank = updatedQueue.findIndex(d => d.id === newDemandeId) + 1;
    const totalSize = updatedQueue.length;

    setDemandes(prev => [...prev, newDemande]);

    return {
      success: true,
      demande: newDemande,
      rang: newRank,
      tailleFile: totalSize,
      adherent: student,
      ouvrage: ow
    };
  };

  // Manager cancels a request
  const annulerDemande = (demandeId: string): { success: boolean; message?: string } => {
    const dem = demandes.find(d => d.id === demandeId);
    if (!dem) {
      return { success: false, message: "Demande introuvable." };
    }

    if (dem.statut === 'NOTIFIEE' && dem.exemplaireReserveId) {
      const copyId = dem.exemplaireReserveId;
      const ex = getExemplaireById(copyId);
      const ow = ex ? getOuvrageById(ex.ouvrageId) : getOuvrageById(dem.ouvrageId);

      setDemandes(prev => {
        const withoutCurrent = prev.map(d => d.id === demandeId ? { ...d, statut: 'ANNULEE' as StatutDemande } : d);
        
        const waitingDemands = withoutCurrent
          .filter(d => d.ouvrageId === dem.ouvrageId && d.statut === 'EN_ATTENTE')
          .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

        if (waitingDemands.length > 0 && ex && ow) {
          const nextDem = waitingDemands[0];
          const dateLimiteRetrait = addDaysToDate(currentDate, 1);
          const nextStudent = getAdherentById(nextDem.adherentId);

          const updatedDemands = withoutCurrent.map(d => d.id === nextDem.id ? {
            ...d,
            statut: 'NOTIFIEE' as StatutDemande,
            dateNotification: currentDate,
            dateLimiteRetrait,
            exemplaireReserveId: copyId
          } : d);

          if (nextStudent) {
            sendNotificationEmail({
              destinataireEmail: nextStudent.emailAcademique,
              destinataireNom: `${nextStudent.prenom} ${nextStudent.nom}`,
              destinataireNumero: nextStudent.numeroEtudiant,
              sujet: `Exemplaire disponible (File d'attente) : ${ow.titre}`,
              corps: `Bonjour ${nextStudent.prenom},\n\nSuite à une annulation, un exemplaire physique de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}) est disponible et vous est réservé pour une durée de 24 heures.\n\nEmplacement de rangement : Tiroir ${ex.emplacement.tiroir}, Rangée ${ex.emplacement.rangee}\nDate limite de retrait : ${dateLimiteRetrait}\n\nVeuillez vous présenter au guichet de la bibliothèque avec votre carte d'étudiant pour scanner et valider votre prêt.\nPassé ce délai de 24h, l'exemplaire sera proposé à l'étudiant suivant.`,
              dateEnvoi: currentDate,
              heureEnvoi: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              type: 'RESERVATION_DISPONIBLE',
              ouvrageId: ow.id,
              ouvrageTitre: ow.titre,
              exemplaireId: ex.id,
              exemplaireCode: ex.codeQR,
              emplacement: ex.emplacement,
              dateLimiteRetrait,
              adherentId: nextStudent.id
            });
          }

          return updatedDemands;
        } else {
          if (ex) {
            updateExemplaire(ex.id, { statut: 'DISPONIBLE' });
          }
          return withoutCurrent;
        }
      });

      return { success: true, message: "Demande annulée. La réservation a été réattribuée au demandeur suivant." };
    } else {
      setDemandes(prev => prev.map(d => d.id === demandeId ? { ...d, statut: 'ANNULEE' as StatutDemande } : d));
      return { success: true, message: "Demande de file d'attente annulée." };
    }
  };

  // Automatic verification of expired 1-day reservations
  const checkExpiredReservations = (targetDateStr?: string) => {
    const effectiveDate = targetDateStr || currentDate;
    const newEmails: EmailNotification[] = [];
    const copiesToRevert: string[] = [];

    setDemandes(prevDemandes => {
      const notifiees = prevDemandes.filter(d => 
        d.statut === 'NOTIFIEE' && 
        d.dateLimiteRetrait && 
        d.dateLimiteRetrait <= effectiveDate
      );

      if (notifiees.length === 0) return prevDemandes;

      let nextDemandesState = [...prevDemandes];

      for (const expired of notifiees) {
        // 1. Mark expired request as EXPIREE (sort de la file sans seconde chance)
        nextDemandesState = nextDemandesState.map(d => d.id === expired.id ? {
          ...d,
          statut: 'EXPIREE' as StatutDemande
        } : d);

        const copyId = expired.exemplaireReserveId;
        const ex = copyId ? exemplaires.find(e => e.id === copyId) : undefined;
        const ow = ex ? ouvrages.find(o => o.id === ex.ouvrageId) : ouvrages.find(o => o.id === expired.ouvrageId);

        // 2. Look for the next waiting demand in queue
        const waitingNext = nextDemandesState
          .filter(d => d.ouvrageId === expired.ouvrageId && d.statut === 'EN_ATTENTE')
          .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

        if (waitingNext.length > 0 && copyId && ex && ow) {
          const nextTarget = waitingNext[0];
          const nextStudent = adherents.find(a => a.id === nextTarget.adherentId);
          const newDeadline = addDaysToDate(effectiveDate, 1);

          nextDemandesState = nextDemandesState.map(d => d.id === nextTarget.id ? {
            ...d,
            statut: 'NOTIFIEE' as StatutDemande,
            dateNotification: effectiveDate,
            dateLimiteRetrait: newDeadline,
            exemplaireReserveId: copyId
          } : d);

          if (nextStudent) {
            newEmails.push({
              id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              destinataireEmail: nextStudent.emailAcademique,
              destinataireNom: `${nextStudent.prenom} ${nextStudent.nom}`,
              destinataireNumero: nextStudent.numeroEtudiant,
              sujet: `Exemplaire disponible (File d'attente) : ${ow.titre}`,
              corps: `Bonjour ${nextStudent.prenom},\n\nLe délai de réservation de 24 heures de l'étudiant précédent a expiré. L'exemplaire physique de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}) vous est maintenant réservé pour une durée de 24 heures calendaires.\n\nEmplacement de rangement : Tiroir ${ex.emplacement.tiroir}, Rangée ${ex.emplacement.rangee}\nDate limite impérative de retrait : ${newDeadline}\n\nVeuillez vous présenter au guichet de la bibliothèque avec votre carte d'étudiant pour scanner et valider votre prêt.\nPassé ce délai de 24h, l'exemplaire sera automatiquement réattribué à l'étudiant suivant dans la file d'attente.\n\nCordialement,\nLe Service des Prêts Universitaire`,
              dateEnvoi: effectiveDate,
              heureEnvoi: '08:00',
              type: 'RESERVATION_DISPONIBLE',
              ouvrageId: ow.id,
              ouvrageTitre: ow.titre,
              exemplaireId: ex.id,
              exemplaireCode: ex.codeQR,
              emplacement: ex.emplacement,
              dateLimiteRetrait: newDeadline,
              adherentId: nextStudent.id
            });
          }
        } else if (copyId) {
          copiesToRevert.push(copyId);
        }
      }

      return nextDemandesState;
    });

    if (newEmails.length > 0) {
      setNotifications(prev => [...newEmails, ...prev]);
    }

    if (copiesToRevert.length > 0) {
      setExemplaires(prevEx => prevEx.map(e => copiesToRevert.includes(e.id) ? {
        ...e,
        statut: 'DISPONIBLE'
      } : e));
    }
  };

  // Automatic verification of overdue loan reminders
  // 1er rappel 2 jours après dateRetourPrevue ; 2e rappel 2 jours après le premier (J+4)
  const checkOverdueReminders = (targetDateStr?: string): { remindersCount: number } => {
    const effectiveDate = targetDateStr || currentDate;
    const newReminders: EmailNotification[] = [];
    const updatedEmpruntsMap = new Map<string, { nbRappels: number; dateDernierRappel: string }>();

    for (const emp of emprunts) {
      if (emp.statut !== 'en_cours') continue;
      if (emp.dateRetourPrevue >= effectiveDate) continue; // Not overdue

      const daysLate = Math.floor(
        (new Date(effectiveDate).getTime() - new Date(emp.dateRetourPrevue).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLate <= 0) continue;

      const nbRappels = emp.nbRappels || 0;
      const adh = getAdherentById(emp.adherentId);
      const ow = getOuvrageById(emp.ouvrageId);
      const ex = getExemplaireById(emp.exemplaireId);
      if (!adh || !ow) continue;

      const datePrevueFr = new Date(emp.dateRetourPrevue).toLocaleDateString('fr-FR');

      // Rule: 1er rappel 2 jours après dateRetourPrevue (daysLate >= 2)
      if (nbRappels === 0 && daysLate >= 2) {
        newReminders.push({
          id: `notif_rap1_${emp.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          destinataireEmail: adh.emailAcademique,
          destinataireNom: `${adh.prenom} ${adh.nom}`,
          destinataireNumero: adh.numeroEtudiant,
          sujet: `1er Rappel de retard : ${ow.titre}`,
          corps: `Bonjour ${adh.prenom},\n\nSauf erreur de notre part, l'emprunt de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}, Exemplaire : ${ex?.codeQR || ''}) souscrit sous votre compte étudiant (${adh.numeroEtudiant}) est arrivé à échéance le ${datePrevueFr}.\n\nNombre de jours de retard constatés : ${daysLate} jour(s).\n\nConformément au règlement universitaire, tout retard non régularisé entraîne le blocage immédiat de vos nouveaux emprunts au guichet. Merci de rapporter cet exemplaire dans les meilleurs délais.\n\nCordialement,\nLe Service des Prêts Universitaire`,
          dateEnvoi: effectiveDate,
          heureEnvoi: '08:30',
          type: 'RAPPEL_RETARD_1',
          ouvrageId: ow.id,
          ouvrageTitre: ow.titre,
          exemplaireId: ex?.id,
          exemplaireCode: ex?.codeQR,
          adherentId: adh.id
        });

        updatedEmpruntsMap.set(emp.id, {
          nbRappels: 1,
          dateDernierRappel: effectiveDate
        });
      }
      // Rule: 2e rappel 2 jours après le premier rappel (daysLate >= 4)
      else if (nbRappels === 1 && daysLate >= 4) {
        newReminders.push({
          id: `notif_rap2_${emp.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          destinataireEmail: adh.emailAcademique,
          destinataireNom: `${adh.prenom} ${adh.nom}`,
          destinataireNumero: adh.numeroEtudiant,
          sujet: `2e et Dernier Rappel de retard : ${ow.titre}`,
          corps: `Bonjour ${adh.prenom},\n\nCeci est le second rappel concernant le retard de restitution de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}, Exemplaire : ${ex?.codeQR || ''}), dont la date prévue de retour était le ${datePrevueFr}.\n\nNombre de jours de retard : ${daysLate} jour(s).\n\nSans restitution immédiate, votre dossier sera transmis pour contact direct (« À contacter ») et vos droits d'emprunt demeurent entièrement suspendus.\n\nCordialement,\nLe Service des Prêts Universitaire`,
          dateEnvoi: effectiveDate,
          heureEnvoi: '08:30',
          type: 'RAPPEL_RETARD_2',
          ouvrageId: ow.id,
          ouvrageTitre: ow.titre,
          exemplaireId: ex?.id,
          exemplaireCode: ex?.codeQR,
          adherentId: adh.id
        });

        updatedEmpruntsMap.set(emp.id, {
          nbRappels: 2,
          dateDernierRappel: effectiveDate
        });
      }
    }

    if (updatedEmpruntsMap.size > 0) {
      setEmprunts(prev => prev.map(e => {
        const update = updatedEmpruntsMap.get(e.id);
        if (update) {
          return {
            ...e,
            nbRappels: update.nbRappels,
            dateDernierRappel: update.dateDernierRappel
          };
        }
        return e;
      }));
    }

    if (newReminders.length > 0) {
      setNotifications(prev => [...newReminders, ...prev]);
    }

    return { remindersCount: newReminders.length };
  };

  // Automated daily check (Contrôle automatique lancé à l'ouverture et au moins 1x par jour)
  // Il traite les rappels de retard et les réservations expirées.
  const runDailyChecks = (targetDateStr?: string): { expiredReservationsCount: number; remindersSentCount: number } => {
    const effectiveDate = targetDateStr || currentDate;
    checkExpiredReservations(effectiveDate);
    const { remindersCount } = checkOverdueReminders(effectiveDate);
    return {
      expiredReservationsCount: 0,
      remindersSentCount: remindersCount
    };
  };

  const advanceOneDay = () => {
    const nextDate = addDaysToDate(currentDate, 1);
    setSimulatedDate(nextDate);
    runDailyChecks(nextDate);
  };

  const advanceDays = (days: number) => {
    const nextDate = addDaysToDate(currentDate, days);
    setSimulatedDate(nextDate);
    runDailyChecks(nextDate);
  };

  useEffect(() => {
    // Run automated daily check at startup and whenever date changes
    runDailyChecks(currentDate);
  }, [currentDate]);

  // Automated Return by Scan
  const returnByScan = (
    exemplaireCodeOrId: string,
    etat: 'bon' | 'abime'
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
        dateRetourEffective: currentDate,
        etatAuRetour: etat === 'bon' ? 'bon' : 'abîmé'
      } : e));
    } else {
      // Rule 5: S'il n'y a pas d'emprunt en cours (livre lu sur place), afficher seulement l'emplacement sans modifier aucun statut.
      return {
        success: true,
        hadActiveLoan: false,
        exemplaire: ex,
        emplacement: ex.emplacement,
        ouvrage: ow,
        isOverdue: false,
        daysLate: 0,
        isReservedForQueue: false
      };
    }

    // Physical copy condition check and waiting queue resolution
    if (etat === 'bon') {
      // Check if waiting queue is not empty for this book
      const waitingDemands = demandes
        .filter(d => d.ouvrageId === ex.ouvrageId && d.statut === 'EN_ATTENTE')
        .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

      if (waitingDemands.length > 0 && ow) {
        // Rule: AU RETOUR D'UN EXEMPLAIRE EN BON ÉTAT, SI LA FILE N'EST PAS VIDE
        // 1. L'exemplaire passe à RESERVE au lieu de DISPONIBLE.
        // 2. La première demande passe à NOTIFIEE, avec dateNotification et dateLimiteRetrait = notification + 1 jour.
        // 3. Un e-mail est envoyé à l'e-mail académique de cet adhérent (titre, emplacement, date limite).
        // 4. Le livre est rangé en tiroir normalement (pas de geste en plus).
        const firstDemand = waitingDemands[0];
        const dateLimiteRetrait = addDaysToDate(currentDate, 1);
        const studentToNotify = getAdherentById(firstDemand.adherentId);

        updateExemplaire(ex.id, {
          statut: 'RESERVE',
          etat: 'bon'
        });

        setDemandes(prev => prev.map(d => d.id === firstDemand.id ? {
          ...d,
          statut: 'NOTIFIEE',
          dateNotification: currentDate,
          dateLimiteRetrait,
          exemplaireReserveId: ex.id
        } : d));

        if (studentToNotify) {
          sendNotificationEmail({
            destinataireEmail: studentToNotify.emailAcademique,
            destinataireNom: `${studentToNotify.prenom} ${studentToNotify.nom}`,
            destinataireNumero: studentToNotify.numeroEtudiant,
            sujet: `Exemplaire disponible (File d'attente) : ${ow.titre}`,
            corps: `Bonjour ${studentToNotify.prenom},\n\nUn exemplaire physique de l'ouvrage "${ow.titre}" (Cote : ${ow.cote}) vient d'être restitué au guichet.\nIl vous est exclusivement réservé pour une durée de 24 heures calendaires.\n\nEmplacement de rangement : Tiroir ${ex.emplacement.tiroir}, Rangée ${ex.emplacement.rangee}\nDate limite impérative de retrait : ${dateLimiteRetrait}\n\nVeuillez vous présenter au guichet de la bibliothèque avec votre carte d'étudiant pour scanner et enregistrer votre prêt.\nPassé ce délai de 24h, l'exemplaire sera automatiquement réattribué à l'étudiant suivant dans la file d'attente.\n\nCordialement,\nLe Service des Prêts Universitaire`,
            dateEnvoi: currentDate,
            heureEnvoi: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            type: 'RESERVATION_DISPONIBLE',
            ouvrageId: ow.id,
            ouvrageTitre: ow.titre,
            exemplaireId: ex.id,
            exemplaireCode: ex.codeQR,
            emplacement: ex.emplacement,
            dateLimiteRetrait,
            adherentId: studentToNotify.id
          });
        }

        const updatedEx: Exemplaire = {
          ...ex,
          statut: 'RESERVE',
          etat: 'bon'
        };

        return {
          success: true,
          hadActiveLoan: Boolean(activeLoan),
          exemplaire: updatedEx,
          emplacement: ex.emplacement,
          ouvrage: ow,
          adherent: student,
          isOverdue,
          daysLate,
          isReservedForQueue: true,
          reservedStudent: studentToNotify,
          dateLimiteRetrait
        };
      } else {
        // Queue is empty -> copy becomes DISPONIBLE
        updateExemplaire(ex.id, {
          statut: 'DISPONIBLE',
          etat: 'bon'
        });

        const updatedEx: Exemplaire = {
          ...ex,
          statut: 'DISPONIBLE',
          etat: 'bon'
        };

        return {
          success: true,
          hadActiveLoan: Boolean(activeLoan),
          exemplaire: updatedEx,
          emplacement: ex.emplacement,
          ouvrage: ow,
          adherent: student,
          isOverdue,
          daysLate,
          isReservedForQueue: false
        };
      }
    } else {
      // Dommage constaté -> EN_REPARATION (etat: abîmé)
      updateExemplaire(ex.id, {
        statut: 'EN_REPARATION',
        etat: 'abîmé'
      });

      const updatedEx: Exemplaire = {
        ...ex,
        statut: 'EN_REPARATION',
        etat: 'abîmé'
      };

      return {
        success: true,
        hadActiveLoan: Boolean(activeLoan),
        exemplaire: updatedEx,
        emplacement: ex.emplacement,
        ouvrage: ow,
        adherent: student,
        isOverdue,
        daysLate,
        isReservedForQueue: false
      };
    }
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

    // Check if it's an Adherent QR or Numero Etudiant
    const matchedAdh = adherents.find(a => 
      a.codeQR.trim().toUpperCase() === trimmed || 
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
    const nonDestroyedCopies = exemplaires.filter(e => e.statut !== 'DETRUIT');
    const totalExemplaires = nonDestroyedCopies.length;
    const disponiblesEnRayon = exemplaires.filter(e => e.statut === 'DISPONIBLE').length;
    const empruntsEnCours = emprunts.filter(e => e.statut === 'en_cours').length;
    const empruntsEnRetard = emprunts.filter(e => isEmpruntEnRetard(e)).length;
    const empruntsAContacter = emprunts.filter(e => isEmpruntAContacter(e)).length;
    const rupturesStock = ouvrages.filter(ow => {
      if (!ow.empruntable) return false;
      const copies = exemplaires.filter(e => e.ouvrageId === ow.id && e.statut !== 'DETRUIT');
      const avail = copies.filter(e => e.statut === 'DISPONIBLE').length;
      if (avail > 0) return false;
      const hasDemandes = demandes.some(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'));
      return hasDemandes;
    }).length;
    const adherentsActifs = adherents.filter(a => a.statut === 'actif').length;
    const demandesEnAttente = demandes.filter(d => d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE').length;
    const exemplairesReserves = exemplaires.filter(e => e.statut === 'RESERVE').length;
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
      demandesEnAttente,
      exemplairesReserves,
      notificationsTotal
    };
  }, [ouvrages, exemplaires, emprunts, adherents, demandes, notifications, currentDate]);

  const resetToDefaultData = () => {
    if (window.confirm("Réinitialiser toutes les données aux valeurs de démonstration universitaires ?")) {
      localStorage.removeItem(STORAGE_KEY_OUVRAGES);
      localStorage.removeItem(STORAGE_KEY_EXEMPLAIRES);
      localStorage.removeItem(STORAGE_KEY_ADHERENTS);
      localStorage.removeItem(STORAGE_KEY_EMPRUNTS);
      localStorage.removeItem(STORAGE_KEY_DEMANDES);
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEY_SIM_DATE);
      setOuvrages(INITIAL_OUVRAGES);
      setExemplaires(INITIAL_EXEMPLAIRES);
      setAdherents(INITIAL_ADHERENTS);
      setEmprunts(INITIAL_EMPRUNTS);
      setDemandes(INITIAL_DEMANDES);
      setNotifications(INITIAL_NOTIFICATIONS);
      setSimulatedDateState(null);
    }
  };

  const exportDatabaseJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      simulatedDate: currentDate,
      ouvrages,
      exemplaires,
      adherents,
      emprunts,
      demandes,
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
        isSimulatedDate,
        setSimulatedDate,
        resetSimulatedDate,
        advanceOneDay,
        advanceDays,
        ouvrages,
        exemplaires,
        adherents,
        emprunts,
        demandes,
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
        runDailyChecks,
        loanDurationDays,
        setLoanDurationDays,
        addOuvrage,
        updateOuvrage,
        addExemplairesToOuvrage,
        updateExemplaire,
        reformeExemplaire,
        reparerExemplaire,
        declarerDommageRayon,
        declarerPerdu,
        declarerRetrouve,
        addLoan,
        addLoanByScan,
        returnLoan,
        returnByScan,
        inscrireFileAttente,
        annulerDemande,
        getQueueForOuvrage,
        getStudentRankInQueue,
        checkExpiredReservations,
        activeQueueModalOuvrageId,
        setActiveQueueModalOuvrageId,
        isNotificationsModalOpen,
        setIsNotificationsModalOpen,
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
        exportDatabaseJSON
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
