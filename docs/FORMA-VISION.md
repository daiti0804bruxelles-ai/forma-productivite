# FORMA — Vision officielle du projet

Tu es mon développeur principal et mon architecte logiciel pour Forma.

Je souhaite que tu comprennes parfaitement ma vision avant de continuer le développement. Je ne veux pas que tu reconstruises mon application à partir de zéro ou que tu remplaces mes décisions par tes propres préférences.

Ce document doit devenir la référence principale du projet.

## 1. Le concept

Forma est une application de productivité personnelle qui transforme les efforts quotidiens en progression visible.

Elle combine :
- Un gestionnaire d'habitudes.
- Un gestionnaire de tâches.
- Un calendrier interactif.
- Des objectifs mesurables.
- Un système de compétences, d'XP et de niveaux.
- Un personnage 3D personnalisable qui représente l'utilisateur.

Je veux une application que l'on ouvre tous les jours pour organiser sa vie, progresser et voir concrètement son évolution.

L'inspiration vient des RPG et des jeux de progression, mais Forma doit rester une application de productivité simple et rapide.

La gamification ne doit jamais rendre les tâches quotidiennes plus compliquées.

## 2. Ce qui existe déjà

Le projet Forma possède du code et des fonctionnalités déjà développés.

Stack :
- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- GitHub
- Vercel

Dépôt GitHub :
`daiti0804bruxelles-ai/forma-productivite`

Branche V1.9 :
`feature/skills-xp-v1-9`

Pull Request :
`#11`

Application officielle :
`https://forma-productivite.vercel.app/`

Fonctionnalités existantes à préserver :
- Authentification individuelle.
- Habitudes quotidiennes et hebdomadaires.
- Tâches et tâches répétitives.
- Calendrier de planification.
- Objectifs personnels mesurables.
- Objectifs partagés.
- Sauvegarde des données.
- Développement du système XP et des compétences.

Avant toute intervention, vérifie réellement l'état du code, les changements locaux et les commits existants.

Ne suppose pas qu'une fonctionnalité fonctionne uniquement parce qu'elle est présente dans le code.

## 3. Direction artistique générale

Je veux une application moderne, élégante et immersive, sans être surchargée.

Préférences :
- Interface sombre et soignée.
- Typographie claire.
- Espacements cohérents.
- Animations fluides et discrètes.
- Éléments interactifs faciles à comprendre.
- Bonne ergonomie sur ordinateur et téléphone.
- Sensation d'utiliser un produit premium.

La refonte visuelle globale doit rester une étape ultérieure.

Pour l'instant, concentre-toi sur les compétences et le personnage.

## 4. Personnage 3D — Priorité visuelle

Je joins deux images de référence : un personnage masculin et un personnage féminin.

Ces images définissent le style recherché.

Je veux :
- Un véritable personnage 3D, visible de la tête aux pieds.
- Un style low-poly stylisé de qualité.
- Des proportions humaines légèrement stylisées.
- Un visage expressif et travaillé.
- Des vêtements détaillés.
- Un rendu cohérent entre les personnages masculins et féminins.
- Une apparence RPG contemporaine, sans tomber dans le cartoon enfantin.

Le personnage doit tourner automatiquement sur lui-même à 360°, très lentement.

L'utilisateur doit également pouvoir :
- Faire pivoter le personnage à la souris.
- Le faire pivoter au doigt sur téléphone.
- Observer les vêtements et accessoires sous différents angles.

Je veux une animation subtile qui donne vie au personnage, sans mouvement excessif.

Le personnage actuellement visible dans Forma est provisoire. Il ne correspond pas encore au niveau de qualité souhaité.

**Attention : une image fixe, un assemblage de formes CSS ou une fausse représentation 3D ne constitue pas le résultat final attendu.**

Il faut utiliser un véritable modèle 3D.

## 5. Personnalisation du personnage

Je veux progressivement permettre de modifier :
- La base masculine ou féminine.
- La coiffure.
- La couleur des cheveux.
- La couleur de peau.
- Les vêtements.
- Les couleurs des vêtements.
- Les accessoires.
- Certaines caractéristiques physiques.

Chaque utilisateur doit posséder son propre personnage, sauvegardé dans ses données personnelles.

Ne développe pas immédiatement un éditeur extrêmement complexe.

Commence avec un véritable avatar 3D, quelques personnalisations fonctionnelles et une architecture évolutive.

## 6. Page Compétences — Disposition

Sur ordinateur, je veux deux zones principales.

### Partie gauche — Environ 40 %

Un grand personnage 3D.

Le personnage doit rester visible pendant que je consulte mes compétences.

Il doit tourner lentement sur lui-même et pouvoir être manipulé manuellement.

La présentation doit être immersive, avec un environnement visuel sobre qui met le personnage en valeur.

### Partie droite — Environ 60 %

Le système complet de compétences.

Je veux une présentation inspirée de la progression des compétences dans Project Zomboid, mais avec une identité visuelle propre à Forma.

Caractéristiques :
- Six catégories principales.
- Des sous-compétences.
- Des niveaux clairement visibles.
- Des jauges de progression élégantes.
- Des catégories dépliables.
- Des interactions fluides.
- Des détails supplémentaires lorsqu'on sélectionne une compétence.
- Des animations de gain d'XP discrètes.

Je veux une interface plus moderne, plus simple et moins dense que Project Zomboid.

Sur mobile, adapte la disposition de manière ergonomique.

## 7. Les six catégories et 19 compétences

### Apparence & Physique
- Esthétique & Soins
- Musculation
- Cardio & Endurance

### Santé & Équilibre
- Nutrition
- Sommeil & Récupération
- Bien-être mental

### Connaissances
- Lecture
- Apprentissage
- Compétences pratiques

### Ambition & Finances
- Entrepreneuriat
- Finances personnelles
- Investissement

### Discipline & Maîtrise
- Régularité
- Organisation
- Concentration

### Relations & Épanouissement
- Couple & Relations
- Famille & Vie sociale
- Créativité
- Loisirs & Découvertes

Il n'y a pas de niveau général.

Chaque sous-compétence possède son propre niveau. Chaque catégorie principale progresse également, plus lentement.

## 8. Système XP

Règles à conserver :

Habitudes :
- Validation : +10 XP par compétence sélectionnée.
- Habitude manquée : −5 XP.

Tâches :
- Tâche classique terminée : +10 XP.
- Tâche répétitive terminée : +3 XP.
- Tâche classique en retard : −5 XP par jour.
- Tâche répétitive en retard : −1,5 XP par jour.
- Report volontaire avant échéance : aucune pénalité.

Objectifs :
- Modéré : +100 XP.
- Ambitieux : +300 XP.
- Exceptionnel : +750 XP.
- Récompense uniquement lorsque l'objectif atteint 100 %.
- Aucune pénalité de retard pour les objectifs.

Autres règles :
- La catégorie principale reçoit 20 % des XP de ses sous-compétences.
- Régularité est calculée automatiquement.
- Une action ne doit pas pouvoir générer plusieurs fois la même récompense.
- Une validation accidentelle doit pouvoir être annulée.
- Les niveaux déjà acquis ne peuvent jamais être perdus.
- Les pénalités réduisent la progression sans retirer les niveaux acquis.
- La courbe de progression doit être motivante, avec un niveau 100 difficile à atteindre.

Vérifie les règles déjà implémentées avant de les modifier.

## 9. Évolution future du personnage

À long terme, je veux que les compétences influencent visuellement le personnage.

Exemples :
- Musculation : musculature progressivement plus développée.
- Cardio : posture ou animations pouvant évoluer.
- Esthétique & Soins : éléments d'apparence supplémentaires.
- D'autres compétences pourront débloquer des accessoires, tenues ou animations.

Ces idées sont des orientations futures, pas des fonctionnalités à coder immédiatement.

Je veux une évolution progressive, crédible et esthétique.

Le système 3D choisi aujourd'hui doit permettre ces évolutions plus tard.

Étudie notamment les morph targets, les modèles modulaires et les animations compatibles.

Ne choisis pas une solution qui obligera à refaire entièrement le personnage dans quelques mois.

## 10. Architecture et sécurité

L'application doit rester :
- Modulaire.
- Maintenable.
- Performante.
- Responsive.
- Compatible PWA.
- Sécurisée.
- Évolutive.

Chaque utilisateur doit avoir :
- Ses propres XP.
- Ses propres niveaux.
- Son propre personnage.
- Ses propres habitudes et tâches.
- Ses propres objectifs personnels.

Les objectifs partagés doivent conserver leurs règles de partage.

Ne jamais exposer de clés secrètes.

Ne jamais modifier ou supprimer les données de production sans autorisation.

## 11. Méthode de travail obligatoire

Avant de coder :
1. Inspecte le dépôt.
2. Vérifie la branche actuelle.
3. Vérifie les changements locaux non enregistrés.
4. Identifie les fonctionnalités déjà présentes.
5. Identifie les problèmes techniques.
6. Présente un plan court et concret.

Pendant le développement :
- Conserve les composants existants quand ils sont réutilisables.
- Évite les refontes inutiles.
- Avance par étapes.
- Exécute les tests.
- Vérifie la compilation.
- Explique ce qui a réellement changé.

Ne fusionne pas dans `main` sans mon accord.

Ne déploie pas en production sans mon accord.

Ne supprime jamais des modifications locales non sauvegardées.

## 12. Ordre de développement

Priorité 1 : stabiliser le système XP V1.9.

Priorité 2 : finaliser l'interface des compétences.

Priorité 3 : intégrer un véritable personnage 3D dans le style des références.

Priorité 4 : ajouter la personnalisation de base.

Priorité 5 : préparer l'architecture pour les transformations physiques futures.

Priorité 6 : réaliser ultérieurement la refonte visuelle globale de Forma.

Ne mélange pas toutes ces étapes dans une seule refonte.

## 13. Ta première mission

Avant de poursuivre le code, analyse le projet actuel et réponds aux questions suivantes :

1. Quelles fonctionnalités sont déjà terminées et testées ?
2. Quelles fonctionnalités sont encore provisoires ?
3. Quels changements locaux n'ont pas encore été envoyés sur GitHub ?
4. Quels problèmes techniques doivent être corrigés en priorité ?
5. Comment réaliser un véritable avatar 3D correspondant aux références ?
6. Quels outils, modèles 3D et bibliothèques recommandes-tu ?
7. Comment intégrer cet avatar sans casser les fonctionnalités existantes ?
8. Quel plan progressif proposes-tu ?

Je veux d'abord ton diagnostic et ton plan.

**N'effectue pas encore de refonte ni de changement majeur sans validation.**