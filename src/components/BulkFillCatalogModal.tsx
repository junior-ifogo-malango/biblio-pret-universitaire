import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookPlus,
  Printer,
  BookOpen,
  Layers
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { BookCategory } from '../types';

interface BulkFillCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GoogleBookCandidate {
  googleId: string;
  isbn: string;
  titre: string;
  auteur: string;
  editeur: string;
  anneeEdition: number;
  pagination: number;
  resume: string;
  coverUrl: string;
}

const DISCIPLINES: BookCategory[] = [
  'Informatique & Numérique',
  'Sciences & Techniques',
  'Mathématiques & Physique',
  'Histoire & Géographie',
  'Économie & Gestion',
  'Droit & Sciences Politiques',
  'Philosophie & Éthique',
  'Langues & Littérature',
  'Médecine & Santé',
  'Général & Référence'
];

const AUTO_DISCIPLINE_SEARCHES: Array<{ category: BookCategory; query: string }> = [
  { category: 'Informatique & Numérique', query: 'algorithmique programmation' },
  { category: 'Sciences & Techniques', query: 'biologie chimie' },
  { category: 'Mathématiques & Physique', query: 'mathématiques physique' },
  { category: 'Histoire & Géographie', query: 'histoire contemporaine' },
  { category: 'Économie & Gestion', query: 'économie gestion' },
  { category: 'Droit & Sciences Politiques', query: 'droit constitutionnel' },
  { category: 'Philosophie & Éthique', query: 'philosophie éthique' },
  { category: 'Langues & Littérature', query: 'littérature française' },
  { category: 'Médecine & Santé', query: 'anatomie physiologie' },
  { category: 'Général & Référence', query: 'méthodologie encyclopédie' }
];

const MAX_AUTO_BOOKS = 30;
const MAX_BOOKS_PER_DISCIPLINE = 5;

const cleanIsbnDigits = (raw?: string): string => {
  return (raw || '').replace(/[^0-9X]/gi, '').toUpperCase();
};

const extractYear = (publishedDate?: string): number => {
  if (!publishedDate) return new Date().getFullYear();
  const match = publishedDate.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
};

const parseGoogleBooksItems = (rawItems: any[]): GoogleBookCandidate[] => {
  const seenIsbns = new Set<string>();
  const parsed: GoogleBookCandidate[] = [];

  for (const item of rawItems) {
    const vi = item?.volumeInfo;
    const rawTitle = typeof vi?.title === 'string' ? vi.title.trim() : '';
    if (!rawTitle) continue;

    const identifiers = Array.isArray(vi?.industryIdentifiers)
      ? vi.industryIdentifiers
      : [];
    const isbn13Obj = identifiers.find(
      (id: any) => id?.type === 'ISBN_13' && typeof id?.identifier === 'string'
    );
    const isbn13 = cleanIsbnDigits(isbn13Obj?.identifier);
    if (!isbn13 || isbn13.length !== 13 || seenIsbns.has(isbn13)) continue;

    seenIsbns.add(isbn13);

    const rawThumb =
      vi?.imageLinks?.thumbnail || vi?.imageLinks?.smallThumbnail || '';
    const coverUrl =
      typeof rawThumb === 'string'
        ? rawThumb.trim().replace(/^http:\/\//i, 'https://')
        : '';

    const authors =
      Array.isArray(vi?.authors) && vi.authors.length > 0
        ? vi.authors.join(', ')
        : 'Auteur non renseigné';

    parsed.push({
      googleId: item.id || isbn13,
      isbn: isbn13,
      titre: rawTitle,
      auteur: authors,
      editeur:
        typeof vi?.publisher === 'string' && vi.publisher.trim()
          ? vi.publisher.trim()
          : 'Éditeur non renseigné',
      anneeEdition: extractYear(vi?.publishedDate),
      pagination: typeof vi?.pageCount === 'number' ? vi.pageCount : 0,
      resume: typeof vi?.description === 'string' ? vi.description.trim() : '',
      coverUrl
    });
  }

  return parsed;
};

const fetchGoogleBooksCandidates = async (
  searchText: string,
  maxResults: number,
  externalSignal?: AbortSignal
): Promise<GoogleBookCandidate[]> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      window.clearTimeout(timeoutId);
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      searchText
    )}&langRestrict=fr&printType=books&maxResults=${maxResults}`;

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        throw new Error('Quota Google Books atteint. Patientez quelques instants avant de réessayer.');
      }
      throw new Error(`Erreur lors de la requête Google Books (HTTP ${response.status}).`);
    }

    const data = await response.json();
    const rawItems = Array.isArray(data?.items) ? data.items : [];
    return parseGoogleBooksItems(rawItems);
  } finally {
    window.clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
};

export const BulkFillCatalogModal: React.FC<BulkFillCatalogModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    ouvrages,
    addBulkOuvrages,
    setActivePrintLabelExemplaireIds
  } = useLibrary();

  const [query, setQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<BookCategory>('Informatique & Numérique');
  const [copiesPerBook, setCopiesPerBook] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoProgress, setAutoProgress] = useState<{
    current: number;
    total: number;
    discipline: string;
  } | null>(null);
  const [autoWarning, setAutoWarning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<GoogleBookCandidate[]>([]);
  const [selectedIsbns, setSelectedIsbns] = useState<Set<string>>(new Set());
  const [lastBatchSummary, setLastBatchSummary] = useState<{
    booksCount: number;
    copiesCount: number;
    exemplaireIds: string[];
  } | null>(null);

  const autoAbortRef = useRef<AbortController | null>(null);

  // Annuler l'ajout automatique si la fenêtre se ferme
  useEffect(() => {
    if (!isOpen) {
      autoAbortRef.current?.abort();
      autoAbortRef.current = null;
      setIsAutoFilling(false);
      setAutoProgress(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const existingIsbns = useMemo(() => {
    return new Set(ouvrages.map(o => cleanIsbnDigits(o.isbn)).filter(Boolean));
  }, [ouvrages]);

  const selectableResults = useMemo(() => {
    return results.filter(item => !existingIsbns.has(item.isbn));
  }, [results, existingIsbns]);

  const validSelectedIsbns = useMemo(() => {
    const selectableSet = new Set(selectableResults.map(r => r.isbn));
    return new Set(Array.from(selectedIsbns).filter(isbn => selectableSet.has(isbn)));
  }, [selectableResults, selectedIsbns]);

  const isAllSelectableChecked =
    selectableResults.length > 0 && validSelectedIsbns.size === selectableResults.length;

  if (!isOpen) return null;

  const handleAutoFill30 = async () => {
    if (isLoading || isAutoFilling) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorMessage('Réseau absent : impossible de contacter Google Books.');
      setAutoWarning(null);
      return;
    }

    const sessionController = new AbortController();
    autoAbortRef.current = sessionController;

    setIsAutoFilling(true);
    setErrorMessage(null);
    setAutoWarning(null);
    setLastBatchSummary(null);

    const seenIsbns = new Set(existingIsbns);
    const collectedItems: Array<{
      isbn: string;
      titre: string;
      auteur: string;
      editeur: string;
      anneeEdition: number;
      pagination: number;
      resume: string;
      coverUrl: string;
      categorie: BookCategory;
    }> = [];
    const failedDisciplines: string[] = [];
    const totalSteps = AUTO_DISCIPLINE_SEARCHES.length;

    try {
      for (let i = 0; i < totalSteps; i++) {
        if (sessionController.signal.aborted || collectedItems.length >= MAX_AUTO_BOOKS) {
          break;
        }

        const { category, query: presetQuery } = AUTO_DISCIPLINE_SEARCHES[i];
        setAutoProgress({
          current: i + 1,
          total: totalSteps,
          discipline: category
        });

        try {
          const candidates = await fetchGoogleBooksCandidates(
            presetQuery,
            20,
            sessionController.signal
          );

          let addedForDiscipline = 0;
          for (const candidate of candidates) {
            if (collectedItems.length >= MAX_AUTO_BOOKS) break;
            if (addedForDiscipline >= MAX_BOOKS_PER_DISCIPLINE) break;
            if (!candidate.titre || !candidate.isbn || seenIsbns.has(candidate.isbn)) {
              continue;
            }

            seenIsbns.add(candidate.isbn);
            collectedItems.push({
              isbn: candidate.isbn,
              titre: candidate.titre,
              auteur: candidate.auteur,
              editeur: candidate.editeur,
              anneeEdition: candidate.anneeEdition,
              pagination: candidate.pagination,
              resume: candidate.resume,
              coverUrl: candidate.coverUrl,
              categorie: category
            });
            addedForDiscipline++;
          }
        } catch (err: any) {
          if (sessionController.signal.aborted) {
            break;
          }
          failedDisciplines.push(category);
        }
      }

      if (sessionController.signal.aborted) {
        return;
      }

      if (collectedItems.length > 0) {
        const { addedOuvrages, addedExemplaires } = addBulkOuvrages(collectedItems, 2);
        if (addedOuvrages.length > 0) {
          setLastBatchSummary({
            booksCount: addedOuvrages.length,
            copiesCount: addedExemplaires.length,
            exemplaireIds: addedExemplaires.map(e => e.id)
          });
        }
      } else if (failedDisciplines.length === 0) {
        setAutoWarning(
          'Aucun nouvel ouvrage avec ISBN-13 à importer : les résultats trouvés sont déjà présents au catalogue.'
        );
      }

      if (failedDisciplines.length > 0) {
        setAutoWarning(
          `Recherches en échec ignorées (${failedDisciplines.length}) : ${failedDisciplines.join(', ')}.`
        );
      }
    } finally {
      if (autoAbortRef.current === sessionController) {
        autoAbortRef.current = null;
      }
      setIsAutoFilling(false);
      setAutoProgress(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAutoFilling) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setErrorMessage('Saisissez un mot-clé, un auteur ou un sujet.');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorMessage('Réseau absent : impossible de contacter Google Books.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAutoWarning(null);
    setHasSearched(true);
    setSelectedIsbns(new Set());

    try {
      const parsed = await fetchGoogleBooksCandidates(trimmed, 40);
      setResults(parsed);
      if (parsed.length === 0) {
        setErrorMessage('Aucun ouvrage avec titre et ISBN-13 n’a été trouvé pour cette recherche.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setErrorMessage('Délai maximal de 8 secondes dépassé. Réessayez ou précisez votre recherche.');
      } else if (err instanceof TypeError) {
        setErrorMessage('Connexion réseau impossible. Vérifiez votre accès Internet et réessayez.');
      } else {
        setErrorMessage(
          err?.message || 'Erreur inattendue lors de la recherche Google Books.'
        );
      }
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (isAllSelectableChecked) {
      setSelectedIsbns(new Set());
    } else {
      setSelectedIsbns(new Set(selectableResults.map(r => r.isbn)));
    }
  };

  const toggleItem = (isbn: string) => {
    if (existingIsbns.has(isbn)) return;
    setSelectedIsbns(prev => {
      const next = new Set(prev);
      if (next.has(isbn)) next.delete(isbn);
      else next.add(isbn);
      return next;
    });
  };

  const handleAddSelected = () => {
    const itemsToAdd = selectableResults
      .filter(r => validSelectedIsbns.has(r.isbn))
      .map(r => ({
        isbn: r.isbn,
        titre: r.titre,
        auteur: r.auteur,
        editeur: r.editeur,
        anneeEdition: r.anneeEdition,
        pagination: r.pagination,
        resume: r.resume,
        coverUrl: r.coverUrl,
        categorie: selectedDiscipline
      }));

    if (itemsToAdd.length === 0) return;

    const { addedOuvrages, addedExemplaires } = addBulkOuvrages(itemsToAdd, copiesPerBook);
    setSelectedIsbns(new Set());

    if (addedOuvrages.length > 0) {
      setLastBatchSummary({
        booksCount: addedOuvrages.length,
        copiesCount: addedExemplaires.length,
        exemplaireIds: addedExemplaires.map(e => e.id)
      });
    }
  };

  const handleOpenPrintLabels = () => {
    if (!lastBatchSummary || lastBatchSummary.exemplaireIds.length === 0) return;
    const ids = lastBatchSummary.exemplaireIds;
    onClose();
    setActivePrintLabelExemplaireIds(ids);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-w-4xl rounded-none sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif">Remplir le catalogue</h2>
              <p className="text-xs text-slate-400">
                Ajout automatique par discipline ou recherche Google Books (ISBN-13)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ajout automatique en un clic + formulaire de recherche manuelle */}
        <form
          onSubmit={handleSearch}
          className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 text-xs"
        >
          {/* Bandeau Ajout automatique 30 livres */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Importation automatique multi-disciplines</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ajoute jusqu’à 5 ouvrages par discipline (30 max, 2 exemplaires disponibles chacun, sans doublon d’ISBN).
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutoFill30}
              disabled={isAutoFilling || isLoading}
              className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-2xs"
            >
              {isAutoFilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {autoProgress
                      ? `Recherche ${autoProgress.current} / ${autoProgress.total}…`
                      : 'Ajout en cours…'}
                  </span>
                </>
              ) : (
                <>
                  <BookPlus className="w-4 h-4" />
                  <span>Ajouter 30 livres automatiquement</span>
                </>
              )}
            </button>
          </div>

          {isAutoFilling && autoProgress && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-2 text-[11px] font-medium">
              <span className="truncate">
                Recherche {autoProgress.current} / {autoProgress.total}… ({autoProgress.discipline})
              </span>
              <div className="w-28 h-1.5 rounded-full bg-amber-200 overflow-hidden shrink-0">
                <div
                  className="h-full bg-amber-600 transition-all duration-200"
                  style={{ width: `${Math.round((autoProgress.current / autoProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Recherche manuelle */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-5">
              <label className="block font-semibold text-slate-700 mb-1">
                Recherche (mot-clé, auteur, sujet)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isAutoFilling}
                  placeholder="Ex : algorithmique, droit civil, physique..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block font-semibold text-slate-700 mb-1">
                Discipline attribuée
              </label>
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value as BookCategory)}
                disabled={isAutoFilling}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
              >
                {DISCIPLINES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Exemplaires par livre
                </label>
                <select
                  value={copiesPerBook}
                  onChange={(e) => setCopiesPerBook(Number(e.target.value))}
                  disabled={isAutoFilling}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading || isAutoFilling}
                className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <span>Rechercher</span>
                )}
              </button>
            </div>
          </div>

          {/* Résumé final après un ajout réussi */}
          {lastBatchSummary && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-950">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lastBatchSummary.booksCount} ouvrage{lastBatchSummary.booksCount > 1 ? 's' : ''} et{' '}
                  {lastBatchSummary.copiesCount} exemplaire{lastBatchSummary.copiesCount > 1 ? 's' : ''} ajoutés
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenPrintLabels}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer les étiquettes</span>
              </button>
            </div>
          )}

          {/* Avertissement partiel sur ajout automatique */}
          {autoWarning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{autoWarning}</span>
            </div>
          )}

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>

        {/* Barre Tout sélectionner + Ajouter (N) */}
        {results.length > 0 && (
          <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bulk-select-all"
                checked={isAllSelectableChecked}
                onChange={toggleSelectAll}
                disabled={selectableResults.length === 0 || isAutoFilling}
                className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40"
              />
              <label htmlFor="bulk-select-all" className="font-semibold text-slate-900 cursor-pointer">
                Tout sélectionner
              </label>
              <span className="text-slate-500">
                ({validSelectedIsbns.size} livre{validSelectedIsbns.size > 1 ? 's' : ''} sélectionné{validSelectedIsbns.size > 1 ? 's' : ''} sur {results.length})
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddSelected}
              disabled={validSelectedIsbns.size === 0 || isAutoFilling}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
            >
              <BookPlus className="w-4 h-4" />
              <span>Ajouter ({validSelectedIsbns.size})</span>
            </button>
          </div>
        )}

        {/* Liste des résultats */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 bg-white">
          {!hasSearched && !isLoading && (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">
                Utilisez l’ajout automatique ou lancez une recherche manuelle sur Google Books
              </p>
              <p>
                Les ouvrages ajoutés reçoivent automatiquement une cote, des exemplaires disponibles et des codes QR continus.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
              <span>Recherche en cours sur Google Books...</span>
            </div>
          )}

          {!isLoading &&
            results.map(item => {
              const alreadyInCatalog = existingIsbns.has(item.isbn);
              const isChecked = !alreadyInCatalog && validSelectedIsbns.has(item.isbn);

              return (
                <div
                  key={item.isbn}
                  onClick={() => {
                    if (!alreadyInCatalog && !isAutoFilling) toggleItem(item.isbn);
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3.5 transition text-xs ${
                    alreadyInCatalog
                      ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
                      : isChecked
                        ? 'bg-amber-50/50 border-amber-300 cursor-pointer'
                        : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={alreadyInCatalog || isAutoFilling}
                    onChange={() => toggleItem(item.isbn)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    aria-label={`Sélectionner ${item.titre}`}
                  />

                  {/* Miniature */}
                  <div className="w-11 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.titre}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Informations principales */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm line-clamp-1">
                        {item.titre}
                      </span>
                      {alreadyInCatalog && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 shrink-0">
                          Déjà au catalogue
                        </span>
                      )}
                    </div>
                    <div className="text-slate-700 font-medium truncate">
                      {item.auteur}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                      <span>{item.editeur}</span>
                      <span>·</span>
                      <span>{item.anneeEdition}</span>
                      <span>·</span>
                      <span className="font-mono">ISBN {item.isbn}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pied de page */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Cote, code QR (EX-xxxx), tiroir et rangée générés automatiquement à l'ajout.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
