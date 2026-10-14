import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  X, 
  Camera, 
  BookCheck, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  RotateCcw, 
  Keyboard,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Exemplaire, Ouvrage, Adherent, Emprunt } from '../types';

export const ScanReturnModal: React.FC = () => {
  const { 
    isScanReturnOpen, 
    setIsScanReturnOpen, 
    returnByScan, 
    exemplaires, 
    getOuvrageById, 
    emprunts, 
    getAdherentById,
    isEmpruntEnRetard,
    getJoursDeRetard
  } = useLibrary();

  const [scannedCopyCode, setScannedCopyCode] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [returnResult, setReturnResult] = useState<{
    hadActiveLoan: boolean;
    exemplaire: Exemplaire;
    emplacement: { tiroir: string; rangee: string };
    ouvrage?: Ouvrage;
    adherent?: Adherent;
    isOverdue?: boolean;
    daysLate?: number;
    etatChoisi: 'bon' | 'abime';
    isReservedForQueue?: boolean;
    reservedStudent?: Adherent;
    dateLimiteRetrait?: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video scanner refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isScanReturnOpen) {
      stopCamera();
      resetState();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isScanReturnOpen]);

  const resetState = () => {
    setScannedCopyCode('');
    setManualCode('');
    setReturnResult(null);
    setErrorMessage(null);
    setCameraError(false);
  };

  const startCamera = async () => {
    setCameraError(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrames();
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanFrames = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameId.current = requestAnimationFrame(scanFrames);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data.trim()) {
        const val = code.data.trim();
        handleCopyScanned(val);
        return;
      }
    }

    animFrameId.current = requestAnimationFrame(scanFrames);
  };

  const handleCopyScanned = (codeVal: string) => {
    stopCamera();
    setErrorMessage(null);

    const clean = codeVal.trim().toUpperCase();
    const ex = exemplaires.find(e => e.codeQR.trim().toUpperCase() === clean || e.id === codeVal);

    if (!ex) {
      setErrorMessage(`Aucun exemplaire trouvé avec le code QR "${codeVal}".`);
      return;
    }

    setScannedCopyCode(ex.codeQR);

    // Rule 5: S'il n'y a pas d'emprunt en cours (livre lu sur place), afficher seulement l'emplacement sans modifier aucun statut
    const activeLoan = emprunts.find(e => e.exemplaireId === ex.id && e.statut === 'en_cours');
    if (!activeLoan) {
      const ow = getOuvrageById(ex.ouvrageId);
      setReturnResult({
        hadActiveLoan: false,
        exemplaire: ex,
        emplacement: ex.emplacement,
        ouvrage: ow,
        isOverdue: false,
        daysLate: 0,
        etatChoisi: 'bon',
        isReservedForQueue: false
      });
    }
  };

  const handleConfirmReturn = (etatChoisi: 'bon' | 'abime') => {
    setErrorMessage(null);
    const res = returnByScan(scannedCopyCode, etatChoisi);

    if (!res.success) {
      setErrorMessage(res.error || "Erreur lors du retour.");
      return;
    }

    if (res.exemplaire && res.emplacement) {
      setReturnResult({
        hadActiveLoan: res.hadActiveLoan,
        exemplaire: res.exemplaire,
        emplacement: res.emplacement,
        ouvrage: res.ouvrage,
        adherent: res.adherent,
        isOverdue: res.isOverdue,
        daysLate: res.daysLate,
        etatChoisi,
        isReservedForQueue: res.isReservedForQueue,
        reservedStudent: res.reservedStudent,
        dateLimiteRetrait: res.dateLimiteRetrait
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCopyScanned(manualCode.trim());
  };

  const handleScanAnother = () => {
    resetState();
    startCamera();
  };

  const handleClose = () => {
    setIsScanReturnOpen(false);
  };

  if (!isScanReturnOpen) return null;

  // Resolved copy preview before choice
  const targetExemplaire = scannedCopyCode
    ? exemplaires.find(e => e.codeQR.trim().toUpperCase() === scannedCopyCode.trim().toUpperCase())
    : null;
  const targetOuvrage = targetExemplaire ? getOuvrageById(targetExemplaire.ouvrageId) : null;
  const targetActiveLoan = targetExemplaire
    ? emprunts.find(e => e.exemplaireId === targetExemplaire.id && e.statut === 'en_cours')
    : null;
  const targetStudent = targetActiveLoan ? getAdherentById(targetActiveLoan.adherentId) : null;
  const isLoanLate = targetActiveLoan ? isEmpruntEnRetard(targetActiveLoan) : false;
  const daysLateCount = isLoanLate && targetActiveLoan ? getJoursDeRetard(targetActiveLoan.dateRetourPrevue) : 0;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center ${
      isFullScreen ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all ${
        isFullScreen 
          ? 'w-full h-full rounded-none flex flex-col justify-between max-w-none' 
          : 'rounded-2xl max-w-lg w-full'
      }`}>
        
        {/* Header */}
        <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BookCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif">Restitution d'Exemplaire (Scan Retour)</h2>
              <p className="text-[11px] text-emerald-300">Scan du livre rendu & consigne immédiate de rangement</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullScreen(prev => !prev)}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900 transition"
              title={isFullScreen ? "Quitter le plein écran" : "Passer en plein écran"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900 transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`p-5 space-y-4 text-xs ${isFullScreen ? 'overflow-y-auto max-w-3xl mx-auto w-full' : ''}`}>
          
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={handleScanAnother}
                className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold text-[10px]"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Result view with "Ranger : Tiroir X, Rangée Y" */}
          {returnResult ? (
            <div className="p-6 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-base font-bold font-serif text-slate-900">
                  {returnResult.hadActiveLoan 
                    ? "Retour Validé & Clôturé !" 
                    : "Livre Lu sur Place (Aucun emprunt actif)"}
                </h3>
                {returnResult.hadActiveLoan && returnResult.adherent && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Emprunteur : <strong>{returnResult.adherent.prenom} {returnResult.adherent.nom}</strong> ({returnResult.adherent.numeroEtudiant})
                    {returnResult.isOverdue && (
                      <span className="ml-1 text-rose-600 font-bold">(Restitué en retard de {returnResult.daysLate}j - blocage levé)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Crucial guideline: Afficher « Ranger : tiroir X, rangée Y » pour un exemplaire disponible ou réservé */}
              {returnResult.etatChoisi === 'bon' ? (
                <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-slate-900 space-y-2 shadow-xs">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-amber-800">
                    Consigne de rangement en rayon
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-amber-950 flex items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-amber-600" />
                    <span>Ranger : Tiroir {returnResult.emplacement.tiroir}, Rangée {returnResult.emplacement.rangee}</span>
                  </div>

                  {returnResult.isReservedForQueue && returnResult.reservedStudent ? (
                    <div className="mt-2 p-3 bg-blue-100/80 border border-blue-300 rounded-xl text-blue-950 text-left space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-blue-900 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-blue-700" />
                        <span>Exemplaire réservé pour la file d'attente (Statut RÉSERVÉ)</span>
                      </div>
                      <div className="text-[11px] text-blue-900">
                        Attribué en priorité à : <strong>{returnResult.reservedStudent.prenom} {returnResult.reservedStudent.nom}</strong> ({returnResult.reservedStudent.numeroEtudiant})
                      </div>
                      <div className="text-[10px] text-blue-800">
                        E-mail de notification consigné dans le journal • Date limite de retrait (24h) : <strong>{returnResult.dateLimiteRetrait ? new Date(returnResult.dateLimiteRetrait).toLocaleDateString('fr-FR') : ''}</strong>
                      </div>
                      <div className="text-[10px] text-slate-600 italic pt-0.5">
                        Rangement normal en tiroir : le gestionnaire ne fait aucun geste supplémentaire.
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 font-medium">
                      Exemplaire <strong>{returnResult.exemplaire.codeQR}</strong> remis au statut <strong>DISPONIBLE</strong>.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <Wrench className="w-4 h-4 text-purple-700" />
                    <span>Dommage constaté : Exemplaire mis EN RÉPARATION</span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    L'exemplaire <strong>{returnResult.exemplaire.codeQR}</strong> est marqué avec état = abîmé et placé en réparation.
                  </p>
                  <p className="text-[10px] text-purple-700 font-medium">
                    Il n'est pas compté comme disponible et personne dans la file n'est prévenu tant qu'il n'est pas réparé.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Scanner un Autre Retour
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Terminer
                </button>
              </div>
            </div>
          ) : targetExemplaire ? (
            /* Copy scanned, now choose physical condition (Bon état vs Dommage constaté) */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ouvrage :</span>
                  <span className="font-bold text-slate-900 text-right">{targetOuvrage?.titre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exemplaire scanné :</span>
                  <span className="font-mono font-bold text-amber-800">{targetExemplaire.codeQR} (Cote : {targetOuvrage?.cote})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Emplacement habituel :</span>
                  <span className="font-mono font-bold text-slate-800">Tiroir {targetExemplaire.emplacement.tiroir}, Rangée {targetExemplaire.emplacement.rangee}</span>
                </div>

                {targetActiveLoan ? (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Emprunteur :</span>
                      <strong>{targetStudent?.prenom} {targetStudent?.nom} ({targetStudent?.numeroEtudiant})</strong>
                    </div>
                    {isLoanLate ? (
                      <div className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>En retard de {daysLateCount} jour(s) — Le retour est accepté et lèvera le blocage</span>
                      </div>
                    ) : (
                      <div className="text-emerald-700 text-[11px]">
                        Emprunt dans les temps (échéance : {new Date(targetActiveLoan.dateRetourPrevue).toLocaleDateString('fr-FR')})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 text-amber-800 font-medium text-[11px]">
                    Livre lu sur place : aucun emprunt actif enregistré pour cet exemplaire.
                  </div>
                )}
              </div>

              {/* Two choices required by rules: Bon état (DISPONIBLE) ou Dommage constaté (EN_REPARATION) */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block text-xs">
                  Constat de l'état physique de l'exemplaire rendu :
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleConfirmReturn('bon')}
                    className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 font-bold text-left transition flex flex-col justify-between space-y-1 group active:scale-95 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Bon état</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-normal">
                      Passe à DISPONIBLE & prêt pour le rangement en rayon.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmReturn('abime')}
                    className="p-3.5 rounded-xl border-2 border-purple-400 bg-purple-50/70 hover:bg-purple-100 text-purple-950 font-bold text-left transition flex flex-col justify-between space-y-1 group active:scale-95 shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 text-purple-800 font-extrabold text-xs">
                      <Wrench className="w-4 h-4 text-purple-600" />
                      <span>Dommage constaté</span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-normal">
                      Passe à EN RÉPARATION avec état abîmé.
                    </span>
                  </button>
                </div>
              </div>

              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                >
                  Scanner un autre code QR
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: Camera active scanning for copy */
            <div className="space-y-3">
              <div className="text-center">
                <p className="font-bold text-sm text-slate-800 font-serif">
                  Pointez la caméra vers le code QR du livre rendu
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  La clôture de l'emprunt et la consigne de rangement s'affichent automatiquement.
                </p>
              </div>

              <div className="relative w-full aspect-16/10 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 border-2 border-emerald-400 rounded-xl relative animate-pulse shadow-lg shadow-emerald-500/20">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-emerald-500 rounded-br" />
                      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-emerald-400/80" />
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="p-4 text-center text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-amber-300">Caméra inactive ou non disponible</p>
                    <p className="text-[11px] text-slate-400">Utilisez la saisie manuelle ci-dessous.</p>
                  </div>
                )}
              </div>

              {/* Manual input fallback */}
              <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="font-bold flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
                    Secours : Saisir le code QR de l'exemplaire :
                  </span>
                  <span className="text-slate-400 font-mono">Ex: EX-1001</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Code exemplaire (ex: EX-1001)..."
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 uppercase bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white ${
                      manualCode.trim() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300'
                    }`}
                  >
                    Valider
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={handleClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
