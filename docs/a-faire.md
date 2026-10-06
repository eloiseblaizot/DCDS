# Ce qu'il reste à faire

Coche au fur et à mesure. Les étapes détaillées sont dans [deploiement.md](deploiement.md).

## 1. Mise en ligne (obligatoire)

- [ ] **Supabase** : créer le projet (région Europe, par exemple Paris ou Francfort).
- [ ] **Supabase** : exécuter `supabase/migrations/0001_dcds.sql` dans le SQL Editor.
- [ ] **Supabase** : activer les connexions **anonymes** (joueurs invités).
- [ ] **Discord** : créer une application sur le portail développeur et récupérer le *Client ID* et le *Client Secret*.
- [ ] **Supabase** : activer le provider **Discord** avec ces identifiants.
- [ ] **Supabase** : régler *Site URL* et *Redirect URLs* sur `https://dcds.games.blzt.fr`.
- [ ] **LiveKit Cloud** : créer le projet et récupérer l'URL `wss://…`, l'API key et l'API secret.
- [ ] **Vercel** : importer le dépôt GitHub `eloiseblaizot/DCDS`.
- [ ] **Vercel** : renseigner les 6 variables d'environnement (voir `.env.example`).
- [ ] **Vercel** : ajouter le domaine `dcds.games.blzt.fr`.
- [ ] **DNS de `blzt.fr`** : créer le CNAME `dcds.games` vers la valeur donnée par Vercel.

## 2. Juridique (obligatoire avant d'ouvrir au public)

- [ ] Compléter `src/app/mentions-legales/page.tsx` : identité de l'éditeur (nom ou raison sociale, adresse) et adresse de contact. En France, c'est une obligation légale (LCEN) ; les emplacements sont marqués `[à compléter]`.
- [ ] Vérifier le titre exact de l'émission dans `src/lib/legal.ts`. Ton message disait tantôt « Conteneurs », tantôt « Containers » ; j'ai mis « Des Conteneurs et Des Surprises ».
- [ ] Vérifier les noms des créateurs (j'ai écrit « Hauchard », le vrai nom de Squeezie) et l'ayant droit `UNFOLD PRODUCTION`.
- [ ] Recommandé : demander l'accord d'UNFOLD PRODUCTION. La mention de crédit ne vaut pas autorisation d'exploiter le concept et la DA en public.

## 3. Décisions de jeu à valider

J'ai tranché ces points pour avancer. Chacun se change facilement : voir [personnalisation.md](personnalisation.md).

- [ ] **Chat « participants »** = chat secret entre participants, **invisible pour le décideur** de la manche. Le **chat global** inclut tout le monde, spectateurs compris.
- [ ] **Gagnant** : chaque lot a une valeur fictive en €. Le classement final se fait sur le butin cumulé de toutes les manches.
- [ ] **Temps écoulé** : les conteneurs pas encore choisis sont attribués au hasard, puis on passe directement au reveal.
- [ ] **Vol de conteneur** : termine la manche immédiatement : pas de séquence de réaction du joueur volé, on passe directement au reveal.
- [ ] **Minimum pour lancer** : 3 joueurs (le maximum réglable par l'host reste 4 à 12).
- [ ] **Reveal** : le décideur (ou l'host) ouvre les conteneurs un par un, participants d'abord, conteneur abandonné (urgence) ensuite, décideur en dernier.
- [ ] **Arrivée en cours de partie** : on rejoint en spectateur. Un joueur de la partie qui recharge la page retrouve sa place.

## 4. Premier test en conditions réelles

À faire avec au moins 3 appareils ou navigateurs différents, dont un téléphone.

- [ ] Créer une partie en invité, la rejoindre par le **code** puis par le **lien**.
- [ ] Se connecter avec **Discord** : on doit revenir sur la bonne page, avec son avatar.
- [ ] Vérifier les webcams et micros dans le salon, puis pendant la partie (écran géant, bande de caméras au reveal).
- [ ] Couper vidéo et micros dans les réglages : les joueurs doivent s'afficher avec leur avatar.
- [ ] Vérifier que le décideur ne voit ni le contenu des conteneurs ni le chat des participants.
- [ ] Faire cliquer 2 joueurs sur le même conteneur en même temps : un seul doit l'obtenir.
- [ ] Tester une manche limitée à 3 minutes jusqu'à la fin du chrono.
- [ ] Recharger la page en pleine partie : on doit retrouver sa place et ses infos secrètes.
- [ ] Tester « Forcer la suite » (menu ☰ de l'host) quand un joueur ne répond plus.
- [ ] Vérifier qu'une partie **publique** apparaît dans la liste de l'accueil.

## 5. Plus tard (optionnel)

- [ ] **Nom définitif** du jeu (« DCDS » est provisoire) : voir [personnalisation.md](personnalisation.md#changer-le-nom-du-jeu).
- [ ] **Anti-abus** : activer le CAPTCHA (Cloudflare Turnstile) sur Supabase pour les comptes invités, et ajouter une limite de messages sur le chat (aucune pour l'instant).
- [ ] **Nettoyage automatique** des vieux salons avec `pg_cron` (aujourd'hui il faut lancer à la main la requête de la section « Entretien » de [deploiement.md](deploiement.md#entretien)).
- [ ] **Illustrations des lots** : remplacer les emojis (rendu variable selon l'appareil) par de vraies images en pâte à modeler.
- [ ] **Sons** : jingle d'ouverture de conteneur, roulement de tambour au reveal.
- [ ] **Suivi** : brancher Vercel Analytics et un outil de suivi d'erreurs.
- [ ] **Quotas** : surveiller la consommation LiveKit et Supabase (offres gratuites) une fois le jeu partagé.
