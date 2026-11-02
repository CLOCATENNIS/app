# Restaurer une sauvegarde de l'appli CLOCA

Les sauvegardes sont dans le Drive, dossier « Sauvegardes appli CLOCA » (jour_, semaine_, mois_…zip).
Chaque zip contient `donnees.json` (toutes les tables, les comptes, la liste des fichiers, l'historique des migrations)
et `fichiers/` (photos des annonces).

## Cas 1 : des données effacées par erreur (le plus fréquent)
Le schéma de la base est intact. On recharge seulement les tables concernées depuis `donnees.json`
(Claude le fait avec l'outil SQL de Supabase, table par table, après avoir comparé avec l'état actuel).

## Cas 2 : tout reconstruire (nouvelle base)
1. Rejouer les migrations de `donnees.json` dans l'ordre (`migrations[].statements`).
   - Ignorer `pg_net_pour_tests` si l'extension n'existe pas.
   - Les migrations qui insèrent des données de départ (`boutique_ardoise`…) se rejouent avec `set session_replication_role = replica`.
2. Lancer `python3 restaurer.py donnees.json "psql <connexion>"` : recharge tout en une transaction,
   puis vérifie le nombre de lignes de chaque table et tous les liens entre tables.
3. Remettre les photos de `fichiers/` dans le stockage Supabase (même chemin).
4. Les comptes : les adresses sont dans `comptes_auth`. Chacun se reconnecte avec son mail (code), son compte retrouve sa famille.

## Essai réalisé
- 02/11/2026 : sauvegarde jour_2026-11-02 restaurée sur une base de test séparée (Postgres 16).
  Résultat : 66 migrations rejouées (dont 4 avec les ajustements ci-dessus), 49 tables, 4 136 lignes,
  0 écart avec la sauvegarde, 74 liens entre tables vérifiés, 0 lien cassé, classement CLOC'ARENA identique à la base en service (80 joueurs).
