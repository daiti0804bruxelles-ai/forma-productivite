# Validation manuelle — Compétences et XP

> À réaliser sur le déploiement **Preview Vercel** de la PR #12 avec un compte de test. Ne pas utiliser les données personnelles de production. Les tests automatisés ne remplacent pas ces vérifications.

## Préparation
1. Ouvrir le déploiement Preview Vercel associé à la branche `feature/competences-manuelles-chatgpt`.
2. Se connecter avec un compte de test. Exporter une sauvegarde JSON avant tout essai.
3. Vérifier que la page « Compétences » contient 6 domaines et 19 compétences, sans niveau général.

## Parcours à vérifier
- [ ] Créer une habitude avec 2 compétences, enregistrer, modifier : les 2 compétences restent sélectionnées.
- [ ] Cocher l’habitude : chaque compétence reçoit +10 XP, chaque domaine concerné reçoit 20 % du gain de ses compétences.
- [ ] Décocher puis recocher : pas de second gain XP pour la même date.
- [ ] Créer une tâche normale avec 1 compétence : +10 XP à la première validation, pas de double gain au recochage.
- [ ] Créer une tâche récurrente : +3 XP par date de réalisation distincte.
- [ ] Créer un objectif modéré, ambitieux, exceptionnel et l’atteindre par mise à jour de progression : respectivement +100, +300, +750 XP par compétence.
- [ ] Modifier uniquement la cible d’un objectif : aucun XP de réussite attribué.
- [ ] Vérifier les niveaux des compétences et des domaines après les gains, y compris le seuil de 100 XP.
- [ ] Exporter une sauvegarde puis la restaurer : les compétences et le journal XP sont conservés.
- [ ] Tester l’affichage et la navigation sur ordinateur et sur iPhone.
- [ ] Après un changement de journée, vérifier les pénalités de retard et l’absence de pénalité pour une réalisation déjà enregistrée.
- [ ] Vérifier qu’une pénalité n’abaisse pas un niveau déjà acquis.

## Publication
- [ ] Tests automatiques GitHub Actions réussis sur le dernier commit.
- [ ] Preview Vercel réussie sur le dernier commit.
- [ ] Parcours manuels ci-dessus validés et anomalies corrigées.
- [ ] Approbation explicite avant fusion de la PR #12 dans `main`.

**Important :** aucune validation manuelle n’est revendiquée tant que ces cases ne sont pas effectivement testées.
