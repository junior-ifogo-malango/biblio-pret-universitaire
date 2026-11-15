import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Copy, Check, CheckCheck, AlertCircle } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Emprunt, MessageLevel } from '../types';
import {
  MESSAGE_LEVEL_ORDER,
  buildBccMailtoBatches,
  buildGroupOverdueMessage,
  formatShortDayMonth,
  getMessageLevelForDaysLate,
  getOverdueBadgeInfo
} from '../utils/overdueUtils';

interface ReminderModalProps {
  loans?: Emprunt[];
  emprunt?: Emprunt | null;
  mode?: 'single' | 'queue';
  onClose: () => void;
  onRecorded?: (count: number) => void;
}

interface LevelLoanEntry {
  loan: Emprunt;
  daysLate: number;
  nomComplet: string;
  email: string;
  alreadySentDate?: string;
}

interface UndoRecord {
  empruntId: string;
  notificationId: string;
  previousNbRappels: number;
  previousDateDernierRappel?: string;
  previousDernierNiveauMessage?: MessageLevel;
  previousDernierJourRetardMessage?: number;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  loans,
  emprunt,
  onClose,
  onRecorded
}) => {
  const {
    getAdherentById,
    getJoursDeRetard,
    recordGroupReminders,
    revertGroupReminders
  } = useLibrary();

  const sourceLoans = useMemo(() => {
    if (loans && loans.length > 0) return loans;
    if (emprunt) return [emprunt];
    return [];
  }, [loans, emprunt]);

  // Regroupement stable à l'ouverture pour ne pas déplacer/perdre l'état pendant la coche
  const [snapshotLoanIds, setSnapshotLoanIds] = useState<string[]>([]);
  const loanSignature = useMemo(() => sourceLoans.map(l => l.id).join(','), [sourceLoans]);

  useEffect(() => {
    setSnapshotLoanIds(sourceLoans.map(l => l.id));
  }, [loanSignature]);

  // Regrouper les emprunts par palier (J+1, J+2, J+3-4, J+5, J+6, J+7+)
  const levelGroups = useMemo(() => {
    const grouped = new Map<MessageLevel, LevelLoanEntry[]>();

    for (const loan of sourceLoans) {
      const adh = getAdherentById(loan.adherentId);
      const daysLate = Math.max(1, getJoursDeRetard(loan.dateRetourPrevue));
      const level = getMessageLevelForDaysLate(daysLate);
      const alreadySentSameLevel =
        loan.dernierNiveauMessage === level && Boolean(loan.dateDernierRappel);

      const entry: LevelLoanEntry = {
        loan,
        daysLate,
        nomComplet: adh ? `${adh.nom.toUpperCase()} ${adh.prenom}` : 'Étudiant',
        email: adh?.emailAcademique || '',
        alreadySentDate: alreadySentSameLevel ? loan.dateDernierRappel : undefined
      };

      const list = grouped.get(level) || [];
      list.push(entry);
      grouped.set(level, list);
    }

    return MESSAGE_LEVEL_ORDER.filter(lvl => grouped.has(lvl)).map(lvl => {
      const entries = (grouped.get(lvl) || []).sort((a, b) => b.daysLate - a.daysLate);
      const template = buildGroupOverdueMessage(lvl);
      return {
        level: lvl,
        label: template.label,
        subject: template.subject,
        body: template.body,
        entries
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanSignature, snapshotLoanIds]);

  // Étudiants cochés par défaut dans chaque palier (décochés par défaut s'ils ont déjà reçu ce palier)
  const [includedLoanIds, setIncludedLoanIds] = useState<Set<string>>(new Set());
  // Paliers marqués « Envoyé » avec instantané d'annulation
  const [sentUndoByLevel, setSentUndoByLevel] = useState<Partial<Record<MessageLevel, UndoRecord[]>>>({});
  const [copiedLevel, setCopiedLevel] = useState<MessageLevel | null>(null);

  useEffect(() => {
    const initialIncluded = new Set<string>();
    for (const group of levelGroups) {
      for (const entry of group.entries) {
        if (!entry.alreadySentDate) {
          initialIncluded.add(entry.loan.id);
        }
      }
    }
    setIncludedLoanIds(initialIncluded);
    setSentUndoByLevel({});
    setCopiedLevel(null);
  }, [loanSignature]);

  // Fermeture par touche Échap
  useEffect(() => {
    if (sourceLoans.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourceLoans.length, onClose]);

  if (sourceLoans.length === 0) return null;

  const toggleStudentInLevel = (level: MessageLevel, loanId: string) => {
    // Si ce palier était déjà coché « Envoyé », on annule d'abord l'enregistrement de ce palier
    const existingUndo = sentUndoByLevel[level];
    if (existingUndo && existingUndo.length > 0) {
      revertGroupReminders(existingUndo);
      setSentUndoByLevel(prev => {
        const next = { ...prev };
        delete next[level];
        return next;
      });
    }

    setIncludedLoanIds(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId);
      else next.add(loanId);
      return next;
    });
  };

  const toggleLevelSent = (group: (typeof levelGroups)[number]) => {
    const existingUndo = sentUndoByLevel[group.level];
    if (existingUndo) {
      // Décocher annule l'enregistrement
      revertGroupReminders(existingUndo);
      setSentUndoByLevel(prev => {
        const next = { ...prev };
        delete next[group.level];
        return next;
      });
      return;
    }

    const activeEntries = group.entries.filter(e => includedLoanIds.has(e.loan.id));
    if (activeEntries.length === 0) return;

    const undoRecords = recordGroupReminders(
      activeEntries.map(e => ({
        empruntId: e.loan.id,
        level: group.level,
        subject: group.subject,
        body: group.body,
        daysLate: e.daysLate
      }))
    );

    setSentUndoByLevel(prev => ({
      ...prev,
      [group.level]: undoRecords
    }));

    if (onRecorded) {
      onRecorded(undoRecords.length);
    }
  };

  const handleMarkAllSent = () => {
    let totalNew = 0;
    const nextUndo: Partial<Record<MessageLevel, UndoRecord[]>> = { ...sentUndoByLevel };

    for (const group of levelGroups) {
      if (nextUndo[group.level]) continue;
      const activeEntries = group.entries.filter(e => includedLoanIds.has(e.loan.id));
      if (activeEntries.length === 0) continue;

      const undoRecords = recordGroupReminders(
        activeEntries.map(e => ({
          empruntId: e.loan.id,
          level: group.level,
          subject: group.subject,
          body: group.body,
          daysLate: e.daysLate
        }))
      );
      nextUndo[group.level] = undoRecords;
      totalNew += undoRecords.length;
    }

    setSentUndoByLevel(nextUndo);
    if (totalNew > 0 && onRecorded) {
      onRecorded(totalNew);
    }
  };

  const handleCopy = (level: MessageLevel, subject: string, body: string) => {
    navigator.clipboard.writeText(`${subject}\n\n${body}`);
    setCopiedLevel(level);
    setTimeout(() => setCopiedLevel(curr => (curr === level ? null : curr)), 2000);
  };

  const sendableGroups = levelGroups.filter(g =>
    g.entries.some(e => includedLoanIds.has(e.loan.id))
  );
  const allSendableChecked =
    sendableGroups.length > 0 && sendableGroups.every(g => Boolean(sentUndoByLevel[g.level]));

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-serif truncate">
                Envoi des rappels
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {levelGroups.length} niveau{levelGroups.length > 1 ? 'x' : ''} · {sourceLoans.length} emprunt{sourceLoans.length > 1 ? 's' : ''} sélectionné{sourceLoans.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleMarkAllSent}
              disabled={sendableGroups.length === 0 || allSendableChecked}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout marquer comme envoyé</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre mobile « Marquer tout comme envoyé » */}
        <div className="sm:hidden px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={handleMarkAllSent}
            disabled={sendableGroups.length === 0 || allSendableChecked}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tout marquer comme envoyé</span>
          </button>
        </div>

        {/* Corps : un bloc par niveau de retard */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs bg-slate-50/50">
          {levelGroups.map(group => {
            const activeEntries = group.entries.filter(e => includedLoanIds.has(e.loan.id));
            const activeEmails = activeEntries.map(e => e.email).filter(Boolean);
            const mailtoBatches = buildBccMailtoBatches(activeEmails, group.subject, group.body);
            const isLevelSent = Boolean(sentUndoByLevel[group.level]);
            const sampleBadge = getOverdueBadgeInfo(group.entries[0]?.daysLate || 1);

            return (
              <div
                key={group.level}
                className={`rounded-xl border bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs transition ${
                  isLevelSent ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                }`}
              >
                {/* En-tête du palier */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${sampleBadge.className}`}>
                      {group.label}
                    </span>
                    <span className="font-bold text-slate-900">
                      {activeEntries.length} destinataire{activeEntries.length > 1 ? 's' : ''}
                    </span>
                    {activeEntries.length !== group.entries.length && (
                      <span className="text-[11px] text-slate-400">
                        (sur {group.entries.length})
                      </span>
                    )}
                  </div>

                  {/* Case « Envoyé » du niveau */}
                  <label
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition select-none ${
                      activeEntries.length === 0
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : isLevelSent
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer'
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isLevelSent}
                      disabled={activeEntries.length === 0}
                      onChange={() => toggleLevelSent(group)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>Envoyé</span>
                  </label>
                </div>

                {/* Liste des étudiants du niveau (avec signalement « déjà envoyé le JJ/MM ») */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Noms des destinataires
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.entries.map(entry => {
                      const isIncluded = includedLoanIds.has(entry.loan.id);
                      return (
                        <label
                          key={entry.loan.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
                            isIncluded
                              ? 'border-slate-300 bg-slate-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => toggleStudentInLevel(group.level, entry.loan.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="font-medium">{entry.nomComplet}</span>
                          {entry.alreadySentDate && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              déjà envoyé le {formatShortDayMonth(entry.alreadySentDate)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Objet & Corps du message */}
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-100 rounded-lg text-slate-800">
                    <span className="font-bold text-slate-500">Objet : </span>
                    <span className="font-medium">{group.subject}</span>
                  </div>
                  <textarea
                    readOnly
                    value={group.body}
                    rows={5}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs leading-relaxed focus:outline-hidden font-sans"
                  />
                </div>

                {/* Boutons d'action du palier */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {mailtoBatches.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Aucun destinataire sélectionné pour ce palier</span>
                      </span>
                    ) : mailtoBatches.length === 1 ? (
                      <a
                        href={mailtoBatches[0].href}
                        className="min-h-[38px] px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Ouvrir ma messagerie</span>
                      </a>
                    ) : (
                      mailtoBatches.map((batch, idx) => (
                        <a
                          key={idx}
                          href={batch.href}
                          className="min-h-[38px] px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>
                            Ouvrir ma messagerie (lot {idx + 1}/{mailtoBatches.length} · {batch.emails.length})
                          </span>
                        </a>
                      ))
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopy(group.level, group.subject, group.body)}
                      className="min-h-[38px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {copiedLevel === group.level ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedLevel === group.level ? 'Copié' : 'Copier le message'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied de fenêtre */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Rien n'est enregistré tant que la case « Envoyé » n'est pas cochée.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
