import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
  BookOpen,
  Bell,
  GraduationCap,
  QrCode,
  Download,
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { getOverdueBadgeInfo } from '../utils/overdueUtils';
import { generateQRCodeDataURL } from '../utils/qrUtils';
import { EmailNotification } from '../types';

function getNotificationLevelText(rem: EmailNotification): string {
  if (rem.niveauMessage) return rem.niveauMessage;
  switch (rem.type) {
    case 'MESSAGE_J1':
    case 'RAPPEL_RETARD_1':
      return 'J+1';
    case 'MESSAGE_J2':
    case 'RAPPEL_RETARD_2':
      return 'J+2';
    case 'MESSAGE_J3_4':
    case 'RAPPEL_RETARD_3':
      return 'J+3-4';
    case 'MESSAGE_J5':
      return 'J+5';
    case 'MESSAGE_J6':
      return 'J+6';
    case 'MESSAGE_J7_PLUS':
      return 'J+7+';
    default:
      return 'Message';
  }
}

export const MemberDetailModal: React.FC = () => {
  const {
    selectedAdherent,
    setSelectedAdherent,
    getAdherentActiveEmprunts,
    emprunts,
    notifications,
    getOuvrageById,
    getExemplaireById,
    isEmpruntEnRetard,
    getJoursDeRetard,
    currentDate
  } = useLibrary();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrZoomed, setIsQrZoomed] = useState<boolean>(false);
  const [copiedNumero, setCopiedNumero] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedAdherent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQrZoomed) {
          setIsQrZoomed(false);
        } else {
          setSelectedAdherent(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAdherent, isQrZoomed, setSelectedAdherent]);

  useEffect(() => {
    if (!selectedAdherent) {
      setQrDataUrl('');
      setIsQrZoomed(false);
      setCopiedNumero(false);
      return;
    }

    let isMounted = true;
    generateQRCodeDataURL(selectedAdherent.numeroEtudiant, 320).then((url) => {
      if (isMounted) {
        setQrDataUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedAdherent]);

  if (!selectedAdherent) return null;

  const handleCopyNumero = async () => {
    try {
      await navigator.clipboard.writeText(selectedAdherent.numeroEtudiant);
      setCopiedNumero(true);
      setTimeout(() => setCopiedNumero(false), 2000);
    } catch {
      // Clipboard API unavailable in this context
    }
  };

  const activeLoans = getAdherentActiveEmprunts(selectedAdherent.id);
  const pastLoans = emprunts.filter(
    e => e.adherentId === selectedAdherent.id && e.statut === 'rendu' && !e.annule
  );

  const hasLate = activeLoans.some(l => isEmpruntEnRetard(l));
  const isResilie = selectedAdherent.statut !== 'actif';
  const isExpired = Boolean(
    selectedAdherent.dateExpiration && selectedAdherent.dateExpiration < currentDate
  );

  let peutEmprunter = true;
  let motifRefus: string | null = null;

  if (isResilie) {
    peutEmprunter = false;
    motifRefus = 'Inscription résiliée';
  } else if (isExpired) {
    peutEmprunter = false;
    motifRefus = `Inscription universitaire expirée le ${new Date(
      selectedAdherent.dateExpiration
    ).toLocaleDateString('fr-FR')}`;
  } else if (hasLate) {
    peutEmprunter = false;
    motifRefus = 'Emprunt en retard non régularisé';
  }

  const studentMessages = notifications.filter(n => n.adherentId === selectedAdherent.id);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={() => setSelectedAdherent(null)}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-w-2xl rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif">Dossier Étudiant</h2>
              <p className="text-xs text-slate-400">Consultation en lecture seule</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedAdherent(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps du pop-up en lecture seule */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Fiche d'identité académique */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  {selectedAdherent.nom.toUpperCase()} {selectedAdherent.prenom}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 mt-1 font-mono text-xs">
                  <span>
                    N° Étudiant : <strong className="text-slate-800">{selectedAdherent.numeroEtudiant}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-sans">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <strong className="text-slate-800">{selectedAdherent.emailAcademique}</strong>
                  </span>
                </div>

                {(selectedAdherent.filiere || selectedAdherent.niveau) && (
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 mt-2">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {selectedAdherent.filiere && (
                      <span>
                        Filière : <strong className="text-slate-800">{selectedAdherent.filiere}</strong>
                      </span>
                    )}
                    {selectedAdherent.filiere && selectedAdherent.niveau && <span>·</span>}
                    {selectedAdherent.niveau && (
                      <span>
                        Niveau : <strong className="text-slate-800">{selectedAdherent.niveau}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                {selectedAdherent.statut === 'actif' ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Actif
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                    Résilié
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between text-slate-500 gap-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date d'expiration :{' '}
                <strong className="text-slate-700 ml-1">
                  {new Date(selectedAdherent.dateExpiration).toLocaleDateString('fr-FR')}
                </strong>
              </span>
              <span>Carte étudiante EST officielle</span>
            </div>
          </div>

          {/* Statut « Peut emprunter : oui / non » avec motif */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              peutEmprunter
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-red-50/80 border-red-200 text-red-950'
            }`}
          >
            {peutEmprunter ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-bold text-sm">
                Peut emprunter : {peutEmprunter ? 'Oui' : 'Non'}
              </div>
              {!peutEmprunter && motifRefus && (
                <div className="text-xs text-red-800 font-medium">Motif : {motifRefus}</div>
              )}
              {peutEmprunter && (
                <div className="text-xs text-emerald-800">
                  Inscription active et aucun retard en cours.
                </div>
              )}
            </div>
          </div>

          {/* QR Code Carte Étudiant EST */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => qrDataUrl && setIsQrZoomed(true)}
              className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs shrink-0 hover:border-amber-400 transition cursor-pointer group relative"
              title="Cliquer pour agrandir le QR Code"
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${selectedAdherent.numeroEtudiant}`}
                  className="w-24 h-24 object-contain"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[11px]">
                  Génération...
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>QR Code Carte Étudiant</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Code encodé :{' '}
                <code className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {selectedAdherent.numeroEtudiant}
                </code>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Scannable lors d'un nouveau prêt (étape 2) ou depuis « Scanner QR ».
                </span>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`QR-${selectedAdherent.numeroEtudiant}.png`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger PNG</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => qrDataUrl && setIsQrZoomed(true)}
                  disabled={!qrDataUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Agrandir</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyNumero}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                >
                  {copiedNumero ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copier le N°</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Emprunts en cours (titre, exemplaire, retour prévu, J+N) */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-xs flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Emprunts en cours ({activeLoans.length})</span>
            </h4>

            {activeLoans.length === 0 ? (
              <p className="text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                Aucun document actuellement emprunté par cet étudiant.
              </p>
            ) : (
              <div className="space-y-2">
                {activeLoans.map(loan => {
                  const ow = getOuvrageById(loan.ouvrageId);
                  const ex = getExemplaireById(loan.exemplaireId);
                  const isLate = isEmpruntEnRetard(loan);
                  const daysLate = isLate ? getJoursDeRetard(loan.dateRetourPrevue) : 0;
                  const badge = isLate ? getOverdueBadgeInfo(daysLate) : null;

                  return (
                    <div
                      key={loan.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ow?.titre || 'Ouvrage inconnu'}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Exemplaire : <strong>{ex?.codeQR || '—'}</strong> · Cote : {ow?.cote || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-600">
                          Retour prévu :{' '}
                          <strong className="font-mono">
                            {new Date(loan.dateRetourPrevue).toLocaleDateString('fr-FR')}
                          </strong>
                        </span>
                        {badge && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Messages envoyés (niveau et date) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-xs flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-slate-400" />
              <span>Messages envoyés ({studentMessages.length})</span>
            </h4>

            {studentMessages.length === 0 ? (
              <p className="text-slate-400 italic">Aucun message enregistré pour cet étudiant.</p>
            ) : (
              <div className="space-y-1.5">
                {studentMessages.map(rem => (
                  <div
                    key={rem.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold font-mono text-[10px] shrink-0">
                        {getNotificationLevelText(rem)}
                      </span>
                      <span className="text-slate-700 font-medium truncate">{rem.sujet}</span>
                    </div>
                    <span className="text-slate-500 font-mono shrink-0">
                      {new Date(rem.dateEnvoi).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historique des emprunts restitués */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-bold uppercase tracking-wider text-slate-700 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Historique des emprunts ({pastLoans.length})</span>
            </h4>

            {pastLoans.length === 0 ? (
              <p className="text-slate-400 italic">Aucun emprunt passé pour cet étudiant.</p>
            ) : (
              <div className="space-y-1.5">
                {pastLoans.map(loan => {
                  const ow = getOuvrageById(loan.ouvrageId);
                  return (
                    <div
                      key={loan.id}
                      className="text-slate-600 flex justify-between py-1 border-b border-slate-100 text-[11px]"
                    >
                      <span className="font-medium text-slate-800">{ow?.titre || 'Ouvrage'}</span>
                      <span className="text-slate-400 font-mono">
                        Rendu le{' '}
                        {loan.dateRetourEffective
                          ? new Date(loan.dateRetourEffective).toLocaleDateString('fr-FR')
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Fiche universitaire en lecture seule
          </span>
          <button
            type="button"
            onClick={() => setSelectedAdherent(null)}
            className="min-h-[44px] px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Aperçu agrandi du QR Code pour scan facile */}
      {isQrZoomed && qrDataUrl && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsQrZoomed(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Carte Étudiant EST
              </span>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                aria-label="Fermer l'aperçu QR"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block">
              <img
                src={qrDataUrl}
                alt={`QR Code ${selectedAdherent.numeroEtudiant}`}
                className="w-60 h-60 object-contain mx-auto"
              />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">
                {selectedAdherent.nom.toUpperCase()} {selectedAdherent.prenom}
              </div>
              <div className="font-mono font-bold text-base text-amber-700 mt-0.5">
                {selectedAdherent.numeroEtudiant}
              </div>
            </div>
            <a
              href={qrDataUrl}
              download={`QR-${selectedAdherent.numeroEtudiant}.png`}
              className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger l'image PNG</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
