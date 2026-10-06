# Sécurité et anti-triche

Principe : **le navigateur d'un joueur ne reçoit jamais une information qu'il n'est pas censé connaître.** Même en ouvrant les outils de développement, un joueur ne peut pas lire le contenu des conteneurs.

## Qui voit quoi

| Information | Qui la reçoit |
| --- | --- |
| Contenu des conteneurs de la manche | Personne, jusqu'au reveal (stocké dans `room_secrets`) |
| Le lot que j'ai vu (découverte, Espion, Switch, Confiance) | Moi seul (`player_knowledge`, filtré par la RLS) |
| Qui a vu quel conteneur | Tout le salon (info publique, comme dans l'émission) |
| Chat global | Tout le salon, spectateurs compris |
| Chat des participants | Les participants de la manche où le message a été écrit. **Jamais le décideur de cette manche**, jamais les spectateurs |
| Lots révélés | Tout le salon, au fur et à mesure du reveal |
| Clé `service_role` Supabase, secret LiveKit | Uniquement le serveur (variables sans préfixe `NEXT_PUBLIC_`) |

## Les garde-fous

1. **RLS Postgres** (`supabase/migrations/0001_dcds.sql`)
   - `rooms`, `room_members` : lecture réservée aux membres du salon ;
   - `room_secrets` : aucune politique, et droits retirés aux rôles `anon` et `authenticated` ;
   - `player_knowledge` : `user_id = auth.uid()` ;
   - `messages` : membre du salon **et** (`audience` nulle **ou** l'utilisateur fait partie de `audience`).
2. **Aucune écriture côté client.** Les droits `insert`, `update` et `delete` sont retirés aux rôles clients. Les fonctions SQL (`commit_room`, `join_room`…) ne sont exécutables que par `service_role`.
3. **Arbitrage serveur.** Chaque action passe par `/api/rooms/[code]/action` :
   - authentification (jeton Supabase dans l'en-tête `Authorization`) ;
   - vérification de l'appartenance au salon ;
   - validation du format (zod) ;
   - application des règles par le moteur. C'est lui qui vérifie que c'est bien ton tour, que tu es bien le décideur, que le joker n'a pas déjà servi, etc.
4. **Concurrence.** Le contrôle de version de `commit_room` empêche deux actions simultanées de s'écraser.
5. **Vidéo.** Le jeton LiveKit est délivré par le serveur aux seuls membres du salon. Seuls les joueurs peuvent publier, et seulement les sources (caméra, micro) autorisées par l'host.

Ces règles sont vérifiées automatiquement par `npm run test:sql` (37 vérifications sur un Postgres embarqué).

## Données personnelles

- **Invité** : un compte Supabase anonyme, plus le pseudo choisi.
- **Discord** : identifiant, pseudo et avatar (scope `identify` uniquement).
- **Vidéo et audio** : transitent par LiveKit en direct, jamais enregistrés.
- **Chat et état des parties** : conservés jusqu'à la suppression du salon.

## Limites connues

- **Spam** : pas de limite de débit sur le chat ni sur la création de salons. Pour limiter les abus, active le CAPTCHA Supabase et ajoute une limite (par exemple dans la route `chat`).
- **Présence** : n'importe quel utilisateur connecté qui devinerait l'identifiant interne (UUID) d'un salon pourrait voir la liste des identifiants présents sur son canal de présence. Aucun contenu de jeu n'y transite. Les canaux privés de Supabase Realtime permettraient de fermer cette porte.
- **Horloge** : le compte à rebours s'affiche avec l'heure du navigateur. Si une horloge est décalée, l'affichage l'est aussi, mais c'est toujours l'heure du serveur qui fait foi.
- **Bluff** : rien n'empêche un joueur de montrer son écran en vidéo… comme dans l'émission, c'est la confiance qui joue !
