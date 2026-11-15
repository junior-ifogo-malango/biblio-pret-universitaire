import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  BookOpen, 
  MapPin, 
  Layers, 
  Printer, 
  QrCode, 
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  Clock,
  BookPlus
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { BookCategory, Ouvrage } from '../types';
import { INITIAL_OUVRAGES } from '../data/mockData';
import { BookCover } from './BookCover';
import { BulkFillCatalogModal } from './BulkFillCatalogModal';

type ManagerSortOption = 'added-order' | 'title-asc' | 'year-desc';

const INITIAL_ORDER_INDEX = new Map<string, number>(
  INITIAL_OUVRAGES.map((o, idx) => [o.id, idx])
);

const normalizeText = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const parseAddedTimestampOrder = (id: string): { ts: number; idx: number } | null => {
  const m = id.match(/^ow_(\d{10,})(?:_(\d+))?/);
  if (!m) return null;
  return { ts: Number(m[1]), idx: m[2] ? Number(m[2]) : 0 };
};

const computeRelevanceScore = (ow: Ouvrage, queryText: string): number => {
  const normQ = normalizeText(queryText).trim();
  if (!normQ) return 0;
  const words = normQ.split(/\s+/).filter(Boolean);
  const title = normalizeText(ow.titre);
  const author = normalizeText(ow.auteur);
  const cote = normalizeText(ow.cote);
  const isbn = normalizeText(ow.isbn);
  const editeur = normalizeText(ow.editeur);

  let score = 0;
  if (title === normQ) score += 1000;
  else if (title.startsWith(normQ)) score += 500;
  else if (title.includes(normQ)) score += 300;

  if (author === normQ) score += 400;
  else if (author.startsWith(normQ)) score += 200;
  else if (author.includes(normQ)) score += 120;

  if (cote === normQ || isbn === normQ) score += 600;
  else if (cote.includes(normQ) || isbn.includes(normQ)) score += 150;

  for (const w of words) {
    if (title.includes(w)) score += 80;
    if (author.includes(w)) score += 40;
    if (cote.includes(w)) score += 30;
    if (editeur.includes(w)) score += 15;
  }
  return score;
};

export const BooksView: React.FC = () => {
  const { 
    ouvrages, 
    exemplaires, 
    getExemplairesByOuvrage, 
    setSelectedOuvrage, 
    updateOuvrage,
    setIsNewOuvrageOpen,
    setActivePrintLabelsOuvrageId,
    setIsQRScannerOpen
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'borrowed'>('all');
  const [sortBy, setSortBy] = useState<ManagerSortOption>('added-order');
  const [isBulkFillOpen, setIsBulkFillOpen] = useState(false);

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
    const arrayIndexMap = new Map<string, number>();
    ouvrages.forEach((o, idx) => arrayIndexMap.set(o.id, idx));

    const filtered = ouvrages.filter(ow => {
      if (selectedCategory !== 'all' && ow.categorie !== selectedCategory) return false;

      const exList = getExemplairesByOuvrage(ow.id);
      const availableCopies = exList.filter(e => e.statut === 'DISPONIBLE').length;

      if (availabilityFilter === 'available' && availableCopies === 0) return false;
      if (availabilityFilter === 'borrowed' && availableCopies > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          ow.titre.toLowerCase().includes(q) ||
          ow.auteur.toLowerCase().includes(q) ||
          ow.cote.toLowerCase().includes(q) ||
          ow.isbn.includes(q) ||
          ow.editeur.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    const trimmedQuery = searchQuery.trim();

    return filtered.sort((a, b) => {
      if (trimmedQuery) {
        const scoreDiff = computeRelevanceScore(b, trimmedQuery) - computeRelevanceScore(a, trimmedQuery);
        if (scoreDiff !== 0) return scoreDiff;
      }

      switch (sortBy) {
        case 'title-asc':
          return a.titre.localeCompare(b.titre, 'fr');
        case 'year-desc':
          return b.anneeEdition - a.anneeEdition;
        case 'added-order':
        default: {
          const rankA = INITIAL_ORDER_INDEX.get(a.id);
          const rankB = INITIAL_ORDER_INDEX.get(b.id);
          if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
          if (rankA !== undefined) return -1;
          if (rankB !== undefined) return 1;

          const addedA = parseAddedTimestampOrder(a.id);
          const addedB = parseAddedTimestampOrder(b.id);
          if (addedA && addedB) {
            if (addedA.ts !== addedB.ts) return addedA.ts - addedB.ts;
            if (addedA.idx !== addedB.idx) return addedA.idx - addedB.idx;
          }
          return (arrayIndexMap.get(a.id) ?? 0) - (arrayIndexMap.get(b.id) ?? 0);
        }
      }
    });
  }, [ouvrages, selectedCategory, availabilityFilter, searchQuery, sortBy, getExemplairesByOuvrage]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900">
            Fonds Documentaire & Gestion des Exemplaires
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inventaire des références bibliographiques, suivi des exemplaires physiques et étiquetage QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkFillOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-2xs transition cursor-pointer"
          >
            <BookPlus className="w-4 h-4 text-amber-600" />
            <span>Remplir le catalogue</span>
          </button>

          <button
            onClick={() => setIsNewOuvrageOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-2xs transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-100" />
            <span>Nouvel ouvrage</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Category Pills (Ligne défilante avec active bien marquée) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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

        {/* Search row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher titre, auteur, cote (ex: INFO-052)..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ManagerSortOption)}
              aria-label="Ordre de tri"
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="added-order">Tri : Ordre d'ajout</option>
              <option value="title-asc">Tri : Titre (A → Z)</option>
              <option value="year-desc">Tri : Plus récents</option>
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="all">Tous les ouvrages</option>
              <option value="available">Ayant des exemplaires disponibles</option>
              <option value="borrowed">Tous exemplaires empruntés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Ouvrages */}
      {filteredOuvrages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 font-serif">Aucun ouvrage trouvé</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            Aucun livre ne correspond à votre filtre de recherche ou de disponibilité.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setAvailabilityFilter('all'); setSortBy('added-order'); }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOuvrages.map(ow => {
            const exList = getExemplairesByOuvrage(ow.id);
            const activeCopies = exList;
            const availableCopies = exList.filter(e => e.statut === 'DISPONIBLE');
            const firstAvailable = availableCopies[0];
            const firstAnyCopy = activeCopies[0];

            return (
              <div
                key={ow.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between overflow-hidden group min-w-0"
              >
                {/* 1. Zone supérieure : Couverture à gauche (w-24/w-28), Texte à droite (flex-1 min-w-0) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 min-w-0">
                  {/* Couverture à gauche */}
                  <div 
                    onClick={() => setSelectedOuvrage(ow)}
                    className="w-24 sm:w-28 shrink-0 self-center sm:self-start shadow-xs rounded-xl overflow-hidden cursor-pointer"
                  >
                    <BookCover
                      ouvrage={ow}
                      size="sm"
                      onCacheCoverUrl={(url) => updateOuvrage(ow.id, { coverUrl: url })}
                    />
                  </div>

                  {/* Colonne de texte à droite : min-w-0 impératif anti-débordement */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Cote en petite étiquette & discipline */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="inline-flex items-center font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {ow.cote}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium truncate">
                        {ow.categorie}
                      </span>
                    </div>

                    {/* Titre */}
                    <h3 
                      onClick={() => setSelectedOuvrage(ow)}
                      className="font-bold font-serif text-sm sm:text-base text-slate-900 group-hover:text-amber-800 transition cursor-pointer line-clamp-2 leading-snug"
                    >
                      {ow.titre}
                    </h3>

                    {/* Auteur */}
                    <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                      {ow.auteur}
                    </p>

                    {/* Éditeur et Année */}
                    <p className="text-[11px] text-slate-400 truncate">
                      {ow.editeur} · {ow.anneeEdition}{ow.pagination ? ` (${ow.pagination} p.)` : ''}
                    </p>

                    {/* Résumé */}
                    {ow.resume && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                        {ow.resume}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Zone inférieure pleine largeur : Disponibilité puis Boutons */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 w-full min-w-0">
                  {/* Disponibilité : pleine largeur de la carte, taille 12-13px, pas de grand cadre */}
                  <div className="w-full min-w-0 text-[12px] sm:text-[13px] leading-tight">
                    {!ow.empruntable ? (
                      /* Sur place uniquement : gris bleuté ou bleu info sobre */
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <span className="font-medium">Sur place uniquement</span>
                        {firstAnyCopy && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono">{firstAnyCopy.emplacement.tiroir} / {firstAnyCopy.emplacement.rangee}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono">{activeCopies.length} ex.</span>
                          </>
                        )}
                      </div>
                    ) : availableCopies.length > 0 ? (
                      /* Disponible (vert) : ● Disponible · T1 / R2 · 2/3 ex. */
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium">Disponible</span>
                        <span className="text-emerald-400">·</span>
                        <span className="font-mono">{firstAvailable?.emplacement.tiroir} / {firstAvailable?.emplacement.rangee}</span>
                        <span className="text-emerald-400">·</span>
                        <span className="font-mono">{availableCopies.length}/{activeCopies.length} ex.</span>
                      </div>
                    ) : (
                      /* Indisponible (gris) */
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                        <span className="font-medium">Indisponible</span>
                        {firstAnyCopy && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono">{firstAnyCopy.emplacement.tiroir} / {firstAnyCopy.emplacement.rangee}</span>
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="font-mono">0/{activeCopies.length} ex.</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons : pleine largeur de la carte en 2 colonnes égales (grid-cols-2, gap de 8px, h-9) */}
                  <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                    <button
                      type="button"
                      onClick={() => setActivePrintLabelsOuvrageId(ow.id)}
                      className="h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs min-w-0"
                      title="Imprimer les étiquettes QR de cet ouvrage"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Planche QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOuvrage(ow)}
                      className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer shadow-xs min-w-0"
                      title={`Consulter la fiche et les ${exList.length} exemplaires`}
                    >
                      <span className="truncate">Exemplaires ({exList.length})</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <BulkFillCatalogModal
        isOpen={isBulkFillOpen}
        onClose={() => setIsBulkFillOpen(false)}
      />
    </div>
  );
};
