export type BookCategory = 
  | 'Informatique & Numérique'
  | 'Sciences & Techniques'
  | 'Mathématiques & Physique'
  | 'Histoire & Géographie'
  | 'Économie & Gestion'
  | 'Droit & Sciences Politiques'
  | 'Philosophie & Éthique'
  | 'Langues & Littérature'
  | 'Médecine & Santé'
  | 'Général & Référence';

export interface Emplacement {
  tiroir: string;
  rangee: string;
}

export type StatutExemplaire = 
  | 'DISPONIBLE' 
  | 'RESERVE' 
  | 'EMPRUNTE' 
  | 'EN_REPARATION' 
  | 'PERDU' 
  | 'DETRUIT';

export type EtatExemplaire = 'bon' | 'abîmé';

export interface Exemplaire {
  id: string;
  ouvrageId: string;
  codeQR: string; // Ex: "EX-1001"
  etat: EtatExemplaire;
  statut: StatutExemplaire;
  emplacement: Emplacement;
  dateReforme?: string;
  motifReforme?: string;
}

export interface Ouvrage {
  id: string;
  titre: string;
  auteur: string;
  isbn: string;
  editeur: string;
  anneeEdition: number;
  categorie: BookCategory;
  cote: string; // Ex: "INFO-042"
  pagination: number;
  resume: string;
  empruntable: boolean; // faux pour consultation sur place uniquement
  coverGradient?: string;
  coverUrl?: string;
}

export type StatutAdherent = 'actif' | 'resilie';

export interface Adherent {
  id: string;
  numeroEtudiant: string; // Clé unique
  nom: string;
  prenom: string;
  emailAcademique: string;
  codeQR: string; // Égal au numeroEtudiant
  dateInscription: string;
  dateExpiration: string; // Fin de l'année universitaire (ex: YYYY-08-31)
  statut: StatutAdherent;
  notes?: string;
}

export type StatutEmprunt = 'en_cours' | 'rendu' | 'perdu';

export interface Emprunt {
  id: string;
  loanNumber: string; // Ex: "PRT-2026-0045"
  adherentId: string;
  exemplaireId: string;
  ouvrageId: string;
  dateEmprunt: string; // YYYY-MM-DD
  dateRetourPrevue: string; // YYYY-MM-DD
  dateRetourEffective?: string; // YYYY-MM-DD
  nbRappels: number;
  dateDernierRappel?: string;
  statut: StatutEmprunt;
  etatAuRetour?: EtatExemplaire;
  notes?: string;
}

export type StatutDemande = 'EN_ATTENTE' | 'NOTIFIEE' | 'SERVIE' | 'EXPIREE' | 'ANNULEE';

export interface DemandeAttente {
  id: string;
  adherentId: string;
  ouvrageId: string;
  dateInscription: string;
  statut: StatutDemande;
  dateNotification?: string;
  dateLimiteRetrait?: string;
  exemplaireReserveId?: string;
}

export type TypeNotification = 'RESERVATION_DISPONIBLE' | 'RAPPEL_RETARD_1' | 'RAPPEL_RETARD_2';

export interface EmailNotification {
  id: string;
  destinataireEmail: string;
  destinataireNom: string;
  destinataireNumero: string;
  sujet: string;
  corps: string;
  dateEnvoi: string; // YYYY-MM-DD
  heureEnvoi?: string;
  type: TypeNotification;
  ouvrageId: string;
  ouvrageTitre: string;
  exemplaireId?: string;
  exemplaireCode?: string;
  emplacement?: Emplacement;
  dateLimiteRetrait?: string;
  adherentId: string;
}

export type UserRole = 'manager' | 'student';
