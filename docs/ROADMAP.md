# Forma — Feuille de route et état réel

Référence officielle : [FORMA-VISION.md](FORMA-VISION.md). Stabilisation vérifiée le 1 novembre 2026 ; contrôles avant sauvegarde GitHub renouvelés le 3 novembre 2026 (Asia/Singapore).

## État du code et des sauvegardes

- Dépôt : daiti0804bruxelles-ai/forma-productivite.
- Branche locale : feature/skills-xp-v1-9, dernier commit local e257378.
- PR #11 : brouillon non fusionné lors du dernier contrôle.
- La stabilisation locale est validée. Le 3 novembre 2026, l'utilisateur a autorisé sa sauvegarde en commits sur la branche distante existante, avec mise à jour de la PR #11. Cette sauvegarde ne valide pas les parcours réels ni une publication en production.
- Une copie complète du code source avant stabilisation est dans le dossier parent : local-backups/v1.9-before-stabilization-20261101-171856. Elle inclut les fichiers non suivis et un patch ; elle exclut les dépendances, les fichiers ignorés et la configuration privée .env.local.
- L'aperçu Vite connecté à la base réelle a été arrêté pour cette phase. Aucun test d'écriture sur la production, aucune modification de politique, aucune migration distante.

## Priorité 1 — Stabilisation V1.9

### Réalisé localement et vérifié par tests

- Cible réelle des objectifs : 99,5 % ne vaut plus 100 %. Fonctionne pour les objectifs cumulatifs et les mesures ascendantes/descendantes.
- Récompense unique par objectif ; annulation après changement de difficulté possible. Le barème et les compétences du premier gain sont conservés lors des annulations/revalidations : pas de nouvelle récompense en augmentant la difficulté après réussite.
- Le rapprochement au chargement peut annuler une ancienne récompense prématurée, sans retirer les niveaux acquis. Aucun gain rétroactif pour les anciens objectifs déjà complets sans événement XP.
- Identité stable des récompenses de tâches ordinaires malgré le changement de date ; les occurrences répétitives restent quotidiennes. Un report manuel garde l'identité de l'occurrence reportée.
- Migration locale idempotente des anciennes récompenses ordinaires datées, et séparation des pénalités quotidiennes des récompenses. Les niveaux existants sont conservés, même si le total XP corrige un ancien doublon.
- Cases cochées/décochées sans cumul de récompenses. Les compétences d'une occurrence d'habitude restent figées, puis peuvent changer pour le jour suivant.
- Pénalités : habitudes -5 ; tâches ordinaires -5/jour ; répétitives -1,5/jour. Report volontaire avant échéance sans pénalité ; un report tardif n'efface pas la pénalité déjà due. Calcul avant tout report automatique.
- Validation complète des événements, actions, statuts, compétences, dates, doublons, planchers de niveau et des données utilisateur au chargement Supabase et à l'import. Données invalides : blocage explicite sans remplacement par une démonstration ni écrasement distant.
- Sauvegarde conditionnelle sur user_id + updated_at ; création par insert plutôt qu'upsert aveugle. Écritures d'un même compte sérialisées. Conflit ou erreur : arrêt des écritures, message visible, copie de récupération locale par compte, export disponible dans les sauvegardes.
- Écran de chargement bloquant : les données d'un ancien compte ne sont plus montrées pendant le chargement d'un nouveau.

### Résultats et portée

- 35 tests automatisés réussis : XP, objectifs, habitudes, tâches, migration, dates bissextiles, validation, sauvegardes et conflits.
- Les tests de persistance utilisent le vrai SDK Supabase avec un faux serveur HTTP en mémoire. Ils n'écrivent pas sur Supabase et ne constituent pas un test des RLS réelles.
- npm run build : TypeScript et Vite réussis. Avertissement non bloquant : bundle JavaScript supérieur à 500 kB avant gzip.
- Aucun test navigateur complet de cette nouvelle persistance avec de vrais comptes ni test iPhone physique effectué.

### RLS vérifiée en lecture seule dans le tableau de bord

Projet Supabase existant, table public.user_data. La configuration propre à l'environnement reste hors Git.

- La RLS est activée (bouton « Disable RLS » visible).
- Une politique « Users manage their own data », permissive, ALL, pour authenticated.
- USING : ((SELECT auth.uid() AS uid) = user_id).
- WITH CHECK : ((SELECT auth.uid() AS uid) = user_id).
- Aucun clic sur Save policy ; aucune politique modifiée.
- Le tableau de bord signale aussi « API DISABLED » et des droits Data API personnalisés. Les grants effectifs et leur effet sur les utilisateurs authentifiés restent à vérifier. Ne pas ouvrir les droits sans diagnostic.
- Les règles des espaces partagés sont présentes dans le dépôt et le tableau de bord ; leurs parcours et droits effectifs n'ont pas été retestés ici.
- Un audit SQL strictement en lecture seule est préparé dans supabase/audits/v1_9_read_only.sql ; il n'a pas été exécuté à distance.

### À vérifier avant validation complète de la V1.9

1. Sur un projet Supabase de test : contrôler grants, unicité de user_id, type de updated_at et éventuels triggers avec l'audit SQL.
2. Tester deux comptes : lecture/écriture de sa propre ligne ; refus des données et modifications de l'autre compte et du rôle anonyme.
3. Tester deux sessions simultanées : une sauvegarde doit réussir, l'autre signaler le conflit ; exporter la récupération et vérifier son import.
4. Tester déconnexion/reconnexion, sauvegarde d'avatar et restauration JSON sur cette base de test.
5. Vérifier les cas de suppression/recréation et les anciennes données atypiques avant toute migration réelle.

Limites restantes :

- Le contrôle de conflit protège les clients utilisant cette version. L'application officielle existante peut encore écrire sans contrôle de version ; une protection serveur et un déploiement coordonné seront à étudier avant généralisation.
- Pas de fusion automatique des modifications concurrentes. Le choix utilisateur reste nécessaire après export.
- Des écritures en attente peuvent être perdues à la fermeture avant la confirmation de sauvegarde ; l'indicateur d'état doit être surveillé. La copie de récupération intervient sur erreur/conflit, pas comme sauvegarde hors ligne permanente.
- Le journal est validé côté client ; il ne constitue pas un calcul XP autoritaire côté serveur.
- Les habitudes hebdomadaires ne sont pas représentées dans le modèle actuel ; ne pas annoncer cette fonctionnalité comme terminée. Le calcul des pénalités actuel concerne les habitudes quotidiennes.
- Notifications, statistiques avancées et fonctionnement hors ligne complet ne sont pas validés.

## Priorité 2 — Finaliser les compétences (après stabilisation)

Présent : six catégories, 19 compétences, niveaux distincts, jauges segmentées, groupes repliables, détail et historique, interface responsive sombre bleu/violet.

À finaliser : disposition 40 % / 60 % sur ordinateur, visibilité continue du personnage, détails et animations de gain d'XP, tests ergonomiques sur téléphone.

## Priorité 3 — Valider puis intégrer la vraie 3D

Le personnage actuel reste un SVG 2D personnalisable. Aucun moteur ni modèle 3D ajouté pendant la stabilisation.

Étape suivante demandée : valider une base masculine et féminine low-poly conforme aux références, avec licence, squelette, vêtements modulaires et possibilités d'évolution vérifiés. Puis intégrer le modèle GLB dans un module isolé, rotation lente à 360°, manipulation souris/doigt et repos discret. Choix envisagé : Three.js + React Three Fiber + Drei, à confirmer à cette étape.

## Priorité 4 — Personnalisation 3D de base

Réutiliser les préférences et la sauvegarde par utilisateur ; versionner et migrer leur format pour les identifiants de modèles et d'accessoires. Les paramètres actuels de silhouette ne constituent pas deux modèles 3D masculins/féminins.

## Priorité 5 — Préparer les évolutions physiques

Étudier morph targets, squelette compatible, vêtements et animations modulaires. Aucun développement immédiat des transformations.

## Priorité 6 — Refonte globale

Ultérieure : harmoniser tout Forma après validation des modules fonctionnels. Conserver tâches, habitudes, calendrier, objectifs personnels et partagés.

## Tester et publier

1. Utiliser Node.js 22.18+ pour npm test ; la copie locale disponible est ../.tools/node-v26.13.0-win-x64.
2. npm ci, npm test, npm run build et git diff --check.
3. Pour les essais interactifs, configurer .env.local avec un projet Supabase de test, jamais une clé secret/service_role. Ne pas relancer l'aperçu sur la base réelle sans autorisation d'écriture.
4. Après les vérifications distantes : examiner le diff, enregistrer les commits et envoyer sur feature/skills-xp-v1-9 si demandé. Vérifier l'aperçu de la PR #11.
5. Aucune fusion dans main ni mise en production sans accord explicite.

## Fichiers de cette stabilisation

Créés : AGENTS.md ; docs/ROADMAP.md ; src/appData.ts ; src/habitXp.ts ; src/taskXp.ts ; src/snapshotWriter.ts ; src/userDataStore.ts ; supabase/audits/v1_9_read_only.sql ; tests/goals.test.ts ; tests/habitXp.test.ts ; tests/taskXp.test.ts ; tests/validation.test.ts ; tests/persistence.test.ts.

Modifiés : src/App.tsx ; src/goalModel.ts ; src/goalXp.ts ; src/skillModel.ts ; src/dailyXp.ts ; REPRISE-V1.9.md (notice donnant priorité à cette feuille de route).

Les autres modifications locales préexistantes sont conservées. Les fichiers de la vision, de la page Compétences, du personnage, de ses styles et de son éditeur ont été comparés à la copie de sécurité et sont identiques. À l'issue de la stabilisation du 1 novembre, aucun commit ni push n'avait encore été effectué.

## Sauvegarde GitHub du 3 novembre 2026

- Branche vérifiée : feature/skills-xp-v1-9. 30 fichiers candidats examinés, nouveaux fichiers inclus.
- 35 tests réussis lors du contrôle avant commit. La compilation complète et git diff --check sont également vérifiés avant envoi.
- Contrôle du contenu et des signatures de secrets : aucun secret ni donnée personnelle identifié parmi les fichiers candidats. Le seul fichier .env inclus est .env.example, dont les valeurs sont vides.
- .env.local, dist, node_modules et les copies de sécurité du dossier parent ne sont pas inclus. Les tests ne contiennent que des données fictives.
- L'identifiant du projet Supabase a été retiré de cette documentation avant envoi, par minimisation de la configuration publiée.
- Les nouveaux commits utilisent une adresse GitHub noreply. Ni l'adresse personnelle de l'auteur ni des identifiants d'authentification ne doivent être ajoutés.
- Préparation en deux commits : code/tests de la V1.9, puis vision/consignes/feuille de route. Vérifier le résultat du push et la présence des deux commits sur GitHub ; ne pas assimiler un commit local à un envoi réussi.
- Pas de fusion de PR, de modification de production ni d'intégration 3D dans cette sauvegarde.
