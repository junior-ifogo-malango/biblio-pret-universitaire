import React, { useState } from 'react';
import {
  RotateCcw,
  Download,
  RefreshCw,
  Globe,
  CheckCircle2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

export const SettingsView: React.FC = () => {
  const {
    exportDatabaseJSON,
    resetToDefaultData,
    syncLocalCovers,
    allowedAcademicDomain,
    setAllowedAcademicDomain
  } = useLibrary();

  const [domainInput, setDomainInput] = useState(allowedAcademicDomain);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSyncingCovers, setIsSyncingCovers] = useState(false);

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setAllowedAcademicDomain(domainInput.trim());
    setFeedback(`Domaine autorisé mis à jour : ${domainInput.trim()}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSyncCovers = async () => {
    setIsSyncingCovers(true);
    try {
      const res = await syncLocalCovers();
      setFeedback(`Couvertures mises à jour : ${res.count} ouvrage(s) synchronisé(s).`);
    } catch (err: any) {
      setFeedback("Erreur lors de la mise à jour des couvertures : " + (err?.message || "inconnue"));
    } finally {
      setIsSyncingCovers(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleResetData = () => {
    if (confirm('Réinitialiser toutes les données aux valeurs par défaut ? Les modifications locales seront remplacées.')) {
      resetToDefaultData();
      setFeedback('Données réinitialisées aux valeurs par défaut.');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-6 pb-12 font-sans">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Réglages
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Paramètres d'accès et gestion des données.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Authentification Google & Domaines autorisés */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Authentification Google et domaines autorisés
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Définit les domaines de messagerie autorisés pour l'accès à l'espace étudiant.
          </p>
        </div>

        <form onSubmit={handleSaveDomain} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Domaine(s) autorisé(s) (<span className="font-mono text-[11px]">* pour tous les comptes</span>)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="@gmail.com, @usmba.ac.ma"
                className="w-full sm:w-64 px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Enregistrer
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-[11px] text-slate-400">Raccourcis :</span>
              <button
                type="button"
                onClick={() => {
                  const domains = '@gmail.com, @usmba.ac.ma';
                  setDomainInput(domains);
                  setAllowedAcademicDomain(domains);
                  setFeedback('Domaines activés : @gmail.com et @usmba.ac.ma');
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition cursor-pointer ${
                  allowedAcademicDomain.includes('@gmail.com') &&
                  allowedAcademicDomain.includes('@usmba.ac.ma')
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Gmail + USMBA
              </button>
              <button
                type="button"
                onClick={() => {
                  setDomainInput('*');
                  setAllowedAcademicDomain('*');
                  setFeedback('Tous les comptes Google sont autorisés (*)');
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition cursor-pointer ${
                  allowedAcademicDomain === '*'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tous les comptes (*)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDomainInput('@usmba.ac.ma');
                  setAllowedAcademicDomain('@usmba.ac.ma');
                  setFeedback('Domaine activé : @usmba.ac.ma');
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition cursor-pointer ${
                  allowedAcademicDomain === '@usmba.ac.ma'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                @usmba.ac.ma
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Configuration active : <strong className="font-mono text-slate-700">{allowedAcademicDomain === '*' ? 'Tous les comptes Google (*)' : allowedAcademicDomain}</strong>
            </p>
          </div>
        </form>
      </div>

      {/* Couvertures du catalogue */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Couvertures du catalogue
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Associe les images locales du dossier <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">public/covers/</span> aux ouvrages du catalogue.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-medium text-slate-700">Mise à jour des couvertures</p>
            <p className="text-[11px] text-slate-400">
              Applique les chemins locaux et met à jour le catalogue.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncCovers}
            disabled={isSyncingCovers}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white flex items-center justify-center gap-2 transition shadow-xs cursor-pointer shrink-0"
          >
            {isSyncingCovers ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mise à jour...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Synchroniser les couvertures</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gestion des données */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Gestion des données
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Exportation et réinitialisation des données stockées localement.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-medium text-slate-700">Exportation JSON</p>
            <p className="text-[11px] text-slate-400">Télécharge une sauvegarde complète du catalogue, des adhérents et des prêts.</p>
          </div>
          <button
            type="button"
            onClick={exportDatabaseJSON}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Télécharger la sauvegarde</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <p className="text-xs font-medium text-rose-700">Réinitialisation des données</p>
            <p className="text-[11px] text-slate-400">Recharge les 20 ouvrages et 40 adhérents par défaut.</p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>
    </div>
  );
};
