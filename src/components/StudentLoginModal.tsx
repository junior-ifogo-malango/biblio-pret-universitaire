import React, { useState } from 'react';
import { X, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { seConnecterGoogle, seConnecter, ConnectedStudent } from '../services/authService';
import { useLibrary } from '../context/LibraryContext';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (student: ConnectedStudent) => void;
}

export const StudentLoginModal: React.FC<StudentLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const { adherents, allowedAcademicDomain, ensureStudentAdherent } = useLibrary();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsConnectingGoogle(true);
    try {
      const result = await seConnecterGoogle(adherents, allowedAcademicDomain);
      if (result.success && result.student) {
        if (ensureStudentAdherent) {
          ensureStudentAdherent(result.student);
        }
        setErrorMsg(null);
        onLoginSuccess(result.student);
        onClose();
      } else {
        setErrorMsg(result.error || "Échec de l'authentification Google.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleCancelGoogle = () => {
    setIsConnectingGoogle(false);
    setErrorMsg("Connexion Google interrompue. Vous pouvez réessayer ou utiliser votre adresse e-mail ci-dessous.");
  };

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = seConnecter(emailInput, adherents, allowedAcademicDomain);
    if (result.success && result.student) {
      if (ensureStudentAdherent) {
        ensureStudentAdherent(result.student);
      }
      setErrorMsg(null);
      onLoginSuccess(result.student);
      onClose();
    } else {
      setErrorMsg(result.error || "Adresse e-mail invalide.");
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden relative text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Google */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Bibliothèque Universitaire
              </h3>
              <p className="text-xs text-slate-500">
                Connectez-vous avec n'importe quel compte
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug font-medium">
                {errorMsg}
              </div>
            </div>
          )}

          {/* Bouton Google principal */}
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={isConnectingGoogle}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-800 text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer"
            >
              {isConnectingGoogle ? (
                <>
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Se connecter avec Google</span>
                </>
              )}
            </button>
            {isConnectingGoogle && (
              <button
                type="button"
                onClick={handleCancelGoogle}
                className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer py-1"
              >
                Annuler l'attente
              </button>
            )}
          </div>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-2.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              ou par e-mail
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-2.5">
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full min-h-[42px] pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <span>Continuer avec cet e-mail</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
