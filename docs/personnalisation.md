# Personnaliser le jeu

Ce qu'on peut changer, et dans quel fichier. Après une modification, lance `npm test` : si un test casse, c'est que la règle du jeu a changé et que le test doit suivre.

## Changer le nom du jeu

« DCDS » est un nom provisoire. Il apparaît dans :

| Fichier | Quoi |
| --- | --- |
| `src/components/art/Logo.tsx` | Les lettres du logo en pâte (`LETTERS` : lettre, couleur, inclinaison) |
| `src/app/layout.tsx` | Titre et description de l'onglet (`metadata`) |
| `src/app/demo/page.tsx`, `src/app/regles/page.tsx`, `src/app/mentions-legales/page.tsx` | Titres de page |
| `src/lib/legal.ts` | Début de la mention légale (« DCDS est un jeu de fans… ») |
| `src/components/lobby/Lobby.tsx` | Texte du partage (« Viens jouer à DCDS ») |
| `src/app/icon.svg` | Icône de l'onglet |
| `README.md`, `package.json` (`name`) | Documentation |

Astuce : `grep -rn "DCDS" src` liste toutes les occurrences.

## Textes légaux

- `src/lib/legal.ts` : titre de l'émission, créateurs, ayant droit. La mention du pied de page est construite à partir de ces trois constantes.
- `src/lib/legal.ts` (`PUBLISHER`) : éditrice, adresse et e-mail de contact, affichés sur la page mentions légales.
- `src/app/mentions-legales/page.tsx` : le reste de la page (hébergeur, données personnelles, lots).

## Les lots

Fichier `src/lib/game/lots.ts` :

- **Ajouter ou retirer un lot** : dans `rows`, une ligne par lot `[identifiant, emoji, nom, valeur en €]`, rangée sous sa rareté. L'identifiant doit être unique.
- **Raretés** (`TIERS`) : libellé, couleur du badge, couleur du texte, valeur par défaut des lots créés par l'host.
- **Fréquence des raretés** (`TIER_WEIGHTS`) : probabilité de tirer chaque rareté (la somme doit faire 1).
- **Garanties par manche** : début de `drawLots` (au moins un nul et au moins un top/légendaire).

## Couleurs et style

- **Conteneurs** : `CONTAINER_COLORS` dans `src/lib/game/settings.ts`. Le conteneur n°1 prend la 1re couleur, et ainsi de suite (12 couleurs pour 12 joueurs).
- **Palette générale** (ciel, couleurs « clay ») : bloc `@theme` en haut de `src/app/globals.css`.
- **Boutons, cartes, champs** en pâte : classes `.clay`, `.clay-btn`, `.clay-input`… dans `src/app/globals.css` (bloc `@layer components`). Les variantes de bouton sont `.yellow`, `.green`, `.pink`, `.orange`, `.red`, `.light`, `.discord`, plus les tailles `.sm` et `.lg`.
- **Police** : Fredoka, chargée dans `src/app/layout.tsx`.
- **Nuages-jokers** : dessins SVG dans `src/components/art/ClayCloud.tsx`, un sous-composant par accessoire (casquette, flèches, loupe, couronne, gyrophare).
- **Conteneur** : `src/components/art/ContainerArt.tsx`.
- **Nuages du ciel** (position, taille, vitesse) : `CLOUDS` dans `src/components/art/Sky.tsx`.

## Jokers et réglages par défaut

Fichier `src/lib/game/settings.ts` :

- `JOKERS` : nom et description de chaque joker (affichés dans le jeu, l'accueil et les règles).
- `DEFAULT_SETTINGS` : réglages d'un nouveau salon (8 joueurs max, vidéo et micros activés, tous les jokers, temps illimité, catalogue).
- `MIN_PLAYERS` (3), `MAX_PLAYERS` (12), `ROUND_LIMITS` (choix de durée de manche).

## Revenir sur une décision de jeu

| Si tu veux… | Où intervenir |
| --- | --- |
| Que le décideur puisse lire le chat des participants | `src/app/api/rooms/[code]/chat/route.ts` (calcul de `audience`) et `src/components/chat/ChatPanel.tsx` |
| Un autre système de score (points par rang plutôt que valeur en €) | Fonction `computeResults` de `src/lib/game/engine.ts` |
| Un autre comportement à la fin du chrono | Cas `"timeout"` de `src/lib/game/engine.ts` |
| Que le vol ne termine pas la manche | Cas `"steal"` de `src/lib/game/engine.ts` : remplacer l'appel à `finishRound` |
| Plus d'une utilisation par joker | `guardJoker` et `jokersUsed` dans `src/lib/game/engine.ts` |
| Un autre ordre de reveal | Fonction `finishRound` de `src/lib/game/engine.ts` |
| Changer les phrases de bluff des bots (mode démo) | `BLUFFS` dans `src/lib/game/bots.ts` |
