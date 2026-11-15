import React, { useState } from 'react';
import { BookOpen, Shield, AlertCircle, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { ConnectedStudent, seConnecterGoogle, AuthResult } from '../services/authService';
import { useLibrary } from '../context/LibraryContext';

interface StudentWelcomeViewProps {
  onLoginSuccess: (student: ConnectedStudent) => void;
}

export const StudentWelcomeView: React.FC<StudentWelcomeViewProps> = ({ onLoginSuccess }) => {
  const { setIsManagerLoginOpen, adherents, allowedAcademicDomain, ensureStudentAdherent } = useLibrary();
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; code?: string; domainHint?: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsConnecting(true);
    try {
      const result: AuthResult = await seConnecterGoogle(adherents, allowedAcademicDomain);
      if (result.success && result.student) {
        if (ensureStudentAdherent) {
          ensureStudentAdherent(result.student);
        }
        onLoginSuccess(result.student);
      } else {
        setAuthError({
          message: result.error || "Échec de l'authentification Google.",
          code: result.errorCode,
          domainHint: result.authorizedDomainHint || currentHost
        });
      }
    } catch (err: any) {
      setAuthError({
        message: err?.message || "Une erreur inattendue est survenue.",
        code: err?.code
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCopyDomain = () => {
    if (currentHost && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Contenu centré */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-200">
          
          {/* Logo, Titre et Sous-titre */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
              Bibliothèque Universitaire
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              Connectez-vous avec votre compte Google
            </p>
          </div>

          {/* Bloc d'authentification */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 text-left">

            {/* Alerte Erreur avec explications si domaine non autorisé */}
            {authError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-snug font-medium">
                    {authError.message}
                  </div>
                </div>

                {/* Guide pour autoriser le domaine dans Firebase Authentication */}
                {authError.code === 'auth/unauthorized-domain' && (
                  <div className="mt-2 pt-2 border-t border-rose-200/70 text-[11px] space-y-2 text-rose-800">
                    <p className="font-semibold text-slate-800">
                      Comment autoriser ce domaine pour Google OAuth :
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                      <li>Ouvrez la <a href="https://console.firebase.google.com/project/gestion-pret-bibliotheque/authentication/settings" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-amber-700 inline-flex items-center gap-0.5">Console Firebase (Paramètres d'Authentification) <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Dans la section <strong>Domaines autorisés</strong>, cliquez sur <strong>Ajouter un domaine</strong></li>
                      <li>Collez le domaine ci-dessous :</li>
                    </ol>

                    <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-rose-200 font-mono text-[11px] text-slate-800 break-all select-all">
                      <span>{currentHost}</span>
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] flex items-center gap-1 shrink-0 font-sans font-medium transition cursor-pointer"
                      >
                        {copiedDomain ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bouton de connexion Google unique */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-800 text-sm font-semibold shadow-xs flex items-center justify-center gap-3 transition group active:scale-[0.99] cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  <span>Connexion Google en cours...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Se connecter avec Google</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Pied de page avec lien gestionnaire discret */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200/60 bg-white">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <span className="text-slate-400">Espace Étudiant & Lecteur</span>
          <button
            type="button"
            onClick={() => setIsManagerLoginOpen(true)}
            className="text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Accès gestionnaire</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
