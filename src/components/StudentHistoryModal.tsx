import React, { useMemo } from 'react';
import { X, History, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { ConnectedStudent } from '../services/authService';

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: ConnectedStudent;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  isOpen,
  onClose,
  currentStudent
}) => {
  const { 
    emprunts, 
    ouvrages, 
    exemplaires, 
    adherents, 
    getJoursDeRetard,
    currentDate 
  } = useLibrary();

  // Résoudre l'adhérent correspondant (par email ou par id)
  const matchingAdherent = useMemo(() => {
    const cleanEmail = currentStudent.email?.trim().toLowerCase();
    return adherents.find(a => 
      (cleanEmail && a.emailAcademique.trim().toLowerCase() === cleanEmail) ||
      a.id === currentStudent.id
    );
  }, [adherents, currentStudent]);

  // Tous les emprunts de cet étudiant (non annulés), triés du plus récent au plus ancien
  const studentLoans = useMemo(() => {
    if (!matchingAdherent) return [];

    return emprunts
      .filter(e => e.adherentId === matchingAdherent.id && !e.annule)
      .map(loan => {
        const ex = exemplaires.find(e => e.id === loan.exemplaireId);
        const ow = ouvrages.find(o => o.id === loan.ouvrageId) || 
                   (ex ? ouvrages.find(o => o.id === ex.ouvrageId) : undefined);

        const isReturned = loan.statut === 'rendu';
        const isLate = !isReturned && loan.dateRetourPrevue < currentDate;
        const daysLate = isLate ? getJoursDeRetard(loan.dateRetourPrevue) : 0;

        return {
          id: loan.id,
          titre: ow?.titre || 'Ouvrage sans titre',
          cote: ow?.cote,
          exemplaireCode: ex?.codeQR,
          dateEmprunt: loan.dateEmprunt,
          dateRetourPrevue: loan.dateRetourPrevue,
          dateRetourEffective: loan.dateRetourEffective,
          isReturned,
          isLate,
          daysLate
        };
      })
      .sort((a, b) => b.dateEmprunt.localeCompare(a.dateEmprunt));
  }, [emprunts, matchingAdherent, exemplaires, ouvrages, currentDate, getJoursDeRetard]);

  // Fermeture par touche Échap
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-[#0F2742] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold font-serif">
                Mon historique
              </h2>
              <p className="text-xs text-slate-300">
                Emprunts passés et en cours · {currentStudent.prenom}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          {studentLoans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Aucun emprunt enregistré</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Vos emprunts physiques réalisés au guichet de la bibliothèque apparaîtront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/80">
                    <th className="py-2.5 px-3">Titre du livre</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Date emprunt</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Statut / Date retour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition">
                      
                      {/* Titre du livre */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 line-clamp-2">
                          {loan.titre}
                        </div>
                        {loan.cote && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Cote : {loan.cote} {loan.exemplaireCode ? `· Ex. ${loan.exemplaireCode}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Date emprunt */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-600">
                        {new Date(loan.dateEmprunt).toLocaleDateString('fr-FR')}
                      </td>

                      {/* Date retour ou retard actuel J+N */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {loan.isReturned ? (
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>
                              Rendu le{' '}
                              <strong className="font-mono">
                                {loan.dateRetourEffective 
                                  ? new Date(loan.dateRetourEffective).toLocaleDateString('fr-FR')
                                  : '—'}
                              </strong>
                            </span>
                          </div>
                        ) : loan.isLate ? (
                          <div className="flex items-center gap-1.5">
                            {/* Pastille J+N en rouge vif */}
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-600 border border-red-300">
                              J+{loan.daysLate} retard
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                              (échéance : {new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              En cours · retour prévu le{' '}
                              <strong className="font-mono">
                                {new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')}
                              </strong>
                            </span>
                          </div>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            {studentLoans.length} document{studentLoans.length > 1 ? 's' : ''} au total
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
