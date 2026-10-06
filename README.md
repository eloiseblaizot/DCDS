# DCDS — le jeu des conteneurs

Jeu web multijoueur (PC et mobile) inspiré du concept de l'émission « Des Containers et Des Surprises » de Lucas « Squeezie » Hauchard et Théodore Bonnet. Tous les droits sur l'émission sont réservés à UNFOLD PRODUCTION. Ce projet n'est ni affilié ni approuvé par ses ayants droit.

> Choisis ton conteneur. Bluffe. Échange. Repars avec le meilleur lot… ou avec un cafard dans un bocal.

- De 4 à 12 joueurs. Chaque joueur est décideur une fois par partie.
- Webcam sur un « écran géant » pendant les découvertes, micros optionnels (pratique si vous êtes déjà en vocal Discord ou en stream).
- 5 jokers en nuages de pâte à modeler : Confiance, Switch, Espion, Vol de conteneur, Conteneur d'urgence.
- Parties privées (code ou lien) ou publiques, en invité ou avec Discord.
- Catalogue d'environ 70 lots fictifs, et/ou lots personnalisés par l'host.

**Stack** : Next.js 16 sur Vercel · Supabase (connexion, base, temps réel) · LiveKit Cloud (vidéo et audio).

## Essayer en 1 minute (sans rien configurer)

```bash
npm install
npm run dev
```

Puis ouvre <http://localhost:3000/demo> : une partie complète contre des bots, 100 % dans le navigateur.

## Documentation

| | |
| --- | --- |
| ✅ [Ce qu'il reste à faire](docs/a-faire.md) | Checklist avant et après la mise en ligne |
| 🚀 [Mise en ligne](docs/deploiement.md) | Supabase, Discord, LiveKit, Vercel, sous-domaine `dcds.games.blzt.fr` |
| 📖 [Règles et moteur](docs/regles-et-moteur.md) | Les règles exactes, phase par phase |
| 🎨 [Personnalisation](docs/personnalisation.md) | Nom, lots, couleurs, textes légaux, décisions de jeu |
| 🧱 [Architecture](docs/architecture.md) | Organisation du code, synchro temps réel, modèle de données |
| 🔒 [Sécurité](docs/securite.md) | Qui voit quoi, pourquoi on ne peut pas tricher |
| 🔌 [API](docs/api.md) | Référence des routes |
| 🛠️ [Développement](docs/developpement.md) | Mode démo, scripts, tests, conventions |

## Scripts

```bash
npm run dev        # serveur de développement
npm test           # tests du moteur de jeu
npm run test:sql   # tests de la migration SQL et de la sécurité (Postgres embarqué)
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run build      # build de production
```

## Variables d'environnement

Voir [`.env.example`](.env.example) et [docs/deploiement.md](docs/deploiement.md). Sans variables, seul le mode démo fonctionne.
