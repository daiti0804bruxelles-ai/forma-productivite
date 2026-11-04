# FORMA — Direction artistique officielle des personnages (V1)

## Référence approuvée
Le propriétaire du produit a validé le **deuxième portrait généré**, une planche de personnage aventurier **cartoon 3D / jeu vidéo** avec personnage en pied, gros plan visage, vues de face/profil/dos, palette ardoise/orange/crème/olive/brun. **Ne pas revenir au rendu réaliste, sérieux ou au SVG actuel.**

La référence visuelle validée est une image de la conversation ChatGPT du 4 novembre 2026. **Important : cette image n'est pas encore stockée dans le dépôt.** Elle doit être importée dans un répertoire d'assets autorisés avant toute intégration réelle. Un texte seul ne garantit pas le même rendu.

## Invariants de DA (tous les utilisateurs)
- Univers : aventure/exploration optimiste, accessible, stylisé.
- Rendu : personnage de jeu vidéo cartoon 3D stylisé (affiché en 2D au MVP), contours propres, formes simplifiées, textures peintes/lisses, lumière lumineuse et chaleureuse.
- Proportions : tête légèrement agrandie, visage expressif, corps entier visible, silhouettes cohérentes entre utilisateurs.
- Costume de départ : explorateur contemporain, veste ou haut technique, foulard/col, sac, ceinture/pochettes, pantalon cargo, bottes. Détails ajustables sans rompre l'identité visuelle.
- Palette de base : ardoise foncée, orange chaud, crème, olive et brun. L'équipement débloqué doit conserver cette cohérence.
- Cadrage canonique : personnage debout en pied, trois-quarts face, fond sobre/transparent pour intégration dans l'interface. Optionnel : portrait rapproché et turnaround.
- Interdits : photoréalisme, peau photographique, rendu trop sérieux, rendu anime 2D, proportions chibi, personnages au style disparate.

## Fidélité individuelle
À partir d'une photo fournie volontairement, préserver les caractéristiques visibles : coiffure, texture et couleur des cheveux, sourcils, forme générale du visage, yeux, nez, bouche, barbe/moustache, teint. **Ne pas reproduire le visage à l'identique au prix de casser le style cartoon.**

## Processus recommandé (pas encore implémenté)
1. Consentement explicite et import d'une photo lors de la création du personnage (facultatif).
2. Fonction serveur sécurisée appelant un modèle d'image avec **l'image de DA approuvée en référence** et la photo utilisateur.
3. Génération d'un portrait canonique, vérification de cohérence visuelle et de ressemblance, aperçu et option de régénération.
4. Validation de l'utilisateur, stockage privé dans Supabase Storage et enregistrement du chemin dans les données du compte.
5. Suppression de la photo originale après génération si sa conservation n'est pas nécessaire et si l'utilisateur le souhaite.
6. Gestion des évolutions de vêtements via des assets ou variantes cohérents ; ne pas regénérer le personnage à chaque gain d'XP.

## Limites / critères de validation
- Une image de référence et un prompt stable **réduisent la dérive**, mais ne garantissent pas une identité stylistique parfaite entre générations.
- Pour une uniformité plus forte à grande échelle : bibliothèque de modèles et vêtements prédéfinis, composition de personnages, ou pipeline d'entraînement/style adapté sous réserve de droits et de coûts.
- **Ne pas brancher l'API payante ni publier** sans approbation de l'utilisateur sur le coût, le stockage, la confidentialité et la DA.
- Test de validation : au moins 3 photos de personnes différentes, résultats comparés côte à côte, contrôle des proportions, des vêtements, des couleurs, du cadrage et de la ressemblance.
- La vraie 3D interactive est une phase ultérieure ; l'image 2D initiale n'est pas un modèle 3D rotatif.
