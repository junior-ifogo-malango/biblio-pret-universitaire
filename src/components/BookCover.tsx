/**
 * Composant universel de couverture d'ouvrage avec cascade fiable :
 * 1. coverUrl valide en base de données (Firebase Storage, Google Books, data:image).
 *    Toute URL openlibrary.org est strictement ignorée pour éliminer l'erreur OpaqueResponseBlocking.
 * 2. Recherche Google Books texte libre (maxResults=5) Titre principal sans accents + Nom premier auteur.
 * 3. Sélection du premier résultat possédant une miniature et dont le titre est pertinent (> 3 lettres).
 * 4. Mise à jour propre en base (onCacheCoverUrl) UNIQUEMENT après confirmation réelle du chargement (onLoad avec naturalWidth > 10).
 * 5. Couverture générée par défaut si aucune image réelle n'est disponible.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Ouvrage } from '../types';
import { 
  CATEGORY_PALETTE, 
  DEFAULT_CATEGORY_COLOR, 
  cleanIsbnString, 
  fetchGoogleBooksThumbnail,
  isValidStoredCoverUrl
} from '../utils/coverResolver';

interface BookCoverProps {
  ouvrage?: Partial<Ouvrage>;
  titre?: string;
  auteur?: string;
  categorie?: string;
  coverUrl?: string;
  isbn?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onCacheCoverUrl?: (url: string) => void;
}

type CoverStatus = 'loading' | 'image_loaded' | 'generated_fallback';

export const BookCover: React.FC<BookCoverProps> = ({
  ouvrage,
  titre: propTitre,
  auteur: propAuteur,
  categorie: propCat,
  coverUrl: propCoverUrl,
  isbn: propIsbn,
  className = '',
  size = 'md',
  onCacheCoverUrl
}) => {
  const titre = ouvrage?.titre || propTitre || 'Ouvrage sans titre';
  const auteur = ouvrage?.auteur || propAuteur || 'Auteur non renseigné';
  const categorie = ouvrage?.categorie || propCat || 'Général & Référence';
  const initialCoverUrl = ouvrage?.coverUrl !== undefined ? ouvrage.coverUrl : propCoverUrl;
  const isbn = ouvrage?.isbn || propIsbn || '';

  const cleanIsbn = cleanIsbnString(isbn);

  // Étapes de résolution :
  // 0 : coverUrl valide en base (Firebase Storage, Google Books, data:image)
  // 1 : API Google Books (maxResults=5, recherche souple Titre + Auteur)
  // 2 : Couverture générée par défaut
  const [stage, setStage] = useState<number>(0);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<CoverStatus>('loading');
  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const advanceCascade = useCallback(async (currentStage: number) => {
    if (!isMounted.current) return;

    // Si coverUrl commençant par /covers/ échoue (onError ou naturalWidth <= 10), conserver directement la couverture générée
    const trimmed = initialCoverUrl?.trim() || '';
    if (trimmed.startsWith('/covers/') || trimmed.startsWith('covers/')) {
      setStage(2);
      setCurrentSrc(null);
      setStatus('generated_fallback');
      return;
    }

    if (currentStage === 0) {
      // Pour les autres URLs distantes échouées, tenter la recherche API Google Books
      setStage(1);
      setStatus('loading');
      const gbUrl = await fetchGoogleBooksThumbnail(cleanIsbn, titre, auteur);
      if (!isMounted.current) return;

      if (gbUrl) {
        setCurrentSrc(gbUrl);
      } else {
        setStage(2);
        setCurrentSrc(null);
        setStatus('generated_fallback');
      }
    } else {
      setStage(2);
      setCurrentSrc(null);
      setStatus('generated_fallback');
    }
  }, [cleanIsbn, titre, auteur, initialCoverUrl]);

  // Initialisation de la résolution
  useEffect(() => {
    let active = true;

    const startResolution = async () => {
      const trimmedUrl = initialCoverUrl ? initialCoverUrl.trim() : '';

      // 1. Couverture locale /covers/ : acceptée DIRECTEMENT sans vérification API externe
      if (trimmedUrl.startsWith('/covers/') || trimmedUrl.startsWith('covers/')) {
        setStage(0);
        setCurrentSrc(trimmedUrl);
        setStatus('loading');
        return;
      }

      // 2. Si coverUrl est vide : conserver directement la couverture générée sans appel API externe
      if (!trimmedUrl) {
        setStage(2);
        setCurrentSrc(null);
        setStatus('generated_fallback');
        return;
      }

      // 3. Autre coverUrl valide stocké (Firebase Storage, Google Books, data:image)
      if (isValidStoredCoverUrl(trimmedUrl)) {
        setStage(0);
        setCurrentSrc(trimmedUrl);
        setStatus('loading');
        return;
      }

      // 4. Lancement de la recherche Google Books en dernier recours
      setStage(1);
      setStatus('loading');
      const gbUrl = await fetchGoogleBooksThumbnail(cleanIsbn, titre, auteur);
      if (!active || !isMounted.current) return;

      if (gbUrl) {
        setCurrentSrc(gbUrl);
      } else {
        // Aucune image réelle trouvée -> couverture générée
        setStage(2);
        setCurrentSrc(null);
        setStatus('generated_fallback');
      }
    };

    startResolution();

    return () => {
      active = false;
    };
  }, [initialCoverUrl, cleanIsbn, titre, auteur]);

  // RÈGLE 4 : Confirmation réelle du chargement (onLoad avec naturalWidth > 10) avant enregistrement
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || img.naturalWidth <= 10) {
      // Rejet des pixels transparents ou images vides
      advanceCascade(stage);
    } else {
      // Vraie image confirmée
      setStatus('image_loaded');
      // RÈGLE 4 : N'enregistre coverUrl en base qu'après avoir confirmé le chargement réel de l'image
      if (stage === 1 && currentSrc && onCacheCoverUrl) {
        // Sécurité supplémentaire : ne jamais persister d'URL openlibrary cassée
        if (!currentSrc.includes('openlibrary.org')) {
          onCacheCoverUrl(currentSrc);
        }
      }
    }
  };

  const handleImageError = () => {
    advanceCascade(stage);
  };

  const catTheme = CATEGORY_PALETTE[categorie] || DEFAULT_CATEGORY_COLOR;
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  // 1. CAS EXCLUSIF : Image réelle chargée avec succès
  if (status === 'image_loaded' && currentSrc) {
    return (
      <div 
        className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-xs ring-1 ring-black/10 select-none bg-slate-100 ${className}`}
        title={`${titre} - ${auteur}`}
      >
        <img
          src={currentSrc}
          alt={`Couverture : ${titre}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
        {/* Ombre discrète de reliure */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
      </div>
    );
  }

  // 2. CAS EXCLUSIF : Couverture générée (échec de toutes les vraies images)
  if (status === 'generated_fallback') {
    return (
      <div 
        className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-xs ring-1 ring-white/10 select-none bg-gradient-to-br ${catTheme.bg} text-white p-3 flex flex-col justify-between ${className}`}
        title={`${titre} - ${auteur}`}
      >
        {/* Ombre de reliure gauche */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />
        
        {/* En-tête discipline */}
        <div className="relative z-10 flex items-start justify-between gap-1">
          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded backdrop-blur-xs ${catTheme.badge} truncate max-w-[85%]`}>
            {categorie}
          </span>
          <GraduationCap className="w-3.5 h-3.5 text-white/40 shrink-0" />
        </div>

        {/* Titre (3 lignes max) & auteur */}
        <div className="relative z-10 my-auto py-1">
          <div className="w-5 h-0.5 bg-amber-400/80 mb-1.5 rounded-full" />
          <h4 className={`font-serif font-bold text-white tracking-tight leading-snug line-clamp-3 ${
            isSmall ? 'text-[11px]' : isLarge ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}>
            {titre}
          </h4>
          <p className={`text-white/80 font-medium mt-1.5 line-clamp-2 ${
            isSmall ? 'text-[9px]' : 'text-[10px]'
          }`}>
            {auteur}
          </p>
        </div>

        {/* Pied : Mention bibliothèque */}
        <div className="relative z-10 pt-1.5 border-t border-white/10 flex items-center justify-between text-[8px] text-white/50 font-mono">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-white/40" />
            <span className="uppercase tracking-wider">BiblioPrêt</span>
          </div>
          <span className="opacity-60">EST Univ.</span>
        </div>
      </div>
    );
  }

  // 3. CAS EXCLUSIF : État « chargement » d'une source d'image (fond gris neutre, sans texte)
  return (
    <div 
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-xs ring-1 ring-black/10 select-none bg-slate-200 animate-pulse ${className}`}
      title={`${titre} - ${auteur}`}
    >
      {currentSrc && (
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-0 h-0 opacity-0 absolute pointer-events-none"
        />
      )}
    </div>
  );
};
