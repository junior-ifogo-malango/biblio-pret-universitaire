import React, { useState } from 'react';
import { 
  AlertTriangle, 
  PackageX, 
  Clock, 
  Mail, 
  ExternalLink, 
  FileText, 
  RefreshCw, 
  ShieldAlert, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  UserX,
  Send
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Emprunt } from '../types';
import { ReminderModal } from './ReminderModal';

export const AlertsView: React.FC = () => {
  const { 
    emprunts, 
    ouvrages, 
    exemplaires, 
    adherents, 
    demandes, 
    currentDate, 
    getOuvrageById, 
    getExemplaireById, 
    getAdherentById, 
    isEmpruntEnRetard, 
    getJoursDeRetard,
    isEmpruntAContacter,
    runDailyChecks,
    setIsScanReturnOpen,
    setActiveManagerTab
  } = useLibrary();

  const [activeTab, setActiveTab] = useState<'all' | 'retards' | 'ruptures'>('all');
  const [selectedLoanForNotice, setSelectedLoanForNotice] = useState<Emprunt | null>(null);

  // 1. Emprunts en retard
  const overdueLoans = emprunts
    .filter(e => isEmpruntEnRetard(e))
    .sort((a, b) => {
      // Prioritize "à contacter" first, then by days overdue descending
      const aContacterA = isEmpruntAContacter(a) ? 1 : 0;
      const aContacterB = isEmpruntAContacter(b) ? 1 : 0;
      if (aContacterA !== aContacterB) return aContacterB - aContacterA;
      return getJoursDeRetard(b.dateRetourPrevue) - getJoursDeRetard(a.dateRetourPrevue);
    });

  const aContacterLoans = overdueLoans.filter(l => isEmpruntAContacter(l));

  // 2. Ruptures de stock : ouvrage empruntable sans exemplaire disponible et avec au moins une demande en attente
  // Si tous les exemplaires d'un ouvrage sont détruits ou perdus alors que sa file n'est pas vide, l'ouvrage apparaît en rupture dans les alertes.
  const stockShortages = ouvrages
    .filter(ow => {
      if (!ow.empruntable) return false;
      const allCopies = exemplaires.filter(e => e.ouvrageId === ow.id);
      const availableCopies = allCopies.filter(e => e.statut === 'DISPONIBLE');
      if (availableCopies.length > 0) return false; // Not out of stock
      // Must have at least one pending waiting queue request
      const pendingDemandes = demandes.filter(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'));
      return pendingDemandes.length > 0;
    })
    .map(ow => {
      const allCopies = exemplaires.filter(e => e.ouvrageId === ow.id);
      const activeCopies = allCopies.filter(e => e.statut !== 'DETRUIT');
      const borrowedCopies = allCopies.filter(e => e.statut === 'EMPRUNTE');
      const reservedCopies = allCopies.filter(e => e.statut === 'RESERVE');
      const repairingCopies = allCopies.filter(e => e.statut === 'EN_REPARATION');
      const lostCopies = allCopies.filter(e => e.statut === 'PERDU');
      const destroyedCopies = allCopies.filter(e => e.statut === 'DETRUIT');
      const pendingDemandes = demandes.filter(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'));
      const allLostOrDestroyed = allCopies.length > 0 && allCopies.every(e => e.statut === 'DETRUIT' || e.statut === 'PERDU');

      return {
        ouvrage: ow,
        totalCopies: allCopies.length,
        activeCopiesCount: activeCopies.length,
        borrowedCopies: borrowedCopies.length,
        reservedCopies: reservedCopies.length,
        repairingCopies: repairingCopies.length,
        lostCopies: lostCopies.length,
        destroyedCopies: destroyedCopies.length,
        allLostOrDestroyed,
        pendingDemandesCount: pendingDemandes.length
      };
    })
    .sort((a, b) => b.pendingDemandesCount - a.pendingDemandesCount);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-slate-900">
              Centre des Alertes de Gestion
            </h1>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Surveillance active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Suivi des emprunts en retard (avec rappels et statut « à contacter ») et alertes de rupture de stock avec étudiants en attente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runDailyChecks()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            title="Lancer manuellement le contrôle automatique quotidien (rappels de retards et réservations expirées)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Contrôle automatique du jour</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Overdue */}
        <div 
          onClick={() => setActiveTab('retards')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Emprunts en Retard</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              overdueLoans.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{overdueLoans.length}</span>
            <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              non restitués
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Blocage automatique des nouveaux emprunts actif
          </p>
        </div>

        {/* À contacter */}
        <div 
          onClick={() => setActiveTab('retards')}
          className="bg-white p-5 rounded-2xl border border-amber-300/80 bg-amber-50/20 shadow-xs hover:border-amber-400 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">Cas « À Contacter »</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5 text-amber-700" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-900">{aContacterLoans.length}</span>
            <span className="text-xs font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
              2 rappels envoyés
            </span>
          </div>
          <p className="text-xs text-amber-800/80 mt-2">
            Action extérieure du gestionnaire requise (avis manuel disponible)
          </p>
        </div>

        {/* Ruptures de Stock */}
        <div 
          onClick={() => setActiveTab('ruptures')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Ruptures de Stock</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <PackageX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{stockShortages.length}</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              avec file d'attente
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Ouvrages sans aucun exemplaire disponible en rayon
          </p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Toutes les alertes</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white text-[10px]">
            {overdueLoans.length + stockShortages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('retards')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'retards'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Emprunts en retard</span>
          {overdueLoans.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-900 text-white text-[10px]">
              {overdueLoans.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ruptures')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'ruptures'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PackageX className="w-3.5 h-3.5" />
          <span>Ruptures de stock</span>
          {stockShortages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-900 text-white text-[10px]">
              {stockShortages.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Section 1: Emprunts en Retard */}
      {(activeTab === 'all' || activeTab === 'retards') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Liste 1 : Emprunts en retard ({overdueLoans.length})
              </h2>
              {aContacterLoans.length > 0 && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {aContacterLoans.length} à contacter
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Rappels automatiques à J+2 et J+4 • Aucun frais financier (blocage seul)
            </p>
          </div>

          {overdueLoans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Aucun emprunt en retard</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tous les exemplaires prêtés sont en cours dans les délais ou ont été restitués.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueLoans.map(loan => {
                const ow = getOuvrageById(loan.ouvrageId);
                const ex = getExemplaireById(loan.exemplaireId);
                const adh = getAdherentById(loan.adherentId);
                const daysLate = getJoursDeRetard(loan.dateRetourPrevue);
                const aContacter = isEmpruntAContacter(loan);

                return (
                  <div 
                    key={loan.id}
                    className={`rounded-2xl p-5 border transition ${
                      aContacter
                        ? 'bg-amber-50/70 border-amber-300 shadow-md ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200/80 shadow-xs hover:border-rose-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-2 min-w-0">
                        {/* Title and Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {ow?.titre}
                          </span>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-bold">
                            {ex?.codeQR}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            +{daysLate} j de retard
                          </span>
                          
                          {/* À contacter badge */}
                          {aContacter ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-slate-950" />
                              À CONTACTER
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {loan.nbRappels === 0 
                                ? 'En attente de rappel J+2' 
                                : `${loan.nbRappels} rappel envoyé`}
                            </span>
                          )}
                        </div>

                        {/* Student Details - Prominently highlighted if "à contacter" */}
                        <div className={`p-3 rounded-xl text-xs space-y-1 ${
                          aContacter 
                            ? 'bg-amber-100/80 border border-amber-300 text-amber-950 font-medium' 
                            : 'bg-slate-50 text-slate-600'
                        }`}>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div>
                              <span className="font-bold">Étudiant : </span>
                              <strong className={aContacter ? 'text-amber-950 font-extrabold underline' : 'text-slate-800'}>
                                {adh?.prenom} {adh?.nom}
                              </strong>
                            </div>
                            <div>
                              <span className="font-bold">N° Carte : </span>
                              <span className="font-mono">{adh?.numeroEtudiant}</span>
                            </div>
                            <div>
                              <span className="font-bold">E-mail académique : </span>
                              <a 
                                href={`mailto:${adh?.emailAcademique}`} 
                                className={`font-mono font-bold hover:underline ${aContacter ? 'text-amber-900 underline' : 'text-blue-600'}`}
                              >
                                {adh?.emailAcademique}
                              </a>
                            </div>
                          </div>
                          {aContacter && (
                            <div className="text-[11px] text-amber-900 font-bold pt-1 border-t border-amber-200 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              <span>2 rappels automatiques déjà émis sans restitution. Le gestionnaire doit contacter l'étudiant directement en dehors de l'application.</span>
                            </div>
                          )}
                        </div>

                        {/* Dates and Loan Number */}
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>N° de prêt : <strong className="font-mono text-slate-700">{loan.loanNumber}</strong></span>
                          <span>•</span>
                          <span>Emprunté le : {new Date(loan.dateEmprunt).toLocaleDateString('fr-FR')}</span>
                          <span>•</span>
                          <span className="font-bold text-rose-700">
                            Échéance prévue : {new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')}
                          </span>
                          {loan.dateDernierRappel && (
                            <>
                              <span>•</span>
                              <span>Dernier rappel automatique le : {new Date(loan.dateDernierRappel).toLocaleDateString('fr-FR')}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Emplacement : Tiroir {ex?.emplacement.tiroir}, Rangée {ex?.emplacement.rangee}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        {/* Only offer reminder notice generator for loans marked "à contacter" */}
                        {aContacter ? (
                          <button
                            onClick={() => setSelectedLoanForNotice(loan)}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                            title="Aide manuelle : générer et copier l'avis de relance pour cet emprunt à contacter"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Générer avis de relance</span>
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic px-2">
                            Rappels automatiques gérés par le système
                          </div>
                        )}

                        <button
                          onClick={() => setIsScanReturnOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Scanner retour</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content Section 2: Ruptures de Stock */}
      {(activeTab === 'all' || activeTab === 'ruptures') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
                <PackageX className="w-4 h-4 text-purple-600" />
                Liste 2 : Ruptures de stock avec file d'attente ({stockShortages.length})
              </h2>
              <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                0 exemplaire disponible
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ouvrages empruntables dont tous les exemplaires sont sortis/réservés avec demandes actives
            </p>
          </div>

          {stockShortages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <PackageX className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Aucune rupture critique</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Tous les titres demandés disposent d'au moins un exemplaire en rayon ou n'ont aucune demande en attente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stockShortages.map(item => {
                const ow = item.ouvrage;
                const bookQueue = demandes
                  .filter(d => d.ouvrageId === ow.id && (d.statut === 'EN_ATTENTE' || d.statut === 'NOTIFIEE'))
                  .sort((a, b) => a.dateInscription.localeCompare(b.dateInscription));

                return (
                  <div 
                    key={ow.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-purple-300 transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {ow.categorie}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Cote : {ow.cote}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">
                          {ow.titre}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {ow.auteur} ({ow.anneeEdition}) • ISBN: {ow.isbn}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                          0 dispo
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          sur {item.totalCopies} ex. total
                        </div>
                      </div>
                    </div>

                    {/* Critical badge if all copies are lost or destroyed */}
                    {item.allLostOrDestroyed && (
                      <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Tous les exemplaires de cet ouvrage sont perdus ou détruits alors que la file compte {item.pendingDemandesCount} demande(s) en attente.</span>
                      </div>
                    )}

                    {/* Breakdown of copies */}
                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-slate-400 text-[9px] uppercase font-bold">Empruntés</div>
                        <div className="font-bold text-amber-700 mt-0.5">{item.borrowedCopies}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[9px] uppercase font-bold">Réservés 24h</div>
                        <div className="font-bold text-blue-700 mt-0.5">{item.reservedCopies}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[9px] uppercase font-bold">En répa.</div>
                        <div className="font-bold text-purple-700 mt-0.5">{item.repairingCopies}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[9px] uppercase font-bold">Perdus</div>
                        <div className="font-bold text-orange-700 mt-0.5">{item.lostCopies}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[9px] uppercase font-bold">Détruits</div>
                        <div className="font-bold text-rose-700 mt-0.5">{item.destroyedCopies}</div>
                      </div>
                    </div>

                    {/* Waiting Queue details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          File d'attente active ({bookQueue.length} étudiants)
                        </span>
                        <button
                          onClick={() => setActiveManagerTab('queue')}
                          className="text-[11px] text-purple-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          Voir la file
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {bookQueue.map((demande, idx) => {
                          const adh = getAdherentById(demande.adherentId);
                          return (
                            <div 
                              key={demande.id} 
                              className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    {adh?.prenom} {adh?.nom}
                                  </span>
                                  <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                                    ({adh?.numeroEtudiant})
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                {demande.statut === 'NOTIFIEE' ? 'Notifié (24h)' : 'En attente'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Manual Notice Generator Modal (only for loans marked "à contacter") */}
      {selectedLoanForNotice && (
        <ReminderModal 
          emprunt={selectedLoanForNotice} 
          onClose={() => setSelectedLoanForNotice(null)} 
        />
      )}
    </div>
  );
};
