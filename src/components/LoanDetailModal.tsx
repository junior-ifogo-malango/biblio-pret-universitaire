import React, { useEffect } from 'react';
import { X, BookOpen, User, Mail, MapPin, Hash, Calendar, FileText } from 'lucide-react';
import { Emprunt } from '../types';
import { useLibrary } from '../context/LibraryContext';
import { formatShortLoanNumber, getOverdueBadgeInfo } from '../utils/overdueUtils';

interface LoanDetailModalProps {
  loan: Emprunt | null;
  onClose: () => void;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({ loan, onClose }) => {
  const {
    getOuvrageById,
    getExemplaireById,
    getAdherentById,
    isEmpruntEnRetard,
    getJoursDeRetard
  } = useLibrary();

  useEffect(() => {
    if (!loan) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loan, onClose]);

  if (!loan) return null;

  const ow = getOuvrageById(loan.ouvrageId);
  const ex = getExemplaireById(loan.exemplaireId);
  const adh = getAdherentById(loan.adherentId);
  const isLate = isEmpruntEnRetard(loan);
  const daysLate = isLate ? getJoursDeRetard(loan.dateRetourPrevue) : 0;
  const badge = isLate ? getOverdueBadgeInfo(daysLate) : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-serif">
                Détail du prêt {formatShortLoanNumber(loan.loanNumber)}
              </h2>
              {badge && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${badge.className}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Réf. {loan.loanNumber}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps en lecture seule */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Ouvrage & Exemplaire */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Ouvrage
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {ow?.titre || 'Ouvrage inconnu'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block">Exemplaire</span>
                <span className="font-mono font-bold text-slate-900">
                  {ex?.codeQR || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-400" />
                  Cote
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {ow?.cote || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Emplacement
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {ex ? `${ex.emplacement.tiroir}, ${ex.emplacement.rangee}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Étudiant */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Étudiant
                </div>
                <div className="text-sm text-slate-900 mt-0.5">
                  <strong className="font-bold">{adh?.nom.toUpperCase()}</strong> {adh?.prenom}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block">Numéro d'étudiant</span>
                <span className="font-mono font-semibold text-slate-800">
                  {adh?.numeroEtudiant || '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  E-mail académique
                </span>
                <span className="font-mono text-slate-800 break-all">
                  {adh?.emailAcademique || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates & Remarques */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Date de prêt
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {new Date(loan.dateEmprunt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">
                  {loan.statut === 'rendu' ? 'Date de retour effective' : 'Échéance prévue'}
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  {loan.statut === 'rendu' && loan.dateRetourEffective
                    ? new Date(loan.dateRetourEffective).toLocaleDateString('fr-FR')
                    : new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {loan.notes && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Remarques
                </span>
                <p className="text-slate-700 mt-0.5">{loan.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
