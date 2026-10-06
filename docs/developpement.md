# Développement

## Prérequis

- Node.js 20 ou plus (développé avec Node 24) et npm.
- Optionnel : un projet Supabase et un projet LiveKit pour tester le mode en ligne (voir [deploiement.md](deploiement.md)).

## Lancer le projet

```bash
npm install
npm run dev
```

- <http://localhost:3000/demo> : **mode solo**, fonctionne sans aucune configuration.
- Pour le mode en ligne : `cp .env.example .env.local`, remplis les valeurs, puis relance `npm run dev`. Pense à ajouter `http://localhost:3000/auth/callback` dans les *Redirect URLs* de Supabase.

Pour tester à plusieurs en local, ouvre plusieurs navigateurs (ou fenêtres de navigation privée) : chacun aura son propre compte invité.

## Le mode démo

La partie tourne entièrement dans le navigateur (`useDemoRoom`). Les autres joueurs sont des bots (`src/lib/game/bots.ts`) qui jouent avec des délais « humains » et bluffent parfois dans le chat des participants.

Le panneau « 🧪 Démo » (en bas à gauche) permet de :
- **jouer en tant que** n'importe quel joueur, par exemple le décideur pour tester les jokers ;
- régler le **nombre de bots** (dans le salon d'attente) ;
- **mettre les bots en pause** ;
- activer **ta webcam** en local, pour voir l'écran géant avec une vraie image.

L'host du mode démo a accès à « Forcer la suite » (menu ☰), pratique pour avancer vite jusqu'à la fin de partie.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm test` | Tests du moteur de jeu (Vitest) : règles, jokers, timeout, parties complètes simulées de 3 à 12 joueurs |
| `npm run test:sql` | Exécute la migration sur un Postgres embarqué (PGlite) et vérifie les fonctions SQL et la RLS |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint (dont les règles des hooks React) |
| `npm run build` | Build de production, identique à celui de Vercel |

Avant de pousser : `npm run lint && npm run typecheck && npm test && npm run test:sql && npm run build`.

## Conventions

- **Langue** : l'interface, les messages d'erreur et les commentaires sont en français. Le code (noms de variables, de fonctions) est en anglais.
- **Les règles ne vivent que dans le moteur** (`src/lib/game/engine.ts`). L'interface se contente d'afficher et d'envoyer des actions ; le serveur rejoue et valide tout. Toute nouvelle règle passe par le moteur, accompagnée d'un test dans `engine.test.ts`.
- **Le secret ne sort jamais du serveur.** Une information privée doit passer par `KnowledgeEntry` (table `player_knowledge`), jamais par `GameState`.
- **Schéma SQL** : toute modification se fait dans un **nouveau** fichier `supabase/migrations/000X_….sql` (ne pas réécrire `0001`, déjà appliqué en production), avec un test dans `supabase/tests/`.
- **Next.js 16** : lire la doc embarquée dans `node_modules/next/dist/docs/` avant d'utiliser une API Next (voir `AGENTS.md`). En particulier, les hooks qui lisent l'URL doivent être sous `<Suspense>`.
- **Styles** : utilitaires Tailwind, plus les classes « clay » de `globals.css`. Les nouvelles classes maison vont dans `@layer components`.
