# Consignes pour les agents Forma

- Lire `docs/FORMA-VISION.md` avant toute intervention : c'est la référence officielle. Lire aussi `docs/ROADMAP.md` pour l'état réel et les limites connues.
- Préserver la stack React/TypeScript/Vite/Tailwind/Supabase et les fonctionnalités existantes. Ne pas reconstruire l'application.
- Avant de coder : inspecter la branche, les derniers commits, le contenu des fichiers et les modifications locales. Ne jamais écraser ou supprimer un travail non sauvegardé.
- Expliquer simplement en français les changements, les fichiers concernés, les tests, les limites et les étapes de publication. Distinguer code présent, tests réussis et fonctionnement vérifié à distance.
- Pour cette phase : stabilisation XP V1.9 uniquement. Pas d'intégration 3D ni de refonte globale sans validation de l'étape correspondante.
- Respecter les six catégories, 19 compétences et les règles XP de la vision. Aucun niveau général. Les niveaux acquis sont conservés.
- Une illustration SVG n'est pas un avatar 3D final. Les évolutions physiques sont futures.
- Aucune clé secrète dans Git. Les données utilisateur sont privées. Ne pas modifier les données ou politiques de production sans autorisation explicite. Ne pas tester des écritures avec le compte réel.
- Ne pas fusionner la PR #11 ni déployer en production sans accord explicite. Signaler précisément ce qui reste local et ce qui a réellement été envoyé.
- Vérifications : `npm test`, `npm run build`, `git diff --check`. Ajouter des tests des cas limites modifiés. Une compilation réussie ne valide pas les politiques RLS ni les parcours multi-appareils.
