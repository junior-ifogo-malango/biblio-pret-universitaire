/**
 * Service d'authentification pour l'espace étudiant avec Firebase Google Auth
 * Accepte tout compte Google valide (Gmail, messagerie personnelle ou académique).
 */

import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Adherent } from '../types';

export interface ConnectedStudent {
  id: string;
  prenom: string;
  email: string;
  photoURL?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  authorizedDomainHint?: string;
  student?: ConnectedStudent;
}

export const STORAGE_KEY_STUDENT_SESSION = 'biblio_student_session';

/**
 * Normalise un domaine e-mail : supprime les espaces et garantit le préfixe '@'
 */
export const normalizeDomain = (domain: string): string => {
  const clean = domain.trim().toLowerCase();
  if (!clean || clean === '*' || clean === 'all') return '*';
  return clean.startsWith('@') ? clean : `@${clean}`;
};

/**
 * Vérifie si une adresse e-mail appartient au domaine autorisé (ou accepte tout si '*' / vide)
 * Pour le domaine gmail.com, accepte également l'alias Google googlemail.com
 */
export const isEmailDomainAllowed = (
  email: string,
  allowedDomain: string = '*'
): boolean => {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail.includes('@')) return false;

  // Accepter plusieurs domaines séparés par une virgule
  const domains = allowedDomain
    .toLowerCase()
    .split(',')
    .map(domain => domain.trim().replace(/^@/, ''))
    .filter(Boolean);

  // Autoriser tous les domaines si * ou vide
  if (domains.length === 0 || domains.includes('*') || domains.includes('all')) {
    return true;
  }

  // Extraire le domaine réel de l'adresse
  const emailDomain = cleanEmail.split('@').pop();

  if (!emailDomain) return false;

  return domains.some(domain => {
    if (domain === 'gmail.com') {
      return emailDomain === 'gmail.com' ||
             emailDomain === 'googlemail.com';
    }

    return emailDomain === domain;
  });
};

/**
 * Résout les informations d'un étudiant à partir de son e-mail et de la liste des adhérents
 */
export const buildStudentProfile = (
  userEmail: string,
  userDisplayName?: string | null,
  userId?: string,
  userPhoto?: string | null,
  adherents: Adherent[] = []
): ConnectedStudent => {
  const cleanEmail = userEmail.trim().toLowerCase();
  const matched = adherents.find(
    a => a.emailAcademique.trim().toLowerCase() === cleanEmail
  );

  const defaultPrenom = userDisplayName 
    ? userDisplayName.split(' ')[0] 
    : (cleanEmail.split('@')[0] || 'Lecteur');

  const prenomToUse = matched ? matched.prenom : defaultPrenom;
  const idToUse = matched ? matched.id : (userId ? `google_${userId}` : `guest_${Date.now()}`);

  return {
    id: idToUse,
    prenom: prenomToUse,
    email: cleanEmail,
    photoURL: userPhoto || undefined
  };
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, timeoutErrorCode: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err: any = new Error(`Operation timed out (${timeoutErrorCode})`);
      err.code = timeoutErrorCode;
      reject(err);
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
};

/**
 * 1. Authentification Google via Firebase Auth
 * Ouvre une fenêtre popup Google. Accepte tout compte Google valide.
 */
export const seConnecterGoogle = async (
  adherents: Adherent[] = [],
  allowedDomain: string = '*'
): Promise<AuthResult> => {
  try {
    const cred = await withTimeout(
      signInWithPopup(auth, googleProvider),
      45000,
      'auth/popup-timeout'
    );
    const user: User = cred.user;
    const cleanEmail = user.email?.trim().toLowerCase() || '';

    if (!cleanEmail) {
      await signOut(auth);
      return {
        success: false,
        error: "Aucune adresse e-mail valide associée à ce compte Google."
      };
    }

    // Contrôle de domaine via isEmailDomainAllowed
    const domain = normalizeDomain(allowedDomain);
    if (!isEmailDomainAllowed(cleanEmail, allowedDomain)) {
      await signOut(auth);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
        }
      } catch {}

      return {
        success: false,
        error: `Accès réservé aux comptes Google du domaine ${domain === '@gmail.com' ? '@gmail.com' : domain}. (Votre compte connecté : ${cleanEmail})`
      };
    }

    // Création du profil étudiant
    const connected = buildStudentProfile(
      cleanEmail,
      user.displayName,
      user.uid,
      user.photoURL,
      adherents
    );

    // Sauvegarde locale de la session pour hydratation instantanée
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_STUDENT_SESSION, JSON.stringify(connected));
      }
    } catch (err) {
      console.warn("Erreur d'écriture localStorage:", err);
    }

    // Sauvegarde du profil utilisateur dans Firestore (avec délai max de 4s pour ne jamais bloquer la connexion)
    const userDocPath = `users/${user.uid}`;
    const profilePayload: Record<string, unknown> = {
      uid: user.uid.slice(0, 128),
      email: cleanEmail.slice(0, 320),
      updatedAt: serverTimestamp()
    };
    if (user.displayName && user.displayName.trim()) {
      profilePayload.displayName = user.displayName.trim().slice(0, 200);
    }
    withTimeout(
      setDoc(doc(db, 'users', user.uid), profilePayload, { merge: true }),
      4000,
      'firestore/timeout'
    ).catch((fsErr: any) => {
      if (fsErr?.code === 'permission-denied') {
        try {
          handleFirestoreError(fsErr, OperationType.WRITE, userDocPath);
        } catch (logged) {
          console.warn("Erreur de permission Firestore lors de la sauvegarde du profil :", logged);
        }
      } else {
        console.warn("Sauvegarde différée du profil Firestore :", fsErr?.message || fsErr);
      }
    });

    return {
      success: true,
      student: connected
    };
  } catch (error: any) {
    const code = error?.code || '';
    const rawMessage = error?.message || (typeof error === 'string' ? error : error?.stack || '');
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/popup-timeout') {
      return {
        success: false,
        errorCode: code,
        error: "La fenêtre Google n'a pas répondu à temps (pop-up bloquée ou fermée). Réessayez ou utilisez la connexion par e-mail ci-dessous."
      };
    }

    const isUnauthorizedDomain = 
      code === 'auth/unauthorized-domain' || 
      rawMessage.toLowerCase().includes('unauthorized-domain') || 
      rawMessage.toLowerCase().includes('authorized domain') ||
      rawMessage.includes('_validateOrigin') ||
      rawMessage.toLowerCase().includes('not authorized to run this operation');

    if (isUnauthorizedDomain) {
      console.warn("Domaine OAuth Firebase à autoriser :", currentHost);
      return {
        success: false,
        errorCode: 'auth/unauthorized-domain',
        authorizedDomainHint: currentHost,
        error: `Le domaine "${currentHost}" n'est pas encore autorisé pour OAuth dans la console Firebase. Vous pouvez vous connecter immédiatement par e-mail ci-dessous.`
      };
    }
    if (code === 'auth/operation-not-allowed') {
      console.warn("Fournisseur Google non activé dans Firebase:", error);
      return {
        success: false,
        errorCode: code,
        error: "Le fournisseur Google n'est pas encore activé dans Firebase. Vous pouvez vous connecter directement par e-mail ci-dessous."
      };
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.warn("Pop-up Google fermée par l'utilisateur.");
      return {
        success: false,
        errorCode: code,
        error: "La fenêtre de connexion Google a été fermée avant la fin de l'opération."
      };
    }
    if (code === 'auth/popup-blocked') {
      console.warn("Pop-up Google bloquée par le navigateur.");
      return {
        success: false,
        errorCode: code,
        error: "La fenêtre pop-up Google a été bloquée par le navigateur. Autorisez les pop-ups ou utilisez la connexion par e-mail ci-dessous."
      };
    }
    if (code === 'auth/network-request-failed') {
      console.warn("Erreur réseau Google Auth:", error);
      return {
        success: false,
        errorCode: code,
        error: "Erreur de connexion réseau lors de la communication avec Google."
      };
    }

    console.warn("Erreur d'authentification Google:", error);
    return {
      success: false,
      errorCode: code,
      error: error?.message || "Échec de l'authentification Google. Vous pouvez utiliser la saisie directe par e-mail ci-dessous."
    };
  }
};

export const seConnecterAvecGoogle = seConnecterGoogle;

/**
 * 2. Connexion manuelle ou de secours (fallback)
 * Accepte toute adresse e-mail valide
 */
export const seConnecter = (
  rawEmail: string,
  adherents: Adherent[] = [],
  allowedDomain: string = '*',
  _currentDate?: string
): AuthResult => {
  const cleanEmail = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return {
      success: false,
      error: "Veuillez saisir une adresse e-mail valide (ex. : nom@gmail.com)."
    };
  }

  const domain = normalizeDomain(allowedDomain);
  if (!isEmailDomainAllowed(cleanEmail, allowedDomain)) {
    return {
      success: false,
      error: `Accès réservé aux adresses du domaine ${domain === '@gmail.com' ? '@gmail.com' : domain}.`
    };
  }

  const connected = buildStudentProfile(
    cleanEmail,
    null,
    undefined,
    null,
    adherents
  );

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STUDENT_SESSION, JSON.stringify(connected));
    }
  } catch (err) {
    console.error("Erreur de sauvegarde de session:", err);
  }

  return {
    success: true,
    student: connected
  };
};

/**
 * 3. Se déconnecter : déconnecte Firebase Auth et supprime la session locale
 */
export const seDeconnecter = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Erreur signOut Firebase:", err);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
    }
  } catch (err) {
    console.error("Erreur de suppression de session:", err);
  }
};

/**
 * 4. Lire l'étudiant connecté : renvoie les données de session ou null
 */
export const lireEtudiantConnecte = (): ConnectedStudent | null => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_STUDENT_SESSION) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string') {
      return {
        id: typeof parsed.id === 'string' ? parsed.id : 'adh_saved',
        prenom: typeof parsed.prenom === 'string' && parsed.prenom ? parsed.prenom : parsed.email.split('@')[0],
        email: parsed.email,
        photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : undefined
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * 5. Observer l'état d'authentification Firebase pour synchronisation automatique
 */
export const observerEtatAuth = (
  onUserChanged: (student: ConnectedStudent | null) => void,
  adherents: Adherent[] = [],
  allowedDomain: string = '*'
) => {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      return;
    }

    const email = user.email?.trim().toLowerCase() || '';
    if (!email) {
      onUserChanged(null);
      return;
    }

    const domain = normalizeDomain(allowedDomain);
    if (!isEmailDomainAllowed(email, allowedDomain)) {
      signOut(auth).catch(() => {});
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
        }
      } catch {}
      onUserChanged(null);
      return;
    }

    const student = buildStudentProfile(
      email,
      user.displayName,
      user.uid,
      user.photoURL,
      adherents
    );
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_STUDENT_SESSION, JSON.stringify(student));
      }
    } catch {}
    onUserChanged(student);
  });
};
