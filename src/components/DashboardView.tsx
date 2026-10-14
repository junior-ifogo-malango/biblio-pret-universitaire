import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Emprunt } from '../types';
import { ReminderModal } from './ReminderModal';

export const DashboardView: React.FC = () => {
  const { 
    emprunts, 
    ouvrages, 
    exemplaires, 
    adherents,
    demandes,
    stats, 
    setActiveManagerTab, 
    getOuvrageById, 
    getAdherentById, 
    getJoursDeRetard,
    isEmpruntEnRetard,
    isEmpruntAContacter
  } = useLibrary();

  const [selectedLoanForNotice, setSelectedLoanForNotice] = useState<Emprunt | null>(null);

  // 1. Éléments à traiter, triés du plus urgent au moins urgent :
  // - Emprunts « à contacter » (retards critiques J+4 ou 2 rappels)
  // - Autres retards en cours
  // - Ruptures de stock avec file d'attente active

  const aContacterLoans = emprunts
    .filter(l => l.statut === 'en_cours' && isEmpruntEnRetard(l) && isEmpruntAContacter(l))
    .sort((a, b) => getJoursDeRetard(b.dateRetourPrevue) - getJoursDeRetard(a.dateRetourPrevue));

  const standardOverdueLoans = emprunts
    .filter(l => l.statut === 'en_cours' && isEmpruntEnRetard(l) && !isEmpruntAContacter(l))
    .sort((a, b) => getJoursDeRetard(b.dateRetourPrevue) - getJoursDeRetard(a.dateRetourPrevue));

  const stockShortages = ouvrages
    .filter(ow => {
      if (!ow.empruntable) return false;
      const allCopies = exemplaires.filter(e => e.ouvrageId === ow.id);
      const availableCopies = allCopies.filter(e => e.statut === 'DISPONIBLE');
      if (availableCopies.length > 0) return false;
      const pendingDemandes = demandes.filter(
        d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE')
      );
      return pendingDemandes.length > 0;
    })
    .map(ow => {
      const pendingDemandes = demandes.filter(
        d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE')
      );
      return {
        ouvrage: ow,
        pendingCount: pendingDemandes.length
      };
    })
    .sort((a, b) => b.pendingCount - a.pendingCount);

  // Liste unifiée « À traiter »
  interface ItemToProcess {
    id: string;
    titre: string;
    etudiant: string;
    retard: string;
    isLate: boolean;
    actionLabel: string;
    onAction: () => void;
  }

  const itemsToProcess: ItemToProcess[] = [
    // Emprunts « à contacter »
    ...aContacterLoans.map(loan => {
      const ow = getOuvrageById(loan.ouvrageId);
      const adh = getAdherentById(loan.adherentId);
      const days = getJoursDeRetard(loan.dateRetourPrevue);
      return {
        id: `contact-${loan.id}`,
        titre: ow?.titre || 'Ouvrage inconnu',
        etudiant: adh ? `${adh.prenom} ${adh.nom}` : 'Étudiant inconnu',
        retard: `+${days} j de retard`,
        isLate: true,
        actionLabel: 'Contacter',
        onAction: () => setSelectedLoanForNotice(loan)
      };
    }),

    // Autres retards
    ...standardOverdueLoans.map(loan => {
      const ow = getOuvrageById(loan.ouvrageId);
      const adh = getAdherentById(loan.adherentId);
      const days = getJoursDeRetard(loan.dateRetourPrevue);
      return {
        id: `retard-${loan.id}`,
        titre: ow?.titre || 'Ouvrage inconnu',
        etudiant: adh ? `${adh.prenom} ${adh.nom}` : 'Étudiant inconnu',
        retard: `+${days} j de retard`,
        isLate: true,
        actionLabel: 'Rappeler',
        onAction: () => setSelectedLoanForNotice(loan)
      };
    }),

    // Ruptures de stock
    ...stockShortages.map(item => ({
      id: `stock-${item.ouvrage.id}`,
      titre: item.ouvrage.titre,
      etudiant: `${item.pendingCount} étudiant${item.pendingCount > 1 ? 's' : ''} en attente`,
      retard: 'Rupture de stock',
      isLate: false,
      actionLabel: 'Voir la file',
      onAction: () => setActiveManagerTab('queue')
    }))
  ];

  // Identifiants d'emprunts déjà affichés dans « À traiter » pour éviter les doublons
  const treatedLoanIds = new Set([
    ...aContacterLoans.map(l => l.id),
    ...standardOverdueLoans.map(l => l.id)
  ]);

  // 2. Activité récente : 5 derniers mouvements seulement (sans répéter les retards déjà affichés dans « À traiter »)
  const recentMovements = emprunts
    .filter(l => !treatedLoanIds.has(l.id))
    .slice(0, 5)
    .map(loan => {
      const ow = getOuvrageById(loan.ouvrageId);
      const adh = getAdherentById(loan.adherentId);
      const isReturned = loan.statut === 'rendu';

      let statutText = '';
      if (isReturned) {
        statutText = loan.dateRetourEffective 
          ? `Restitué le ${new Date(loan.dateRetourEffective).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
          : 'Restitué';
      } else {
        statutText = `Échéance le ${new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
      }

      return {
        id: loan.id,
        titre: ow?.titre || 'Ouvrage inconnu',
        etudiant: adh ? `${adh.prenom} ${adh.nom}` : 'Étudiant inconnu',
        statut: statutText,
        isReturned
      };
    });

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* 1. Rangée de 4 indicateurs compacts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Indicateur 1 : Emprunts en cours */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('loans')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
        >
          <div className="text-3xl font-semibold text-slate-900">
            {stats.empruntsEnCours}
          </div>
          <div className="text-sm text-slate-600 mt-1 font-normal">
            Emprunts en cours
          </div>
        </button>

        {/* Indicateur 2 : Exemplaires disponibles */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('catalog')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
        >
          <div className="text-3xl font-semibold text-slate-900">
            {stats.disponiblesEnRayon}
          </div>
          <div className="text-sm text-slate-600 mt-1 font-normal">
            Exemplaires disponibles
          </div>
        </button>

        {/* Indicateur 3 : Retards à traiter */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('alerts')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
        >
          <div className={`text-3xl font-semibold ${stats.empruntsEnRetard > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.empruntsEnRetard}
          </div>
          <div className="text-sm text-slate-600 mt-1 font-normal">
            Retards à traiter
          </div>
        </button>

        {/* Indicateur 4 : Demandes en attente */}
        <button
          type="button"
          onClick={() => setActiveManagerTab('queue')}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition text-left cursor-pointer"
        >
          <div className="text-3xl font-semibold text-slate-900">
            {stats.demandesEnAttente}
          </div>
          <div className="text-sm text-slate-600 mt-1 font-normal">
            Demandes en attente
          </div>
        </button>

      </div>

      {/* 2. Bloc « À traiter » */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            À traiter
          </h2>
          {itemsToProcess.length > 0 && (
            <span className="text-xs text-slate-500 font-normal">
              {itemsToProcess.length} élément{itemsToProcess.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {itemsToProcess.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Rien à traiter aujourd'hui
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {itemsToProcess.map(item => (
              <div 
                key={item.id} 
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                  <span className="font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                    {item.titre}
                  </span>
                  <span className="text-slate-600 text-xs sm:text-sm truncate">
                    {item.etudiant}
                  </span>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    item.isLate ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    {item.retard}
                  </span>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Bloc « Activité récente » */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Activité récente
          </h2>
          <button
            type="button"
            onClick={() => setActiveManagerTab('history')}
            className="text-xs text-slate-600 hover:text-slate-900 hover:underline font-medium"
          >
            Voir tout l'historique
          </button>
        </div>

        {recentMovements.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-sm">
            Aucun mouvement récent
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentMovements.map(m => (
              <div 
                key={m.id} 
                className="py-3 flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">
                    {m.isReturned ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </span>
                  <span className="font-medium text-slate-900 truncate">
                    {m.titre}
                  </span>
                  <span className="text-slate-600 text-xs sm:text-sm truncate hidden sm:inline">
                    {m.etudiant}
                  </span>
                </div>

                <div className="text-xs text-slate-500 shrink-0">
                  {m.statut}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'avis de relance si action déclenchée */}
      {selectedLoanForNotice && (
        <ReminderModal 
          emprunt={selectedLoanForNotice} 
          onClose={() => setSelectedLoanForNotice(null)} 
        />
      )}

    </div>
  );
};
