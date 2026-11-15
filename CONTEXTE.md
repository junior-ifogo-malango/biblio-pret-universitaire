# Mini-bibliothèque universitaire

## CONTEXTE
- Seuls les étudiants inscrits à l'université ont accès et peuvent emprunter.
- Livres physiques. Les emprunts se font uniquement sur place, au guichet, par scan QR : d'abord l'exemplaire, puis la carte étudiante.
- AUCUNE réservation, AUCUNE file ni liste d'attente.
- Priorité : le gestionnaire saisit le moins possible.

## RÔLES
- Gestionnaire : connexion simple, un seul compte.
- Étudiant : accède à l'application avec son compte Google académique (aucun mot de passe géré par l'application), puis consulte le catalogue en lecture seule. L'accès à la consultation est autorisé à toute adresse e-mail dont le domaine correspond au domaine autorisé (@usmba.ac.ma, configurable dans Réglages du gestionnaire). L'appartenance à la liste importée n'est pas exigée pour consulter.

## DONNÉES
- Ouvrage : isbn, titre, auteur, editeur, anneeEdition, categorie, cote, resume, coverUrl, sommaire, empruntable (faux = consultation sur place uniquement).
- Exemplaire : codeQR unique, emplacement (tiroir, rangée), statut DISPONIBLE | EMPRUNTE | PERDU.
- Adhérent : numeroEtudiant unique, nom, prenom, emailAcademique, filiere (texte, facultatif), niveau (texte, facultatif), dateExpiration (fin de l'année universitaire), statut actif ou résilié. Pas de téléphone. L'étudiant utilise sa carte étudiante EST, qui porte déjà un QR code contenant le numéro d'étudiant. La bibliothèque n'imprime aucune carte.
- Emprunt : adherent, exemplaire, dateEmprunt, dateRetourPrevue, dateRetourEffective, nbRappels, dateDernierRappel.

## RÈGLES MÉTIER
1. Adhérents : créés uniquement par import d'un fichier (numéro d'étudiant, nom, prénom, e-mail académique), jamais à la main. Les colonnes filiere et niveau sont facultatives ; leur absence ne fait pas rejeter le fichier (le fichier reste rejeté seulement si une colonne obligatoire manque ou si un numéro d'étudiant est vide). Le numéro d'étudiant est la clé : existant = mise à jour, sinon création. Absent de la nouvelle liste = résilié. La liste est fiable : aucun contrôle des e-mails.
2. Emprunt (deux scans) refusé, avec le motif affiché, si : l'exemplaire n'est pas DISPONIBLE, l'ouvrage n'est pas empruntable, l'adhérent a un emprunt en retard, ou l'adhérent est résilié ou son abonnement expiré. Sinon : dateRetourPrevue = dateEmprunt + 15 jours, exemplaire EMPRUNTE. Sans prolongation, sans quota. Le premier qui présente l'exemplaire l'emprunte. Un emprunt peut être annulé dès le scan de l'exemplaire, avant ou juste après son enregistrement (erreur de scan) : il est marqué annulé, jamais supprimé ; l'exemplaire reste ou redevient DISPONIBLE ; un emprunt annulé n'entre dans aucun calcul de retard ni de rappel.
3. Retour (un scan de l'exemplaire) : toujours possible, même si l'adhérent est en retard ou résilié. Le retour n'a aucun choix d'état : scan de l'exemplaire, clôture de l'emprunt, exemplaire DISPONIBLE, puis « Ranger : tiroir X, rangée Y » et « Reclasser ». Aucune notification au retour. Sans emprunt en cours (lecture sur place), afficher seulement l'emplacement avec « Reclasser ».
4. Aucun dommage n'est géré. Seules actions : perdu (PERDU) et retrouvé (DISPONIBLE).
5. Retard calculé, jamais stocké. Aucun envoi automatique. Tous les emprunts en retard (à partir de J+1) figurent dans À traiter ; le gestionnaire effectue l'envoi des rappels par niveau de retard depuis sa messagerie et confirme l'envoi. À partir de J+7, ils figurent aussi dans À contacter (suivi hors application). Aucune amende.
6. Jamais de suppression : uniquement des statuts. Valeurs calculables jamais stockées (retard, disponibilité, adhérent autorisé à emprunter). Notifications dans un journal. Interface en français.
8. Accès étudiant par domaine académique : l'accès à l'espace étudiant (consultation du catalogue) est autorisé à toute adresse e-mail dont le domaine correspond au domaine autorisé (@usmba.ac.ma, configurable dans Réglages du gestionnaire). L'appartenance à la liste importée n'est plus exigée pour consulter. L'emprunt reste réservé aux adhérents actifs de la liste importée, identifiés par le scan de la carte étudiante (règle 2 inchangée).
9. Couvertures d'ouvrages garanties (résolution fiable) : chaque ouvrage affiche toujours une couverture selon les 4 règles strictes :
   a) Validation de coverUrl : ne considère coverUrl comme valide que s'il s'agit d'une image Firebase Storage (firebasestorage.googleapis.com) ou Google Books (books.google.com). Tout lien openlibrary.org est strictement ignoré pour bannir l'erreur OpaqueResponseBlocking.
   b) Recherche Google Books souple (maxResults=5) : recherche texte libre combinant le titre principal sans accents (avant :) et le nom de famille du premier auteur (ex. : Biologie+Moleculaire+de+la+Cellule+Alberts), sans opérateurs intitle:/inauthor:, séquencée par une file d'attente (150ms).
   c) Sélection du premier résultat : parcours des 5 résultats pour prendre le premier possédant volumeInfo.imageLinks.thumbnail (converti en HTTPS) et dont le titre partage au moins un mot de plus de 3 lettres avec le livre.
   d) Mise à jour propre en base : n'enregistre coverUrl en base de données qu'après confirmation réelle du chargement de l'image (onLoad avec naturalWidth > 10). Couverture générée par défaut si aucune image réelle n'est confirmée. Balise <img> avec referrerPolicy="no-referrer".
10. Ergonomie de l'espace gestionnaire : l'espace gestionnaire utilise une barre latérale fixe bleu marine avec navigation (Accueil, Prêts, Catalogue, Étudiants, Historique, Alertes, Réglages en bas). Barre du haut fine : titre de page, date, recherche Ctrl+K, boutons Scanner un retour (contour) et Scanner un emprunt (orange). Sur mobile (<1280 px), la barre latérale devient un menu hamburger.

11. Espace étudiant & historique : l'espace étudiant affiche un bouton « Mon historique » en haut, listant tous les emprunts (titre, date emprunt, date retour ou retard actuel J+N).

12. Authentification Google réelle : l'étudiant se connecte via une authentification Google réelle (Firebase Auth popup). Seules les adresses e-mail appartenant au domaine académique autorisé (@usmba.ac.ma) sont admises. Tout compte d'un autre domaine (ex. @gmail.com) est immédiatement déconnecté avec le message « Accès réservé aux adresses académiques @usmba.ac.ma ».

13. Remplissage en lot du catalogue : les ouvrages peuvent être ajoutés en lot par recherche Google Books ; leurs exemplaires, codes QR et emplacements sont générés automatiquement. Le catalogue étudiant ne fait jamais d'appel API.
