import React from 'react';
import { 
  Camera, 
  BookCheck, 
  Clock, 
  Lock, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="max-w-[800px] mx-auto space-y-6 pb-12 font-sans">
      
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Guide d'utilisation & protocoles
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Rappels courts des règles de gestion au guichet universitaire.
        </p>
      </div>

      {/* Card 1: Prêt & Retour 100% scan */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h2 className="text-sm font-semibold text-slate-900">
          Protocole prêt et retour par scan
        </h2>

        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">1. Enregistrement d'un emprunt (durée fixe de 15 jours)</strong>
            <p className="text-slate-600 leading-relaxed">
              Cliquez sur <strong>Scanner un emprunt</strong> dans l'en-tête. Scannez successivement le QR code de l'exemplaire, puis le QR code de la carte de l'étudiant. Le prêt est validé et un reçu numérique est édité.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">2. Restitution d'un exemplaire</strong>
            <p className="text-slate-600 leading-relaxed">
              Cliquez sur <strong>Scanner un retour</strong> dans l'en-tête. Scannez le QR code du livre rendu, choisissez l'état constaté (bon état ou abîmé). Le système affiche immédiatement la consigne de rangement (tiroir et rangée).
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Vie des exemplaires & Retards */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h2 className="text-sm font-semibold text-slate-900">
          Règles de gestion & incidents
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">Exemplaires abîmés & réparations</strong>
            <p className="text-slate-500 leading-relaxed">
              Un exemplaire restitué abîmé passe automatiquement en statut <em>EN RÉPARATION</em> sans notification. Une fois réparé, il redevient disponible ou est réservé au premier étudiant de la file d'attente.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">File d'attente & retrait 24h</strong>
            <p className="text-slate-500 leading-relaxed">
              Lorsqu'un livre indisponible est restitué en bon état, il est mis de côté 24 heures pour le premier demandeur, qui reçoit un courriel automatique avec son emplacement de retrait.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">Gestion des retards</strong>
            <p className="text-slate-500 leading-relaxed">
              Aucun frais financier n'est facturé. L'étudiant en retard est temporairement bloqué pour tout nouvel emprunt. Deux rappels lui sont envoyés avant le statut « à contacter ».
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
            <strong className="text-slate-800 block font-medium">Consultation sur place</strong>
            <p className="text-slate-500 leading-relaxed">
              Les ouvrages de référence marqués « sur place » ne peuvent pas être sortis de la bibliothèque. Le guichet de scan refuse automatiquement toute tentative d'emprunt à domicile.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
