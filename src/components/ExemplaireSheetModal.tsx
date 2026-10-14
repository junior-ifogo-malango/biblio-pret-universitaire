import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Trash2, 
  ArrowLeftRight, 
  Printer, 
  RotateCcw,
  ShieldAlert,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { Exemplaire, Ouvrage, StatutExemplaire, EtatExemplaire } from '../types';
import { useLibrary } from '../context/LibraryContext';

interface ExemplaireSheetModalProps {
  exemplaire: Exemplaire | null;
  onClose: () => void;
}

export const ExemplaireSheetModal: React.FC<ExemplaireSheetModalProps> = ({
  exemplaire,
  onClose
}) => {
  const { 
    getOuvrageById, 
    reformeExemplaire, 
    reparerExemplaire,
    declarerDommageRayon,
    declarerPerdu,
    declarerRetrouve,
    openNewLoan, 
    setActivePrintLabelsOuvrageId,
    demandes
  } = useLibrary();

  const [isReforming, setIsReforming] = useState(false);
  const [motifReforme, setMotifReforme] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!exemplaire) return null;

  const ouvrage = getOuvrageById(exemplaire.ouvrageId);
  const waitingDemandsCount = demandes.filter(d => d.ouvrageId === exemplaire.ouvrageId && d.statut === 'EN_ATTENTE').length;

  // Action 1: Signaler un dommage sur un exemplaire en rayon (statut EN_REPARATION, etat = abîmé)
  const handleDeclareDommageRayon = () => {
    if (window.confirm(`Signaler un dommage sur l'exemplaire ${exemplaire.codeQR} ?\nL'exemplaire passera au statut EN_REPARATION avec état = abîmé. Il ne sera plus compté comme disponible et personne ne sera prévenu tant qu'il n'est pas réparé.`)) {
      declarerDommageRayon(exemplaire.id);
      setActionFeedback("Dommage signalé : l'exemplaire est retiré du rayon et placé EN RÉPARATION.");
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Action 2: Réparé (file non vide : RESERVE et e-mail à la première demande ; file vide : DISPONIBLE)
  const handleReparer = () => {
    const res = reparerExemplaire(exemplaire.id);
    if (res.isReservedForQueue && res.reservedStudent) {
      setActionFeedback(`Exemplaire réparé avec succès ! Une réservation de 24h a été attribuée à ${res.reservedStudent.prenom} ${res.reservedStudent.nom} et un e-mail a été envoyé.`);
    } else {
      setActionFeedback("Exemplaire réparé avec succès ! L'exemplaire est désormais DISPONIBLE en rayon.");
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Action 3: Irréparable -> statut DETRUIT avec dateReforme et motifReforme (jamais supprimé, état final)
  const handleConfirmReforme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motifReforme.trim()) return;
    reformeExemplaire(exemplaire.id, motifReforme.trim());
    setIsReforming(false);
    setActionFeedback("Exemplaire déclaré irréparable et archivé au statut DÉTRUIT / RÉFORMÉ.");
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Action 4: Perdu -> statut PERDU
  const handleDeclarePerdu = () => {
    if (window.confirm(`Déclarer l'exemplaire ${exemplaire.codeQR} comme PERDU ?\nCette action est réversible si l'exemplaire est ultérieurement retrouvé.`)) {
      declarerPerdu(exemplaire.id);
      setActionFeedback("Exemplaire marqué comme PERDU.");
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Action 5: Retrouvé -> réversible vers DISPONIBLE ou RESERVE si file
  const handleDeclareRetrouve = () => {
    const res = declarerRetrouve(exemplaire.id);
    if (res.isReservedForQueue && res.reservedStudent) {
      setActionFeedback(`Exemplaire retrouvé ! Une réservation prioritaire de 24h a été activée pour ${res.reservedStudent.prenom} ${res.reservedStudent.nom}.`);
    } else {
      setActionFeedback("Exemplaire retrouvé ! Il est désormais DISPONIBLE en rayon.");
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const statusBadge = () => {
    switch (exemplaire.statut) {
      case 'DISPONIBLE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">DISPONIBLE</span>;
      case 'EMPRUNTE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">EMPRUNTÉ</span>;
      case 'RESERVE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">RÉSERVÉ (FILE D'ATTENTE)</span>;
      case 'EN_REPARATION':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">EN RÉPARATION</span>;
      case 'PERDU':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 border border-orange-200">PERDU</span>;
      case 'DETRUIT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">IRRÉPARABLE / DÉTRUIT</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-amber-300">{exemplaire.codeQR}</h3>
                <span className="text-[10px] text-slate-400">Vie physique de l'exemplaire</span>
              </div>
              <p className="text-xs text-slate-400">Cote : {ouvrage?.cote}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {actionFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Ouvrage reference card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Ouvrage Référencé</span>
                <h4 className="text-sm font-bold font-serif text-slate-900 mt-0.5">{ouvrage?.titre}</h4>
                <p className="text-xs text-slate-500">{ouvrage?.auteur} • {ouvrage?.editeur} ({ouvrage?.anneeEdition})</p>
              </div>
              {statusBadge()}
            </div>
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-slate-500 text-[11px]">
              <span>ISBN : <strong className="font-mono text-slate-700">{ouvrage?.isbn}</strong></span>
              <span>{ouvrage?.empruntable ? 'Empruntable à domicile' : 'Consultation sur place uniquement'}</span>
            </div>
          </div>

          {/* Emplacement physique */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">Emplacement de rangement</div>
                <div className="text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                  Tiroir : <span className="text-amber-800">{exemplaire.emplacement.tiroir}</span> • Rangée : <span className="text-amber-800">{exemplaire.emplacement.rangee}</span>
                </div>
              </div>
            </div>
          </div>

          {/* État physique de l'exemplaire */}
          <div className="p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800">État physique :</div>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                exemplaire.etat === 'bon' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {exemplaire.etat === 'bon' ? 'Bon état' : 'Abîmé / Endommagé'}
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              {exemplaire.statut === 'EN_REPARATION' && (
                <span className="text-purple-700 font-semibold flex items-center gap-1 mt-1">
                  <Info className="w-3.5 h-3.5" />
                  Cet exemplaire n'est pas compté comme disponible et personne n'est prévenu tant qu'il n'est pas réparé.
                </span>
              )}
              {exemplaire.statut === 'DETRUIT' && (
                <span className="text-rose-700 font-semibold flex items-center gap-1 mt-1">
                  <Info className="w-3.5 h-3.5" />
                  Exemplaire irréparable / détruit. Il reste visible dans l'historique mais n'est plus compté dans le stock actif.
                </span>
              )}
            </div>
          </div>

          {/* Réforme info if already reformed */}
          {exemplaire.statut === 'DETRUIT' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Exemplaire irréparable (statut final DETRUIT)
              </div>
              <div className="text-[11px]">Date de réforme : <strong>{exemplaire.dateReforme || 'N/A'}</strong></div>
              <div className="text-[11px]">Motif : <strong>{exemplaire.motifReforme || 'Non spécifié'}</strong></div>
            </div>
          )}

          {/* Actions de gestion de la vie physique des exemplaires */}
          {exemplaire.statut !== 'DETRUIT' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-slate-400">
                Actions sur la vie physique de l'exemplaire :
              </div>

              {/* Formulaire de réforme / irréparable */}
              {isReforming ? (
                <form onSubmit={handleConfirmReforme} className="p-3.5 bg-rose-50/70 border border-rose-300 rounded-xl space-y-3">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-700" />
                    Déclarer irréparable (statut final DÉTRUIT)
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    L'exemplaire ne sera jamais supprimé de la base de données. Il sera archivé avec la date et le motif de réforme et ne comptera plus comme actif.
                  </p>
                  <input
                    type="text"
                    required
                    value={motifReforme}
                    onChange={(e) => setMotifReforme(e.target.value)}
                    placeholder="Motif : pages déchirées, reliure rompue irréparable, perte définitive..."
                    className="w-full p-2.5 border border-rose-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReforming(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
                    >
                      Confirmer Irréparable
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  {/* Action 1: Signaler un dommage en rayon (si DISPONIBLE) */}
                  {exemplaire.statut === 'DISPONIBLE' && (
                    <button
                      onClick={handleDeclareDommageRayon}
                      className="p-2.5 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-900 font-semibold text-left flex items-start gap-2.5 transition"
                    >
                      <Wrench className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Signaler dommage en rayon</div>
                        <div className="text-[10px] text-purple-700 font-normal">Passe EN RÉPARATION (abîmé)</div>
                      </div>
                    </button>
                  )}

                  {/* Action 2: Réparé (si EN_REPARATION) */}
                  {exemplaire.statut === 'EN_REPARATION' && (
                    <button
                      onClick={handleReparer}
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-left flex items-start gap-2.5 shadow-xs transition sm:col-span-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Exemplaire réparé</div>
                        <div className="text-[11px] text-emerald-100 font-normal">
                          {waitingDemandsCount > 0 
                            ? `File active (${waitingDemandsCount} en attente) : passe à RÉSERVÉ et notification par e-mail.`
                            : `File vide : passe immédiatement à DISPONIBLE en rayon.`}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Action 3: Perdu (si pas déjà PERDU ni EMPRUNTE) */}
                  {exemplaire.statut !== 'PERDU' && exemplaire.statut !== 'EMPRUNTE' && (
                    <button
                      onClick={handleDeclarePerdu}
                      className="p-2.5 rounded-xl border border-orange-200 hover:bg-orange-50 text-orange-900 font-semibold text-left flex items-start gap-2.5 transition"
                    >
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Déclarer perdu</div>
                        <div className="text-[10px] text-orange-700 font-normal">Statut PERDU (réversible)</div>
                      </div>
                    </button>
                  )}

                  {/* Action 4: Retrouvé (si PERDU) */}
                  {exemplaire.statut === 'PERDU' && (
                    <button
                      onClick={handleDeclareRetrouve}
                      className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-left flex items-start gap-2.5 shadow-xs transition sm:col-span-2"
                    >
                      <RotateCcw className="w-4 h-4 text-teal-200 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Exemplaire retrouvé</div>
                        <div className="text-[11px] text-teal-100 font-normal">
                          Réversible vers DISPONIBLE (ou RÉSERVÉ si file d'attente active).
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Action 5: Irréparable -> DETRUIT */}
                  <button
                    onClick={() => setIsReforming(true)}
                    className="p-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-800 font-semibold text-left flex items-start gap-2.5 transition"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold">Déclarer irréparable</div>
                      <div className="text-[10px] text-rose-700 font-normal">Statut final DÉTRUIT archivé</div>
                    </div>
                  </button>

                  {/* Prêter si disponible */}
                  {exemplaire.statut === 'DISPONIBLE' && (
                    <button
                      onClick={() => {
                        onClose();
                        openNewLoan(exemplaire.ouvrageId, undefined, exemplaire.id);
                      }}
                      className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-left flex items-start gap-2.5 shadow-xs transition"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-amber-200 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">Prêter l'exemplaire</div>
                        <div className="text-[10px] text-amber-100 font-normal">Nouveau prêt étudiant</div>
                      </div>
                    </button>
                  )}

                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (ouvrage) setActivePrintLabelsOuvrageId(ouvrage.id);
            }}
            className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer l'étiquette QR
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

