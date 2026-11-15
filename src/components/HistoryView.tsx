import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  Clock
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Emprunt } from '../types';
import { formatShortLoanNumber } from '../utils/overdueUtils';
import { LoanDetailModal } from './LoanDetailModal';

export const HistoryView: React.FC = () => {
  const { emprunts, getOuvrageById, getExemplaireById, getAdherentById, exportDatabaseJSON } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [detailLoan, setDetailLoan] = useState<Emprunt | null>(null);

  // 1. Activité récente (liste chronologique, la plus récente en premier)
  const recentActivity = useMemo(() => {
    const events: Array<{
      id: string;
      type: 'emprunt' | 'retour';
      rawDate: string;
      ouvrageTitre: string;
      adherentNom: string;
      adherentNumero: string;
      label: string;
    }> = [];

    for (const loan of emprunts) {
      if (loan.annule) continue;
      const ow = getOuvrageById(loan.ouvrageId);
      const adh = getAdherentById(loan.adherentId);
      const nomComplet = adh ? `${adh.prenom} ${adh.nom}` : 'Étudiant';
      const numEtudiant = adh?.numeroEtudiant || '';
      const titre = ow?.titre || 'Ouvrage inconnu';

      if (loan.statut === 'rendu' && loan.dateRetourEffective) {
        events.push({
          id: `${loan.id}-retour`,
          type: 'retour',
          rawDate: loan.dateRetourEffective,
          ouvrageTitre: titre,
          adherentNom: nomComplet,
          adherentNumero: numEtudiant,
          label: 'Retour enregistré'
        });
      }

      if (loan.dateEmprunt) {
        events.push({
          id: `${loan.id}-emprunt`,
          type: 'emprunt',
          rawDate: loan.dateEmprunt,
          ouvrageTitre: titre,
          adherentNom: nomComplet,
          adherentNumero: numEtudiant,
          label: loan.statut === 'rendu'
            ? 'Emprunt initial'
            : `Emprunt en cours (échéance : ${new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')})`
        });
      }
    }

    return events.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [emprunts, getOuvrageById, getAdherentById]);

  // 2. Retours filtrés pour la table de traçabilité
  const returnedLoans = useMemo(() => {
    return emprunts
      .filter(l => {
        if (l.statut !== 'rendu' || l.annule) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const ow = getOuvrageById(l.ouvrageId);
          const ex = getExemplaireById(l.exemplaireId);
          const adh = getAdherentById(l.adherentId);
          const shortNum = formatShortLoanNumber(l.loanNumber).toLowerCase();

          const matchOuvrage =
            ow &&
            (ow.titre.toLowerCase().includes(q) ||
              ow.auteur.toLowerCase().includes(q) ||
              ow.cote.toLowerCase().includes(q));

          const matchAdherent =
            adh &&
            (adh.nom.toLowerCase().includes(q) ||
              adh.prenom.toLowerCase().includes(q) ||
              adh.numeroEtudiant.toLowerCase().includes(q));

          const matchCopy = ex && ex.codeQR.toLowerCase().includes(q);

          if (
            !matchOuvrage &&
            !matchAdherent &&
            !matchCopy &&
            !l.loanNumber.toLowerCase().includes(q) &&
            !shortNum.includes(q)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (b.dateRetourEffective || '').localeCompare(a.dateRetourEffective || ''));
  }, [emprunts, searchQuery, getOuvrageById, getExemplaireById, getAdherentById]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['N° Prêt', 'Ouvrage', 'Cote', 'Code QR Exemplaire', 'Tiroir', 'Rangée', 'Étudiant', 'N° Étudiant', 'Date Emprunt', 'Échéance', 'Date Retour Effective', 'Remarques'];
    const rows = returnedLoans.map(l => {
      const ow = getOuvrageById(l.ouvrageId);
      const ex = getExemplaireById(l.exemplaireId);
      const adh = getAdherentById(l.adherentId);
      return [
        l.loanNumber,
        `"${ow?.titre || ''}"`,
        ow?.cote || '',
        ex?.codeQR || '',
        ex?.emplacement.tiroir || '',
        ex?.emplacement.rangee || '',
        `"${adh?.prenom} ${adh?.nom}"`,
        adh?.numeroEtudiant || '',
        l.dateEmprunt,
        l.dateRetourPrevue,
        l.dateRetourEffective || '',
        `"${l.notes || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registre-retours-universite-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. ACTIVITÉ RÉCENTE EN TÊTE DE PAGE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">
              Activité récente
            </h2>
          </div>
          {recentActivity.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              {recentActivity.length} mouvement{recentActivity.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aucun mouvement enregistré
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: item.type === 'retour' ? '#15803D' : '#1E3A5F'
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {item.ouvrageTitre}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'retour'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {item.type === 'retour' ? 'Retour' : 'Emprunt'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {item.adherentNom} {item.adherentNumero ? `(${item.adherentNumero})` : ''} · {item.label}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                  {new Date(item.rawDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. REGISTRE DES RESTITUTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Journal des Restitutions & Traçabilité
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre officiel des retours d'exemplaires.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exporter en CSV</span>
          </button>
          <button
            onClick={exportDatabaseJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Sauvegarde Globale</span>
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par ouvrage, étudiant, N° de prêt..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Tableau simplifié à 6 colonnes */}
      {returnedLoans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Aucune restitution enregistrée</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            Aucun retour d'exemplaire ne correspond au filtre ou à la recherche.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3.5 bg-slate-100">Date de retour</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">N° de prêt</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Ouvrage</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Étudiant</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Emplacement</th>
                  <th className="py-2.5 px-3.5 bg-slate-100">Remarques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnedLoans.map(loan => {
                  const ow = getOuvrageById(loan.ouvrageId);
                  const ex = getExemplaireById(loan.exemplaireId);
                  const adh = getAdherentById(loan.adherentId);

                  return (
                    <tr
                      key={loan.id}
                      onClick={() => setDetailLoan(loan)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap font-mono">
                        {loan.dateRetourEffective ? new Date(loan.dateRetourEffective).toLocaleDateString('fr-FR') : '-'}
                      </td>

                      <td className="py-3 px-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {formatShortLoanNumber(loan.loanNumber)}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800 leading-snug">
                          {ow?.titre || 'Ouvrage inconnu'}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-800">
                        <strong className="font-bold">{adh?.nom.toUpperCase()}</strong> {adh?.prenom}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600">
                        {ex ? `${ex.emplacement.tiroir}, ${ex.emplacement.rangee}` : '—'}
                      </td>

                      <td className="py-3 px-3.5 text-slate-500 italic text-[11px] max-w-xs truncate">
                        {loan.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pop-up détail en lecture seule */}
      <LoanDetailModal loan={detailLoan} onClose={() => setDetailLoan(null)} />
    </div>
  );
};
