# Mise en ligne pas à pas

Compter environ 30 minutes. Les trois services ont une offre gratuite, suffisante pour démarrer.

Les noms de menus correspondent aux interfaces actuelles de Supabase, Discord, LiveKit et Vercel. Ils peuvent légèrement changer avec le temps.

## Étape 1 · Supabase

Supabase fournit la base de données, la connexion des joueurs (invités et Discord) et la synchronisation en temps réel.

1. Sur <https://supabase.com>, **New project**. Choisis une région en Europe et note le mot de passe de la base (il ne servira pas au jeu, mais garde-le).
2. **SQL Editor > New query** : colle tout le fichier [`supabase/migrations/0001_dcds.sql`](../supabase/migrations/0001_dcds.sql), puis **Run**. Le message doit être « Success. No rows returned ». Le script peut être relancé sans risque.
3. **Authentication > Sign In / Providers** :
   - **Anonymous Sign-Ins** : active-le. Sans ça, impossible de jouer en invité.
   - **Discord** : laisse cet onglet ouvert, on y revient à l'étape 2.
4. **Authentication > URL Configuration** :
   - **Site URL** : `https://dcds.games.blzt.fr`
   - **Redirect URLs**, ajoute :
     - `https://dcds.games.blzt.fr/auth/callback`
     - `http://localhost:3000/auth/callback` (pour tester en local)
5. **Project Settings > API** (ou **API Keys**) : note ces trois valeurs.
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - clé **anon** / **publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - clé **service_role** / **secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Cette clé donne tous les droits : elle ne doit jamais être publiée, ni préfixée `NEXT_PUBLIC_`.

Recommandé : **Authentication > Attack Protection > CAPTCHA** (Cloudflare Turnstile), pour éviter qu'un robot crée des milliers de comptes invités. Si tu l'actives, il faudra ajouter le widget CAPTCHA au formulaire « Jouer en invité » (pas encore fait).

## Étape 2 · Application Discord

1. Va sur <https://discord.com/developers/applications>, **New Application**, nom « DCDS ».
2. Onglet **OAuth2** :
   - Copie le **Client ID** et génère un **Client Secret** (**Reset Secret**).
   - Dans **Redirects**, ajoute `https://<ton-projet>.supabase.co/auth/v1/callback`. L'adresse exacte est affichée dans Supabase, dans l'onglet du provider Discord (« Callback URL »).
3. De retour dans Supabase, **Authentication > Sign In / Providers > Discord** : active, colle le Client ID et le Client Secret, puis **Save**.

Le jeu ne demande que le scope `identify` (pseudo et avatar) : aucun accès aux serveurs, aux messages ni à la liste d'amis.

## Étape 3 · LiveKit Cloud

LiveKit transporte les webcams et les micros. Sans lui, le jeu fonctionne avec les avatars.

1. Sur <https://cloud.livekit.io>, crée un projet.
2. **Settings > Keys** (ou **API Keys**) : crée une clé et note :
   - l'URL du projet, en `wss://…livekit.cloud` → `LIVEKIT_URL`
   - l'**API Key** → `LIVEKIT_API_KEY`
   - l'**API Secret** → `LIVEKIT_API_SECRET`

## Étape 4 · Vercel

1. Sur <https://vercel.com>, **Add New… > Project**, importe le dépôt GitHub `eloiseblaizot/DCDS`. Vercel détecte Next.js tout seul : ne change rien aux réglages de build.
2. Avant de cliquer sur **Deploy**, ouvre **Environment Variables** et ajoute les 6 variables, pour les environnements Production et Preview :

   | Nom | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon / publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé service_role / secret |
   | `LIVEKIT_URL` | `wss://…livekit.cloud` |
   | `LIVEKIT_API_KEY` | API key LiveKit |
   | `LIVEKIT_API_SECRET` | API secret LiveKit |

3. **Deploy**. Une fois terminé, l'adresse `https://dcds-xxxx.vercel.app` fonctionne déjà (sauf la connexion Discord, qui redirige vers le domaine final).
4. Si tu modifies une variable plus tard, il faut **redéployer** (Deployments > ⋯ > Redeploy) : les variables `NEXT_PUBLIC_*` sont figées au moment du build.

## Étape 5 · Le sous-domaine `dcds.games.blzt.fr`

1. Dans Vercel, **Project > Settings > Domains > Add**, tape `dcds.games.blzt.fr`.
2. Vercel affiche l'enregistrement DNS à créer. Chez le gestionnaire DNS de `blzt.fr` (OVH, Gandi, Cloudflare…), dans la zone `blzt.fr`, ajoute :

   | Type | Nom | Valeur |
   | --- | --- | --- |
   | CNAME | `dcds.games` | la valeur indiquée par Vercel (souvent `cname.vercel-dns.com.`) |

   Si `blzt.fr` passe par Cloudflare, mets le nuage en **gris** (DNS only) pour ce CNAME.
3. Attends que Vercel affiche « Valid Configuration » : de quelques minutes à quelques heures. Le certificat HTTPS est automatique.

## Après la mise en ligne : vérifications

- `https://dcds.games.blzt.fr` affiche l'accueil **sans** le bandeau « Le jeu en ligne n'est pas encore branché ». Si le bandeau est là, les variables `NEXT_PUBLIC_SUPABASE_*` manquent ou il faut redéployer.
- « Partie privée » crée un salon. Une erreur « Configuration Supabase manquante » veut dire que `SUPABASE_SERVICE_ROLE_KEY` manque.
- Le bouton Discord ramène bien sur le site. Sinon, vérifie les *Redirect URLs* de Supabase (étape 1.4) et la redirection Discord (étape 2.2).
- Les webcams s'allument dans le salon. Un ⚠️ « Vidéo » en haut signale des clés LiveKit absentes ou fausses.
- Ensuite, déroule la checklist « Premier test en conditions réelles » de [a-faire.md](a-faire.md).

## Mettre à jour le jeu

Chaque `git push` sur `main` redéploie automatiquement la production. Une autre branche crée une URL de preview.

Si une future version ajoute un fichier dans `supabase/migrations/`, exécute-le dans le SQL Editor **avant** de pousser le code.

## Entretien

Les salons ne sont pas supprimés automatiquement. De temps en temps, dans le SQL Editor :

```sql
delete from public.rooms where updated_at < now() - interval '2 days';
```

La suppression d'un salon efface aussi ses membres, son secret, les infos des joueurs et le chat. Pour automatiser, active l'extension `pg_cron` (Database > Extensions) et planifie cette requête une fois par jour.

## Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Les invités ne sont pas activés sur ce serveur » | Anonymous Sign-Ins désactivé (étape 1.3) |
| Discord renvoie « Invalid OAuth2 redirect_uri » | URL de callback Supabase absente côté Discord (étape 2.2) |
| Après Discord, retour sur `localhost` ou sur la mauvaise URL | *Site URL* et *Redirect URLs* Supabase (étape 1.4) |
| Le salon ne se met pas à jour tout seul (il faut recharger) | La fin de la migration (publication `supabase_realtime`) n'a pas tourné : relance le script SQL |
| « Tu ne fais plus partie de ce salon » | Le joueur a été expulsé, ou le salon a été supprimé (tout le monde est parti) |
| Pas de son sur mobile | Normal la première fois : touche le bouton « 🔊 Activer le son » |
