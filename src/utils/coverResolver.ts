/**
 * Service de résolution et gestion des couvertures d'ouvrages
 * 4 Règles strictes :
 *   1. Ignorer les URLs externes cassées dans coverUrl :
 *      Ne considère coverUrl comme valide que s'il s'agit d'une image Firebase Storage
 *      (firebasestorage.googleapis.com) ou Google Books (books.google.com / googleusercontent.com).
 *      Si coverUrl contient openlibrary.org, l'ignorer et lancer directement la recherche API.
 *   2. Recherche Google Books souple avec maxResults=5 :
 *      Recherche texte libre combinant le titre principal sans accents (avant :) et le nom de famille
 *      du premier auteur (ex. : Biologie+Moleculaire+de+la+Cellule+Alberts), sans opérateurs intitle:/inauthor:.
 *   3. Sélection du premier résultat avec miniature :
 *      Parcours des 5 résultats pour prendre le premier possédant volumeInfo.imageLinks?.thumbnail
 *      (en https://) et dont le titre partage au moins un mot de plus de 3 lettres avec le livre recherché.
 *   4. Mise à jour propre en base :
 *      N'enregistre coverUrl qu'après confirmation réelle du chargement (onLoad avec naturalWidth > 10).
 */

import { Ouvrage } from '../types';

// Palette de 8 couleurs sobres stables pour les disciplines
export const CATEGORY_PALETTE: Record<string, { bg: string; accent: string; badge: string }> = {
  'Informatique & Numérique': {
    bg: 'from-slate-900 via-blue-950 to-indigo-950',
    accent: 'border-cyan-400/40 text-cyan-200',
    badge: 'bg-cyan-500/20 text-cyan-200'
  },
  'Sciences & Techniques': {
    bg: 'from-slate-900 via-teal-950 to-emerald-950',
    accent: 'border-emerald-400/40 text-emerald-200',
    badge: 'bg-emerald-500/20 text-emerald-200'
  },
  'Mathématiques & Physique': {
    bg: 'from-slate-900 via-purple-950 to-violet-950',
    accent: 'border-violet-400/40 text-violet-200',
    badge: 'bg-violet-500/20 text-violet-200'
  },
  'Histoire & Géographie': {
    bg: 'from-stone-900 via-amber-950 to-amber-900',
    accent: 'border-amber-400/40 text-amber-200',
    badge: 'bg-amber-500/20 text-amber-200'
  },
  'Économie & Gestion': {
    bg: 'from-slate-900 via-stone-900 to-emerald-950',
    accent: 'border-teal-400/40 text-teal-200',
    badge: 'bg-teal-500/20 text-teal-200'
  },
  'Droit & Sciences Politiques': {
    bg: 'from-slate-900 via-stone-900 to-rose-950',
    accent: 'border-rose-400/40 text-rose-200',
    badge: 'bg-rose-500/20 text-rose-200'
  },
  'Philosophie & Éthique': {
    bg: 'from-stone-950 via-neutral-900 to-zinc-900',
    accent: 'border-stone-400/40 text-stone-200',
    badge: 'bg-stone-500/20 text-stone-200'
  },
  'Langues & Littérature': {
    bg: 'from-slate-900 via-blue-950 to-sky-950',
    accent: 'border-sky-400/40 text-sky-200',
    badge: 'bg-sky-500/20 text-sky-200'
  }
};

export const DEFAULT_CATEGORY_COLOR = {
  bg: 'from-slate-900 via-slate-800 to-zinc-900',
  accent: 'border-slate-400/40 text-slate-200',
  badge: 'bg-slate-500/20 text-slate-200'
};

/**
 * Nettoie une chaîne ISBN
 */
export const cleanIsbnString = (rawIsbn?: string): string => {
  if (!rawIsbn) return '';
  return rawIsbn.replace(/[^0-9X]/gi, '').trim();
};

/**
 * RÈGLE 1 : Validation stricte de coverUrl
 * Ne considère coverUrl comme valide que s'il s'agit d'une image Firebase Storage
 * (firebasestorage.googleapis.com), Google Books (books.google.com / googleusercontent.com),
 * ou d'une image locale téléversée (data:image / blob:).
 * Tout lien openlibrary.org est strictement ignoré pour éviter les erreurs OpaqueResponseBlocking.
 */
export const isValidStoredCoverUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Rejet catégorique des URLs Open Library
  if (trimmed.includes('openlibrary.org')) {
    return false;
  }

  // Accepte directement tout coverUrl commençant par /covers/ ou covers/
  if (trimmed.startsWith('/covers/') || trimmed.startsWith('covers/')) {
    return true;
  }

  // Seules les sources vérifiées et sécurisées sont acceptées
  return (
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('books.google.com') ||
    trimmed.includes('googleusercontent.com') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:')
  );
};

/**
 * RÈGLE 3 : Vérification de pertinence du titre
 * Vérifie qu'au moins un mot significatif (> 3 lettres) du titre du livre
 * figure dans le titre renvoyé par l'API.
 */
export const checkTitleRelevance = (bookTitle: string, apiTitle?: string): boolean => {
  if (!apiTitle || !bookTitle) return false;

  const normalize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ');

  const normBook = normalize(bookTitle);
  const normApi = normalize(apiTitle);

  // Mots significatifs du livre (> 3 lettres pour ignorer articles/prépositions)
  const significantWords = normBook
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 3);

  if (significantWords.length === 0) {
    return normApi.includes(normBook) || normBook.includes(normApi);
  }

  const apiWords = new Set(normApi.split(/\s+/).filter(Boolean));
  return significantWords.some(w => apiWords.has(w) || normApi.includes(w));
};

/**
 * RÈGLE 2 : Construction de la requête Google Books texte libre
 * Combine le titre principal sans accents (avant :) et le nom de famille du premier auteur (avant la virgule).
 * Ex. : Biologie+Moleculaire+de+la+Cellule+Alberts
 * Sans opérateurs intitle: ni inauthor:.
 */
export const buildFreeTextGoogleBooksQuery = (titre?: string, auteur?: string): string | null => {
  if (!titre || !titre.trim()) return null;

  // 1. Enlever les élisions (L', d', l', d'...) pour ne pas polluer les mots
  const cleanedTitre = titre.replace(/\b[ldjmstncLDJMSTNC]['’]/gi, ' ');

  // 2. Titre principal avant les deux-points (:)
  const mainTitleRaw = cleanedTitre.split(':')[0].trim();
  const mainTitleClean = mainTitleRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  // 3. Nom de famille du premier auteur (avant la virgule)
  const firstAuthorRaw = (auteur || '').split(',')[0].trim();
  const authorClean = firstAuthorRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const authorParts = authorClean.split(/\s+/).filter(Boolean);
  const authorLastName = authorParts.length > 0 ? authorParts[authorParts.length - 1] : '';

  const queryParts = [...mainTitleClean.split(/\s+/).filter(Boolean)];
  if (authorLastName) {
    queryParts.push(authorLastName);
  }

  if (queryParts.length === 0) return null;
  return queryParts.join('+');
};

/**
 * File d'attente avec espacement minimal de 150ms pour prévenir l'erreur HTTP 429
 */
class ApiRequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelayMs = 150;
  private lastRequestTime = 0;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < this.minDelayMs) {
            await new Promise(r => setTimeout(r, this.minDelayMs - elapsed));
          }
          this.lastRequestTime = Date.now();
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch {}
      }
    }

    this.isProcessing = false;
  }
}

export const apiQueue = new ApiRequestQueue();

// Cache mémoire pour mémoriser les résultats et ne jamais réinterroger l'API pour un même ouvrage
const googleBooksMemoryCache = new Map<string, string | null>();

/**
 * Récupération de la miniature Google Books selon les règles 2 & 3
 * - maxResults=5
 * - Recherche texte libre Titre principal sans accents + Nom de famille premier auteur
 * - Parcours des 5 résultats : premier possédant imageLinks.thumbnail et titre pertinent
 */
export const fetchGoogleBooksThumbnail = async (
  rawIsbn?: string,
  titre?: string,
  auteur?: string
): Promise<string | null> => {
  const cleanIsbn = cleanIsbnString(rawIsbn);
  const cacheKey = (cleanIsbn || `${titre || ''}|${auteur || ''}`).trim().toLowerCase();

  if (cacheKey && googleBooksMemoryCache.has(cacheKey)) {
    return googleBooksMemoryCache.get(cacheKey) || null;
  }

  return apiQueue.enqueue<string | null>(async () => {
    // 1. Recherche prioritaire par ISBN avec maxResults=5
    if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&maxResults=5`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            for (const item of data.items) {
              const cover = item.volumeInfo?.imageLinks?.thumbnail || 
                            item.volumeInfo?.imageLinks?.smallThumbnail || 
                            item.volumeInfo?.imageLinks?.medium || 
                            item.volumeInfo?.imageLinks?.large;
              if (cover) {
                const httpsCover = cover.replace(/^http:\/\//i, 'https://');
                googleBooksMemoryCache.set(cacheKey, httpsCover);
                return httpsCover;
              }
            }
          }
        }
      } catch {
        // En cas d'échec ou d'absence, passer à la recherche texte libre
      }
    }

    // 2. RÈGLE 2 : Recherche texte libre avec maxResults=5 (Titre principal sans accents + Nom auteur)
    const freeTextQuery = buildFreeTextGoogleBooksQuery(titre, auteur);
    if (freeTextQuery) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${freeTextQuery}&maxResults=5`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          // 3. RÈGLE 3 : Parcours des 5 résultats pour prendre le premier avec miniature et titre pertinent
          if (Array.isArray(data.items) && data.items.length > 0) {
            for (const item of data.items) {
              const candidateTitle = item.volumeInfo?.title || '';
              const imageLinks = item.volumeInfo?.imageLinks;
              const thumbnail = imageLinks?.thumbnail || 
                                imageLinks?.smallThumbnail || 
                                imageLinks?.medium || 
                                imageLinks?.large;

              if (thumbnail && checkTitleRelevance(titre || '', candidateTitle)) {
                const httpsCover = thumbnail.replace(/^http:\/\//i, 'https://');
                googleBooksMemoryCache.set(cacheKey, httpsCover);
                return httpsCover;
              }
            }
          }
        }
      } catch {
        // Échec silencieux
      }
    }

    googleBooksMemoryCache.set(cacheKey, null);
    return null;
  });
};

/**
 * Redimensionne une photo dans le navigateur (largeur max 400px, JPEG qualité 0.8)
 */
export const resizeImageFileToCoverDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error("Le fichier sélectionné n'est pas une image."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        let targetW = img.width;
        let targetH = img.height;

        if (targetW > maxW) {
          targetH = Math.round((targetH * maxW) / targetW);
          targetW = maxW;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Impossible de traiter l'image."));
          return;
        }

        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Échec du chargement de l'image."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
    reader.readAsDataURL(file);
  });
};
