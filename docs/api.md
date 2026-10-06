# Routes API

Toutes les routes sont dans `src/app/api/`. Elles répondent en JSON. En cas d'erreur : `{ "error": "message lisible en français" }` avec le code HTTP adapté.

**Authentification** : sauf `GET /api/rooms/public`, chaque route attend l'en-tête `Authorization: Bearer <access_token Supabase>`. Le client l'ajoute automatiquement (`api()` dans `src/lib/client/supabase.ts`).

| Code | Signification |
| --- | --- |
| 400 | Corps de requête invalide |
| 401 | Pas connecté ou session expirée |
| 403 | Pas membre du salon, pas l'host, banni, chat désactivé… |
| 404 | Salon introuvable |
| 409 | Conflit : partie déjà lancée, salon plein, trop d'actions simultanées |
| 422 | Action refusée par les règles du jeu (« Ce n'est pas ton tour », etc.) |
| 503 | Vidéo non configurée (clés LiveKit absentes) |

## `POST /api/rooms`
Crée un salon et y installe l'appelant comme host.

```json
{ "settings": { "isPublic": true } }
```
`settings` est optionnel et fusionné avec `DEFAULT_SETTINGS`. Réponse : `{ "code": "K7Q2MX" }`.

## `GET /api/rooms/public`
Parties publiques en attente ou en cours, actives depuis moins de 3 h.

```json
{ "rooms": [{ "code": "K7Q2MX", "host_name": "Alice", "players": 3, "max_players": 8, "status": "lobby", "created_at": "…" }] }
```

## `POST /api/rooms/[code]/join`
Rejoint le salon, ou met à jour son pseudo si on en est déjà membre.

```json
{ "spectator": false }
```
Réponse : `{ "roomId": "uuid", "role": "player" | "spectator" }`.

On devient **spectateur** si on le demande, si le salon est plein ou si une partie est en cours. Exception : un joueur de la partie en cours qui revient reprend sa place.

## `POST /api/rooms/[code]/leave`
Quitte le salon. Si c'était l'host, le rôle passe au joueur arrivé le plus tôt. Le dernier qui part supprime le salon.

## `POST /api/rooms/[code]/action`
Point d'entrée unique des actions. Deux familles :

### Actions de jeu : `{ "kind": "game", "action": { … } }`

| `action.type` | Champs | Qui |
| --- | --- | --- |
| `volunteer` | | Joueur pas encore décideur, en nomination |
| `draw_decider` | | Host, en nomination |
| `pick` | `containerId` | Décideur d'abord, puis participants |
| `open` | | Joueur dont c'est le tour de regarder |
| `done` | | Idem, après `open` |
| `joker_trust` | `viewerId` | Décideur |
| `joker_switch` | `a`, `b` | Décideur |
| `joker_spy` | `spyId`, `containerId` | Décideur |
| `joker_emergency` | | Décideur (1x par partie) |
| `steal` | `targetId` | Décideur (termine la manche) |
| `lock` | | Décideur |
| `reveal_next` | | Décideur ou host |
| `next_round` | | Décideur ou host |
| `skip` | | Host (« Forcer la suite ») |
| `timeout` | | N'importe qui, accepté seulement si le chrono est réellement écoulé côté serveur |

Schéma de validation : `gameActionSchema` dans `src/lib/game/actions.ts`. Règles détaillées : [regles-et-moteur.md](regles-et-moteur.md).

### Actions de salon : `{ "kind": "room", "action": { … } }`

| `action.type` | Champs | Qui |
| --- | --- | --- |
| `start` | | Host (3 joueurs minimum, pas plus que le maximum réglé) |
| `settings` | `settings` (objet complet `RoomSettings`) | Host, hors partie en cours |
| `kick` | `userId` | Host (le joueur est banni du salon) |
| `transfer_host` | `userId` | Host |
| `set_role` | `role`: `player` / `spectator` | Soi-même, en salon d'attente |
| `back_to_lobby` | | Host |

## `POST /api/rooms/[code]/chat`

```json
{ "channel": "global" | "participants", "body": "texte (1 à 500 caractères)" }
```

- `global` : nécessite le chat global activé.
- `participants` : nécessite le chat des participants activé, une partie en cours, et que l'auteur soit un participant (pas le décideur). Le message est stocké avec `audience` égale aux participants de la manche.

## `POST /api/livekit/token`

```json
{ "code": "K7Q2MX" }
```
Réponse : `{ "token": "jwt", "url": "wss://…" }`, ou `{ "token": null, "url": null }` si l'host a coupé vidéo et micros. Le jeton est valable 6 h. Il autorise la publication de la caméra et/ou du micro selon les réglages, et seulement pour les joueurs (pas les spectateurs).
