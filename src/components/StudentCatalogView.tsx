import React, { useState, useMemo, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { 
  Search, 
  BookOpen, 
  MapPin, 
  CheckCircle2, 
  Lock, 
  Shield, 
  Layers, 
  HelpCircle, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  X, 
  Camera, 
  Keyboard, 
  Mail,
  Users
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Ouvrage } from '../types';
import { BookCover } from './BookCover';

export const StudentCatalogView: React.FC = () => {
  const { 
    ouvrages, 
    exemplaires, 
    getExemplairesByOuvrage, 
    setIsManagerLoginOpen, 
    setSelectedOuvrage,
    demandes,
    inscrireFileAttente,
    getQueueForOuvrage,
    userRole 
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Queue Modal State
  const [queueModalOuvrage, setQueueModalOuvrage] = useState<Ouvrage | null>(null);
  const [studentInput, setStudentInput] = useState('');
  const [queueFeedback, setQueueFeedback] = useState<{
    success: boolean;
    message: string;
    rang?: number;
    tailleFile?: number;
    email?: string;
  } | null>(null);

  // Camera scanner for student card
  const [isScanningCard, setIsScanningCard] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);

  const startCamera = async () => {
    setIsScanningCard(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
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
      setIsScanningCard(false);
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
    setIsScanningCard(false);
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
        stopCamera();
        setStudentInput(val);
        if (queueModalOuvrage) {
          const res = inscrireFileAttente(queueModalOuvrage.id, val);
          if (res.success && res.demande) {
            setQueueFeedback({
              success: true,
              message: `Vous êtes inscrit avec succès dans la file d'attente pour cet ouvrage.`,
              rang: res.rang,
              tailleFile: res.tailleFile,
              email: res.adherent?.emailAcademique
            });
          } else {
            setQueueFeedback({
              success: false,
              message: res.error || "Erreur lors de l'inscription."
            });
          }
        }
        return;
      }
    }

    animFrameId.current = requestAnimationFrame(scanFrames);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const categories = [
    'all',
    'Informatique & Numérique',
    'Sciences & Techniques',
    'Mathématiques & Physique',
    'Histoire & Géographie',
    'Économie & Gestion',
    'Droit & Sciences Politiques',
    'Philosophie & Éthique',
    'Langues & Littérature'
  ];

  const filteredOuvrages = useMemo(() => {
    return ouvrages.filter(ow => {
      if (selectedCategory !== 'all' && ow.categorie !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          ow.titre.toLowerCase().includes(q) ||
          ow.auteur.toLowerCase().includes(q) ||
          ow.cote.toLowerCase().includes(q) ||
          ow.isbn.includes(q) ||
          ow.resume.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [ouvrages, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Student Banner Header */}
      <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30">
                <BookOpen className="w-5 h-5 text-amber-50" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight font-serif">Bibliothèque Universitaire</span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Espace Étudiant
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Consultation du catalogue et localisation des ouvrages en rayon</p>
              </div>
            </div>

            {/* Manager Switch Button */}
            <button
              onClick={() => setIsManagerLoginOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Accès Gestionnaire</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Student Search Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Search Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-800 space-y-4">
          <div className="max-w-2xl">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">Catalogue en libre accès</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif mt-1">
              Trouvez vos manuels et références physiques
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Consultez l'emplacement exact en rayon (tiroir et rangée) pour retirer directement votre ouvrage sur place.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl pt-2">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, auteur, cote (ex: INFO-052), mot-clé..."
              className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl bg-white/95 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-lg font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (Ligne défilante avec active bien marquée) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-amber-300 ring-2 ring-amber-500/70 shadow-sm'
                  : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {cat === 'all' ? 'Toutes les disciplines' : cat}
            </button>
          ))}
        </div>

        {/* Catalog Results Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span><strong>{filteredOuvrages.length}</strong> référence(s) répertoriée(s)</span>
            <span>Localisation en rayon (tiroir & rangée)</span>
          </div>

          {filteredOuvrages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-serif">Aucun ouvrage correspondant</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                Aucun résultat ne correspond à votre filtre. Vérifiez l'orthographe du titre, de l'auteur ou de la cote.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredOuvrages.map(ow => {
                const exList = getExemplairesByOuvrage(ow.id);
                // Active copies (non reformés)
                const activeCopies = exList.filter(e => e.statut !== 'DETRUIT');
                // Available copies
                const availableCopies = exList.filter(e => e.statut === 'DISPONIBLE');
                const firstAvailable = availableCopies[0];
                const firstAnyCopy = activeCopies[0];
                const queueCount = getQueueForOuvrage(ow.id).length;

                return (
                  <div
                    key={ow.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-start gap-4 group"
                  >
                    {/* Couverture à gauche (ou en haut sur téléphone) */}
                    <div 
                      onClick={() => setSelectedOuvrage(ow)}
                      className="w-24 sm:w-28 shrink-0 self-center sm:self-start shadow-xs rounded-lg overflow-hidden cursor-pointer"
                    >
                      <BookCover
                        titre={ow.titre}
                        auteur={ow.auteur}
                        categorie={ow.categorie}
                        coverUrl={ow.coverUrl}
                        coverGradient={ow.coverGradient}
                        size="sm"
                      />
                    </div>

                    {/* Contenu : Titre, auteur, éditeur et année, cote en petite étiquette, badge de disponibilité */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                      <div>
                        {/* Cote en petite étiquette & discipline */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {ow.cote}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium truncate">
                            {ow.categorie}
                          </span>
                        </div>

                        {/* Titre */}
                        <h3
                          onClick={() => setSelectedOuvrage(ow)}
                          className="font-bold font-serif text-base text-slate-900 group-hover:text-amber-800 transition line-clamp-2 leading-snug cursor-pointer"
                        >
                          {ow.titre}
                        </h3>

                        {/* Auteur */}
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {ow.auteur}
                        </p>

                        {/* Éditeur et Année */}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ow.editeur} · {ow.anneeEdition}{ow.pagination ? ` (${ow.pagination} p.)` : ''}
                        </p>

                        {/* Résumé */}
                        {ow.resume && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                            {ow.resume}
                          </p>
                        )}
                      </div>

                      {/* Badges de disponibilité bien visibles */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                        {!ow.empruntable ? (
                          /* Badge orange bien visible : « Consultation sur place uniquement » */
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs">
                            <div className="font-bold flex items-center justify-between gap-1.5 text-amber-900">
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Consultation sur place uniquement
                              </span>
                            </div>
                            {firstAnyCopy && (
                              <div className="mt-1 font-mono text-[11px] text-amber-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Emplacement : <strong>Tiroir {firstAnyCopy.emplacement.tiroir}</strong>, <strong>Rangée {firstAnyCopy.emplacement.rangee}</strong></span>
                              </div>
                            )}
                          </div>
                        ) : availableCopies.length > 0 ? (
                          /* Badge vert bien visible : « Disponible : tiroir X, rangée Y » */
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                            <div className="font-bold flex items-center justify-between gap-1.5 text-emerald-900">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                Disponible : tiroir {firstAvailable.emplacement.tiroir}, rangée {firstAvailable.emplacement.rangee}
                              </span>
                              <span className="text-[11px] text-emerald-700 font-medium shrink-0">
                                {availableCopies.length}/{activeCopies.length} ex.
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Badge gris bien visible : « Indisponible » avec le nombre de personnes en attente */
                          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs space-y-2">
                            <div className="font-bold flex items-center justify-between gap-1.5 text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                Indisponible
                              </span>
                              <span className="text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                {queueCount} personne{queueCount > 1 ? 's' : ''} en attente
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setQueueModalOuvrage(ow);
                                setStudentInput('');
                                setQueueFeedback(null);
                                setIsScanningCard(false);
                              }}
                              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-200" />
                              <span>S'inscrire en file d'attente</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Queue Inscription Modal */}
      {queueModalOuvrage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold font-serif">Inscription en File d'Attente</h3>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setQueueModalOuvrage(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Ouvrage reference preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold">
                  {queueModalOuvrage.cote}
                </span>
                <h4 className="font-bold font-serif text-sm text-slate-900">{queueModalOuvrage.titre}</h4>
                <p className="text-[11px] text-slate-500">par {queueModalOuvrage.auteur}</p>
                <div className="text-[11px] text-amber-800 pt-1 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Taille actuelle de la file : <strong>{getQueueForOuvrage(queueModalOuvrage.id).length} étudiant(s)</strong></span>
                </div>
              </div>

              {/* Feedback Alert */}
              {queueFeedback && (
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  queueFeedback.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {queueFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{queueFeedback.success ? "Inscription Confirmée !" : "Information"}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{queueFeedback.message}</p>
                  {queueFeedback.success && (
                    <div className="mt-2 p-2 bg-emerald-100/70 rounded-lg text-[11px] font-mono space-y-0.5 text-emerald-900">
                      <div>Rang attribué : <strong>{queueFeedback.rang}</strong> sur <strong>{queueFeedback.tailleFile}</strong></div>
                      <div>Notification : Par e-mail académique ({queueFeedback.email})</div>
                      <div>Délai de réservation : <strong>24 heures</strong> à compter de la restitution.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Inscription Form */}
              {!queueFeedback?.success && (
                <div className="space-y-3">
                  <div className="text-slate-600 leading-relaxed text-[11px]">
                    Identifiez-vous à l'aide de votre <strong>numéro d'étudiant</strong> ou en scannant le <strong>code QR</strong> de votre carte de lecteur.
                  </div>

                  {/* Camera card scanner option */}
                  {isScanningCard ? (
                    <div className="space-y-2">
                      <div className="relative w-full aspect-16/10 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                        <video ref={videoRef} className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-36 h-36 border-2 border-amber-400 rounded-xl animate-pulse" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                      >
                        Annuler la caméra et saisir manuellement
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!studentInput.trim()) return;
                        const res = inscrireFileAttente(queueModalOuvrage.id, studentInput.trim());
                        if (res.success && res.demande) {
                          setQueueFeedback({
                            success: true,
                            message: `Vous êtes inscrit avec succès dans la file d'attente pour cet ouvrage.`,
                            rang: res.rang,
                            tailleFile: res.tailleFile,
                            email: res.adherent?.emailAcademique
                          });
                        } else {
                          setQueueFeedback({
                            success: false,
                            message: res.error || "Erreur lors de l'inscription."
                          });
                        }
                      }}
                      className="space-y-2"
                    >
                      <label className="font-bold text-slate-700 block text-xs">
                        Numéro d'étudiant (ou code QR de votre carte) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={studentInput}
                          onChange={(e) => setStudentInput(e.target.value)}
                          placeholder="Ex: ETU-2026-0006..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs uppercase bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-1"
                          title="Scanner avec la caméra"
                        >
                          <Camera className="w-4 h-4 text-amber-600" />
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-xs mt-1"
                      >
                        Confirmer mon Inscription
                      </button>
                    </form>
                  )}

                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                    💡 <strong>Règle de réservation :</strong> Dès qu'un exemplaire est rendu en rayon, un e-mail est envoyé à l'adresse académique de l'étudiant en tête de file. Vous disposez de <strong>24 heures</strong> pour le retirer.
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => {
                  stopCamera();
                  setQueueModalOuvrage(null);
                }}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
              >
                {queueFeedback?.success ? "Terminé" : "Fermer"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Student Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Bibliothèque Universitaire • Espace de consultation libre</span>
          <span className="text-slate-400">Présentez votre carte étudiant au guichet pour l'enregistrement du prêt</span>
        </div>
      </footer>
    </div>
  );
};
