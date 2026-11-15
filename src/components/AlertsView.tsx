import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  PhoneCall,
  MailWarning,
  CheckCircle2,
  X
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Emprunt } from '../types';
import { getOverdueBadgeInfo } from '../utils/overdueUtils';
import { ReminderModal } from './ReminderModal';

interface OverdueLoanItem {
  loan: Emprunt;
  daysLate: number;
}

interface AlertPopupInfo {
  tab: 'aTraiter' | 'aContacter';
  loan: Emprunt;
  daysLate: number;
}

export const AlertsView: React.FC = () => {
  const {
    emprunts,
    getOuvrageById,
    getAdherentById,
    getJoursDeRetard,
    markLoansAsContacted
  } = useLibrary();

  const [activeTab, setActiveTab] = useState<'aTraiter' | 'aContacter'>('aTraiter');
  const [selectedToProcessIds, setSelectedToProcessIds] = useState<Set<string>>(new Set());
  const [selectedToContactIds, setSelectedToContactIds] = useState<Set<string>>(new Set());
  const [modalLoans, setModalLoans] = useState<Emprunt[]>([]);
  const [popupInfo, setPopupInfo] = useState<AlertPopupInfo | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // 1. « À traiter » : tous les retards à partir de J+1, triés par jours de retard décroissants
  const loansToProcess = useMemo<OverdueLoanItem[]>(() => {
    const items: OverdueLoanItem[] = [];
    for (const loan of emprunts) {
      if (loan.statut !== 'en_cours' || loan.annule) continue;
      const days = getJoursDeRetard(loan.dateRetourPrevue);
      if (days >= 1) {
        items.push({ loan, daysLate: days });
      }
    }
    return items.sort((a, b) => b.daysLate - a.daysLate);
  }, [emprunts, getJoursDeRetard]);

  // 2. « À contacter » : retards de J+7 et plus (apparaissent aussi dans À traiter)
  const loansToContact = useMemo<OverdueLoanItem[]>(() => {
    return loansToProcess.filter(item => item.daysLate >= 7);
  }, [loansToProcess]);

  // Fermeture du petit pop-up par Échap
  useEffect(() => {
    if (!popupInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopupInfo(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupInfo]);

  // Sélection dans « À traiter »
  const validSelectedToProcess = useMemo(() => {
    const validIds = new Set(loansToProcess.map(i => i.loan.id));
    return new Set(Array.from(selectedToProcessIds).filter(id => validIds.has(id)));
  }, [loansToProcess, selectedToProcessIds]);

  const isAllToProcessSelected =
    loansToProcess.length > 0 && validSelectedToProcess.size === loansToProcess.length;

  const toggleSelectAllToProcess = () => {
    if (isAllToProcessSelected) {
      setSelectedToProcessIds(new Set());
    } else {
      setSelectedToProcessIds(new Set(loansToProcess.map(i => i.loan.id)));
    }
  };

  const toggleSelectToProcess = (loanId: string) => {
    setSelectedToProcessIds(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  // Sélection dans « À contacter »
  const validSelectedToContact = useMemo(() => {
    const validIds = new Set(loansToContact.map(i => i.loan.id));
    return new Set(Array.from(selectedToContactIds).filter(id => validIds.has(id)));
  }, [loansToContact, selectedToContactIds]);

  const isAllToContactSelected =
    loansToContact.length > 0 && validSelectedToContact.size === loansToContact.length;

  const toggleSelectAllToContact = () => {
    if (isAllToContactSelected) {
      setSelectedToContactIds(new Set());
    } else {
      setSelectedToContactIds(new Set(loansToContact.map(i => i.loan.id)));
    }
  };

  const toggleSelectToContact = (loanId: string) => {
    setSelectedToContactIds(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const handleOpenGroupedMessages = () => {
    const selectedLoans = loansToProcess
      .filter(item => validSelectedToProcess.has(item.loan.id))
      .map(item => item.loan);
    if (selectedLoans.length === 0) return;
    setModalLoans(selectedLoans);
  };

  const handleMarkContacted = () => {
    const ids = Array.from(validSelectedToContact);
    if (ids.length === 0) return;
    const res = markLoansAsContacted(ids);
    setSelectedToContactIds(new Set());
    setFeedback(`${res.count} dossier${res.count > 1 ? 's marqués comme contactés' : ' marqué comme contacté'}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const formatRemindersCount = (nbRappels: number) => {
    if (!nbRappels || nbRappels <= 0) return 'Aucun rappel';
    return `${nbRappels} rappel${nbRappels > 1 ? 's' : ''} envoyé${nbRappels > 1 ? 's' : ''}`;
  };

  const popupAdherent = popupInfo ? getAdherentById(popupInfo.loan.adherentId) : undefined;
  const popupOuvrage = popupInfo ? getOuvrageById(popupInfo.loan.ouvrageId) : undefined;
  const popupBadge = popupInfo
    ? getOverdueBadgeInfo(popupInfo.daysLate, popupInfo.daysLate >= 7)
    : null;

  return (
    <div className="space-y-5 pb-12 font-sans max-w-[1100px] mx-auto">
      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Deux onglets avec compteurs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('aTraiter')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'aTraiter'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MailWarning className="w-3.5 h-3.5" />
          <span>À traiter</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'aTraiter' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {loansToProcess.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aContacter')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'aContacter'
              ? 'bg-red-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>À contacter</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'aContacter' ? 'bg-red-950 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {loansToContact.length}
          </span>
        </button>
      </div>

      {/* 1. Onglet « À traiter » (tous les retards J+1 et plus) */}
      {activeTab === 'aTraiter' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="alerts-select-all-process"
                checked={isAllToProcessSelected}
                onChange={toggleSelectAllToProcess}
                disabled={loansToProcess.length === 0}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
              />
              <label
                htmlFor="alerts-select-all-process"
                className="text-sm font-semibold text-slate-900 cursor-pointer"
              >
                Tout sélectionner
              </label>
              <span className="text-xs text-slate-500 font-medium">
                ({validSelectedToProcess.size} sélectionnée{validSelectedToProcess.size > 1 ? 's' : ''})
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenGroupedMessages}
              disabled={validSelectedToProcess.size === 0}
              className="min-h-[40px] px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Envoyer les rappels ({validSelectedToProcess.size})</span>
            </button>
          </div>

          {loansToProcess.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              Rien à traiter aujourd'hui
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {loansToProcess.map(({ loan, daysLate }) => {
                const adh = getAdherentById(loan.adherentId);
                const badge = getOverdueBadgeInfo(daysLate);
                const isChecked = validSelectedToProcess.has(loan.id);

                return (
                  <div
                    key={loan.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-slate-50/70 transition px-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectToProcess(loan.id)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                        aria-label={`Sélectionner ${adh?.nom || ''} ${adh?.prenom || ''}`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopupInfo({ tab: 'aTraiter', loan, daysLate });
                        }}
                        className="text-left text-slate-900 hover:text-amber-700 hover:underline underline-offset-2 cursor-pointer truncate"
                      >
                        <strong className="font-bold">{adh?.nom.toUpperCase()}</strong> {adh?.prenom}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500 font-medium shrink-0 whitespace-nowrap">
                      {formatRemindersCount(loan.nbRappels)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Onglet « À contacter » (J+7 et plus) */}
      {activeTab === 'aContacter' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="alerts-select-all-contact"
                checked={isAllToContactSelected}
                onChange={toggleSelectAllToContact}
                disabled={loansToContact.length === 0}
                className="w-4 h-4 rounded border-slate-300 text-red-900 focus:ring-red-800 cursor-pointer disabled:opacity-40"
              />
              <label
                htmlFor="alerts-select-all-contact"
                className="text-sm font-semibold text-slate-900 cursor-pointer"
              >
                Tout sélectionner
              </label>
              <span className="text-xs text-slate-500 font-medium">
                ({validSelectedToContact.size} sélectionnée{validSelectedToContact.size > 1 ? 's' : ''})
              </span>
            </div>

            <button
              type="button"
              onClick={handleMarkContacted}
              disabled={validSelectedToContact.size === 0}
              className="min-h-[40px] px-4 py-2 bg-red-900 hover:bg-red-950 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Marquer comme contactés ({validSelectedToContact.size})</span>
            </button>
          </div>

          {loansToContact.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              Rien à traiter aujourd'hui
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {loansToContact.map(({ loan, daysLate }) => {
                const adh = getAdherentById(loan.adherentId);
                const badge = getOverdueBadgeInfo(daysLate, true);
                const isChecked = validSelectedToContact.has(loan.id);

                return (
                  <div
                    key={loan.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm hover:bg-slate-50/70 transition px-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectToContact(loan.id)}
                        className="w-4 h-4 rounded border-slate-300 text-red-900 focus:ring-red-800 cursor-pointer shrink-0"
                        aria-label={`Sélectionner ${adh?.nom || ''} ${adh?.prenom || ''}`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopupInfo({ tab: 'aContacter', loan, daysLate });
                        }}
                        className="text-left text-slate-900 hover:text-amber-700 hover:underline underline-offset-2 cursor-pointer truncate"
                      >
                        <strong className="font-bold">{adh?.nom.toUpperCase()}</strong> {adh?.prenom}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500 font-medium shrink-0 whitespace-nowrap">
                      {formatRemindersCount(loan.nbRappels)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Petit pop-up au clic sur le nom */}
      {popupInfo && popupBadge && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
          onClick={() => setPopupInfo(null)}
        >
          <div
            className="bg-white w-full h-full sm:h-auto sm:max-w-md rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-bold font-serif truncate">
                  {popupInfo.tab === 'aTraiter' ? 'Détail du retard' : 'Étudiant à contacter'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${popupBadge.className}`}>
                  {popupBadge.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPopupInfo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs flex-1 overflow-y-auto">
              {popupInfo.tab === 'aTraiter' ? (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Ouvrage</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {popupOuvrage?.titre || 'Ouvrage inconnu'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Jours de retard</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${popupBadge.className}`}>
                      {popupBadge.label}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Nom</span>
                        <span className="font-bold text-slate-900">
                          {popupAdherent?.nom.toUpperCase() || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Prénom</span>
                        <span className="font-semibold text-slate-900">
                          {popupAdherent?.prenom || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Filière</span>
                        <span className="font-medium text-slate-800">
                          {popupAdherent?.filiere || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Niveau</span>
                        <span className="font-medium text-slate-800">
                          {popupAdherent?.niveau || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Numéro d'étudiant</span>
                        <span className="font-mono font-bold text-slate-900">
                          {popupAdherent?.numeroEtudiant || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">E-mail académique</span>
                        <span className="font-mono text-slate-800 break-all">
                          {popupAdherent?.emailAcademique || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Ouvrage</span>
                      <span className="text-sm font-bold text-slate-900">
                        {popupOuvrage?.titre || 'Ouvrage inconnu'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Jours de retard</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${popupBadge.className}`}>
                        {popupBadge.label}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPopupInfo(null)}
                className="min-h-[40px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fenêtre unique d'envoi groupé par niveau */}
      <ReminderModal
        loans={modalLoans}
        onClose={() => setModalLoans([])}
        onRecorded={(count) => {
          setSelectedToProcessIds(new Set());
          setFeedback(`${count} message${count > 1 ? 's enregistrés' : ' enregistré'}`);
          setTimeout(() => setFeedback(null), 4000);
        }}
      />
    </div>
  );
};
