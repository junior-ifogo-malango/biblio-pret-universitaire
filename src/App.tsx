/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { ManagerLayout } from './components/ManagerLayout';
import { StudentCatalogView } from './components/StudentCatalogView';
import { StudentWelcomeView } from './components/StudentWelcomeView';
import { lireEtudiantConnecte, seDeconnecter, ConnectedStudent, observerEtatAuth } from './services/authService';
import { DashboardView } from './components/DashboardView';
import { LoansView } from './components/LoansView';
import { BooksView } from './components/BooksView';
import { MembersView } from './components/MembersView';
import { HistoryView } from './components/HistoryView';
import { AlertsView } from './components/AlertsView';

// Modals
import { ManagerLoginModal } from './components/ManagerLoginModal';
import { QRScannerModal } from './components/QRScannerModal';
import { ExemplaireSheetModal } from './components/ExemplaireSheetModal';
import { PrintableQRLabelsModal } from './components/PrintableQRLabelsModal';
import { ScanLoanModal } from './components/ScanLoanModal';
import { ScanReturnModal } from './components/ScanReturnModal';
import { LoanReceiptModal } from './components/LoanReceiptModal';
import { BookDetailModal } from './components/BookDetailModal';
import { NewBookModal } from './components/NewBookModal';
import { MemberDetailModal } from './components/MemberDetailModal';
import { ImportStudentsModal } from './components/ImportStudentsModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { SettingsView } from './components/SettingsView';
import { HelpView } from './components/HelpView';

const MainManagerContent: React.FC = () => {
  const { activeManagerTab, setActiveManagerTab } = useLibrary();

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      {activeManagerTab !== 'dashboard' && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setActiveManagerTab('dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <span>← Accueil</span>
          </button>
        </div>
      )}
      {activeManagerTab === 'dashboard' && <DashboardView />}
      {activeManagerTab === 'loans' && <LoansView />}
      {activeManagerTab === 'catalog' && <BooksView />}
      {activeManagerTab === 'students' && <MembersView />}
      {activeManagerTab === 'history' && <HistoryView />}
      {activeManagerTab === 'alerts' && <AlertsView />}
      {activeManagerTab === 'settings' && <SettingsView />}
      {activeManagerTab === 'help' && <HelpView />}
    </main>
  );
};

const RootView: React.FC = () => {
  const [connectedStudent, setConnectedStudent] = React.useState<ConnectedStudent | null>(() => {
    return lireEtudiantConnecte();
  });

  const handleStudentLogout = async () => {
    await seDeconnecter();
    setConnectedStudent(null);
  };

  const { 
    userRole, 
    adherents,
    allowedAcademicDomain,
    ensureStudentAdherent,
    isQRScannerOpen, 
    setIsQRScannerOpen, 
    scanQRCode,
    scannedExemplaire,
    setScannedExemplaire,
    activePrintLabelsOuvrageId,
    setActivePrintLabelsOuvrageId,
    activePrintLabelExemplaireIds,
    setActivePrintLabelExemplaireIds,
    ouvrages,
    exemplaires,
    getOuvrageById,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen
  } = useLibrary();

  const handleStudentLoginSuccess = (student: ConnectedStudent) => {
    ensureStudentAdherent(student);
    setConnectedStudent(student);
  };

  React.useEffect(() => {
    const unsub = observerEtatAuth(
      (student) => {
        if (student) {
          ensureStudentAdherent(student);
          setConnectedStudent(student);
        }
      },
      adherents,
      allowedAcademicDomain
    );
    return () => unsub();
  }, [adherents, allowedAcademicDomain, ensureStudentAdherent]);

  const activePrintOuvrage = activePrintLabelsOuvrageId ? getOuvrageById(activePrintLabelsOuvrageId) : null;
  const copiesToPrint = activePrintLabelExemplaireIds
    ? exemplaires.filter(e => activePrintLabelExemplaireIds.includes(e.id))
    : activePrintLabelsOuvrageId
      ? exemplaires.filter(e => e.ouvrageId === activePrintLabelsOuvrageId)
      : [];

  const handleScanDetected = (scannedCode: string) => {
    setIsQRScannerOpen(false);
    const res = scanQRCode(scannedCode);
    if (!res.found) {
      alert(`Code QR "${scannedCode}" introuvable dans le système universitaire (ni exemplaire, ni carte étudiante).`);
    }
  };

  if (userRole === 'student') {
    if (!connectedStudent) {
      return (
        <>
          <StudentWelcomeView onLoginSuccess={handleStudentLoginSuccess} />
          <ManagerLoginModal />
        </>
      );
    }

    return (
      <>
        <StudentCatalogView 
          currentStudent={connectedStudent} 
          onLogout={handleStudentLogout} 
        />
        <ManagerLoginModal />
      </>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      <ManagerLayout>
        <MainManagerContent />
      </ManagerLayout>

      {/* Global Modals */}
      <ManagerLoginModal />
      
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleScanDetected}
      />

      <ExemplaireSheetModal
        exemplaire={scannedExemplaire}
        onClose={() => setScannedExemplaire(null)}
      />

      <PrintableQRLabelsModal
        isOpen={Boolean(activePrintLabelsOuvrageId || (activePrintLabelExemplaireIds && activePrintLabelExemplaireIds.length > 0))}
        onClose={() => {
          setActivePrintLabelsOuvrageId(null);
          setActivePrintLabelExemplaireIds(null);
        }}
        ouvrage={activePrintOuvrage}
        exemplaires={copiesToPrint}
        allOuvrages={ouvrages}
      />

      <ScanLoanModal />
      <ScanReturnModal />
      <LoanReceiptModal />
      <BookDetailModal />
      <NewBookModal />
      <MemberDetailModal />
      <ImportStudentsModal />
      <GlobalSearchModal 
        isOpen={isGlobalSearchOpen} 
        onClose={() => setIsGlobalSearchOpen(false)} 
      />

    </div>
  );
};

export default function App() {
  return (
    <LibraryProvider>
      <RootView />
    </LibraryProvider>
  );
}
