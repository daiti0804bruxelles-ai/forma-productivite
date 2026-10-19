# Forma V1 — Mobile-first sombre premium

## Lancer localement
1. Installer Node.js LTS et Visual Studio Code.
2. Ouvrir ce dossier dans VS Code.
3. Dans Terminal → New Terminal : `npm install` puis `npm run dev`.
4. Ouvrir l’adresse indiquée (souvent http://localhost:5173).

## Publier sur iPhone
1. Créer un dépôt GitHub et importer les fichiers du projet (pas node_modules).
2. Dans Vercel : Add New → Project → Import Git Repository. Framework Vite, Build Command `npm run build`, Output Directory `dist`.
3. Ouvrir l’URL HTTPS Vercel dans Safari sur iPhone → Partager → Sur l’écran d’accueil.

## Attention
Données enregistrées dans localStorage, propres au navigateur et à l’appareil. Pas de synchronisation, sauvegarde cloud ni notifications pour cette V1. Le manifeste permet l’ajout à l’écran d’accueil ; aucun service worker hors ligne n’est encore inclus.
