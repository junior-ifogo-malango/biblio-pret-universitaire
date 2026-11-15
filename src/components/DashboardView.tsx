import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  BookOpen,
  Users,
  AlertCircle,
  CheckCircle2,
  Send,
  X
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { getOverdueBadgeInfo } from '../utils/overdueUtils';
import { ReminderModal } from './ReminderModal';
import { Emprunt } from '../types';

export const DashboardView: React.FC = () => {
  const {
    emprunts,
    stats,
    setActiveManagerTab,
    getOuvrageById,
    getAdherentById,
    getJoursDeRetard
  } = useLibrary();

  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(new Set());
  const [modalLoans, setModalLoans] = useState<Emprunt[]>([]);
  const [popupInfo, setPopupInfo] = useState<{ loan: Emprunt; daysLate: number } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Éléments à traiter : tous les emprunts en retard (J+1 et plus), triés par jours de retard décroissants
  const itemsToProcess = useMemo(() => {
    const overdue: Array<{ loan: Emprunt; daysLate: number }> = [];

    for (const loan of emprunts) {
      if (loan.statut !== 'en_cours' || loan.annule) continue;
      const days = getJoursDeRetard(loan.dateRetourPrevue);
      if (days <= 0) continue;
      overdue.push({ loan, daysLate: days });
    }

    return overdue.sort((a, b) => b.daysLate - a.daysLate);
  }, [emprunts, getJoursDeRetard]);

  // Au plus 5 lignes affichées dans le bloc du tableau de bord
  const visibleItems = useMemo(() => itemsToProcess.slice(0, 5), [itemsToProcess]);

  // La sélection ne concerne que les lignes affichées (5 au plus)
  const validSelectedIds = useMemo(() => {
    const visibleIds = new Set(visibleItems.map(i => i.loan.id));
    return new Set(Array.from(selectedLoanIds).filter(id => visibleIds.has(id)));
  }, [visibleItems, selectedLoanIds]);

  const isAllVisibleSelected =
    visibleItems.length > 0 && validSelectedIds.size === visibleItems.length;

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedLoanIds(new Set());
    } else {
      setSelectedLoanIds(new Set(visibleItems.map(i => i.loan.id)));
    }
  };

  const toggleSelectRow = (loanId: string) => {
    setSelectedLoanIds(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const handleOpenGroupedReminder = () => {
    const loans = visibleItems
      .filter(i => validSelectedIds.has(i.loan.id))
      .map(i => i.loan);
    if (loans.length === 0) return;
    setModalLoans(loans);
  };

  const formatRemindersCount = (nbRappels: number) => {
    if (!nbRappels || nbRappels <= 0) return 'Aucun rappel';
    return `${nbRappels} rappel${nbRappels > 1 ? 's' : ''} envoyé${nbRappels > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    if (!popupInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopupInfo(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupInfo]);

  const popupOuvrage = popupInfo ? getOuvrageById(popupInfo.loan.ouvrageId) : undefined;
  const popupBadge = popupInfo
    ? getOverdueBadgeInfo(popupInfo.daysLate, popupInfo.daysLate >= 7)
    : null;

  return (
    <div className="space-y-6 font-sans">
      {/* Feedback message après action */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* BLOC 1 : Quatre indicateurs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Emprunts en cours */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('loans')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition hover:border-slate-300 text-left cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Emprunts en cours</span>
            <Package className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {stats.empruntsEnCours}
            </span>
          </div>
        </button>

        {/* 2. Exemplaires disponibles */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('catalog')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition hover:border-slate-300 text-left cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Exemplaires disponibles</span>
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {stats.disponiblesEnRayon}
            </span>
          </div>
        </button>

        {/* 3. Adhérents actifs */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('students')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition hover:border-slate-300 text-left cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Adhérents actifs</span>
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {stats.adherentsActifs}
            </span>
          </div>
        </button>

        {/* 4. Retards à traiter */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('alerts')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition hover:border-slate-300 text-left cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Retards à traiter</span>
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-3">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                stats.empruntsEnRetard > 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {stats.empruntsEnRetard}
            </span>
          </div>
        </button>
      </div>

      {/* BLOC 2 : « À traiter » (sur toute la largeur) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900">À traiter</h2>
            {itemsToProcess.length > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {itemsToProcess.length} emprunt{itemsToProcess.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {itemsToProcess.length > 5 && (
            <button
              type="button"
              onClick={() => setActiveManagerTab('alerts')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline underline-offset-2 cursor-pointer"
            >
              Voir tout ({itemsToProcess.length})
            </button>
          )}
        </div>

        {itemsToProcess.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Rien à traiter aujourd'hui
          </div>
        ) : (
          <>
            {/* Barre de sélection groupée */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="dashboard-select-all-visible"
                  checked={isAllVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="dashboard-select-all-visible"
                  className="text-xs font-semibold text-slate-900 cursor-pointer"
                >
                  Tout sélectionner
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  ({validSelectedIds.size} sélectionné{validSelectedIds.size > 1 ? 's' : ''})
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenGroupedReminder}
                disabled={validSelectedIds.size === 0}
                className="min-h-[38px] px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer les rappels ({validSelectedIds.size})</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {visibleItems.map(({ loan, daysLate }) => {
                const adh = getAdherentById(loan.adherentId);
                const badge = getOverdueBadgeInfo(daysLate, daysLate >= 7);
                const isChecked = validSelectedIds.has(loan.id);

                return (
                  <div
                    key={loan.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-slate-50/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectRow(loan.id)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                        aria-label={`Sélectionner ${adh?.nom || ''} ${adh?.prenom || ''}`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopupInfo({ loan, daysLate });
                        }}
                        className="text-left text-slate-900 hover:text-amber-700 hover:underline underline-offset-2 cursor-pointer truncate"
                      >
                        <strong className="font-bold text-slate-900">{adh?.nom.toUpperCase()}</strong>{' '}
                        {adh?.prenom}
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
          </>
        )}
      </div>

      {/* Pop-up détail au clic sur le nom (identique à l'onglet À traiter de la page Alertes) */}
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
                <h3 className="text-sm font-bold font-serif truncate">Détail du retard</h3>
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

      {/* Fenêtre d'envoi groupé partagée */}
      <ReminderModal
        loans={modalLoans}
        onClose={() => setModalLoans([])}
        onRecorded={(count) => {
          setActionFeedback(`${count} message${count > 1 ? 's enregistrés' : ' enregistré'} dans le journal`);
          setTimeout(() => setActionFeedback(null), 4000);
        }}
      />
    </div>
  );
};
