> État actuel et consignes de test : voir docs/ROADMAP.md. Ce guide conserve les étapes historiques ; les anciens résultats de tests et les instructions de connexion à la base réelle ci-dessous ne constituent pas une validation de la stabilisation actuelle.

# Reprise Forma V1.9

Dépôt : daiti0804bruxelles-ai/forma-productivite.
Branche : feature/skills-xp-v1-9. PR : #11, brouillon non fusionné.

## Changements locaux

- `src/dailyXp.ts` : clôture des jours écoulés avant le report des tâches ; pénalités de 50 % ; identifiants stables ; activation sans pénalité rétroactive.
- `src/App.tsx` : intégration au chargement, au retour dans la fenêtre et au contrôle périodique existant. Curseur sauvegardé dans les données utilisateur et les exports JSON. Date de création des nouvelles habitudes.
- `tests/dailyXp.test.ts` : huit tests des règles XP et des changements de jour.
- `package.json` : commande `npm test`, avec Node.js récent prenant en charge TypeScript directement (22.18+).

Les pénalités sont calculées à la prochaine ouverture de l'application, ou à son contrôle périodique si elle reste ouverte. Aucun traitement serveur nocturne n'a été ajouté. Une tâche non terminée reste soumise à une pénalité par jour de retard. Une tâche reportée manuellement avant la fin de journée n'est plus due ce jour-là.

## Vérifications à terminer

Une copie locale officielle de Node.js 26.13.0 a été téléchargée et son empreinte vérifiée. Les huit tests XP passent et la compilation TypeScript/Vite réussit. Les dépendances ont été installées et package-lock.json a été créé. Aucun changement n'a été envoyé vers GitHub. Les tests dans le navigateur et avec Supabase restent à effectuer.

Avec Node.js disponible dans le terminal, dans ce dossier :

1. `npm ci` : télécharger les dépendances du projet.
2. `npm test` : exécuter les tests XP.
3. `npm run build` : vérifier TypeScript et générer l'application.
4. Configurer `.env.local` à partir de `.env.example` si présent, avec les paramètres publics Supabase du projet de test. Ne jamais y mettre de clé service_role.
5. `npm run dev` : démarrer l'application localement et ouvrir l'adresse affichée.
6. Avec un compte de test, vérifier les cases des tâches/habitudes, la page Compétences, les objectifs, puis la persistance après rechargement et l'isolation entre comptes.

Les règles Supabase et les modifications simultanées depuis plusieurs appareils restent à vérifier avant validation de la V1.9. Le stockage existant sauvegarde tout le document utilisateur ; ce travail n'ajoute pas de résolution des conflits entre appareils.

## Publication

Après tests réussis, examiner les modifications puis les envoyer sur la branche V1.9. Vérifier alors l'aperçu Vercel de la PR #11. Attendre l'accord explicite de l'utilisateur avant fusion et déploiement en production. Ne pas lancer de déploiement de production pour tester.

Copie locale de Node.js : ../.tools/node-v26.13.0-win-x64. Dans PowerShell, pour la rendre disponible pendant la session : $env:PATH = (Resolve-Path '../.tools/node-v26.13.0-win-x64').Path + ';' + $env:PATH

## Écran Compétences : fiche de personnage

Fichiers : src/SkillsPage.tsx et src/skills.css. Présentation sombre olive et or, silhouette vectorielle provisoire à gauche sur ordinateur, catégories repliables et jauges segmentées. Les cases indiquent les XP vers le niveau suivant, le nombre indique le niveau acquis. Cliquer une compétence met à jour le panneau de détail en bas de page. Les règles XP ne sont pas modifiées par cette refonte.

Validation : compilation TypeScript/Vite réussie ; sélection de Lecture et repli/réouverture d’une catégorie vérifiés dans le navigateur ; rendu contrôlé sur ordinateur et à 390 px de large. Aucune action de test n’a créé de tâche ou modifié les XP du compte. Personnage définitif et personnalisation à concevoir avec l’utilisateur.

Pour essayer : ouvrir Compétences dans la version locale, cliquer sur une catégorie pour la replier, puis sur une compétence et consulter son détail en bas. Aucun envoi GitHub ni déploiement effectué pour cette refonte. Suivre la procédure de publication ci-dessus après validation.

## Personnage personnalisable et cohérence visuelle

Fichiers : src/Avatar.tsx (dessin original vectoriel à facettes), src/avatarModel.ts (options et validation), src/AvatarEditor.tsx (aperçu, annulation, application), src/SkillsPage.tsx, src/skills.css, src/App.tsx (persistance dans user_data et export), tests/avatar.test.ts.

Choix disponibles : nom, deux silhouettes, trois coiffures, quatre teintes de peau, quatre couleurs de cheveux, deux tenues et quatre couleurs de tenue. Le rendu est une illustration 2D et non un modèle 3D. La page adopte le bleu nuit et le violet existants de Forma. La sélection d’une compétence amène progressivement au détail, en respectant la préférence de réduction des animations.

Vérifications : dix tests réussis ; compilation TypeScript et Vite réussie ; éditeur et dessin affichés dans le navigateur. La sauvegarde distante et le rechargement après application restent à vérifier avec un compte de test. Aucun changement de personnage n’a été appliqué par l’agent au compte connecté.

Pour essayer : Compétences > Personnaliser mon personnage > changer les options, vérifier l’aperçu > Appliquer pour garder son choix ou Annuler. Après application, attendre la sauvegarde puis recharger pour vérifier la conservation. Ne pas tester sur un autre appareil en simultané, la gestion existante des données ne résout pas les conflits concurrents.

Publication : modifications uniquement locales. Après validation, envoyer sur la branche feature/skills-xp-v1-9 et vérifier l’aperçu de la PR #11. Fusion et production uniquement sur accord explicite.
