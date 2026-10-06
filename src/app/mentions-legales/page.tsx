import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/art/Logo";
import { Footer } from "@/components/Footer";
import { RIGHTS_HOLDER, SHOW_CREATORS, SHOW_TITLE } from "@/lib/legal";

export const metadata: Metadata = { title: "DCDS · mentions légales" };

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" aria-label="Accueil">
        <Logo size="md" />
      </Link>
      <h1 className="clay-title mt-4 text-4xl">Mentions légales</h1>

      <div className="mt-6 space-y-4">
        <section className="clay clay-grain p-6">
          <h2 className="text-xl font-bold">Œuvre originale et droits</h2>
          <p className="mt-2 text-ink-soft">
            DCDS est un jeu de fans, gratuit et non officiel, inspiré du concept de l&apos;émission{" "}
            <strong>« {SHOW_TITLE} »</strong> créée par <strong>{SHOW_CREATORS}</strong>.
          </p>
          <p className="mt-2 text-ink-soft">
            Tous les droits relatifs à l&apos;émission, à son concept, à son nom et à son univers visuel sont réservés à{" "}
            <strong>{RIGHTS_HOLDER}</strong>. Ce site n&apos;est ni affilié, ni approuvé, ni sponsorisé par ses créateurs ou
            par {RIGHTS_HOLDER}. Toute demande des ayants droit sera traitée sans délai.
          </p>
        </section>

        <section className="clay clay-grain p-6">
          <h2 className="text-xl font-bold">Éditeur et hébergement</h2>
          <p className="mt-2 text-ink-soft">
            Éditeur du site : <em>[nom / raison sociale, adresse et contact de l&apos;éditeur à compléter]</em>.
          </p>
          <p className="mt-2 text-ink-soft">
            Hébergement : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Base de données et
            authentification : Supabase. Vidéo et audio en temps réel : LiveKit.
          </p>
        </section>

        <section className="clay clay-grain p-6">
          <h2 className="text-xl font-bold">Données personnelles</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            <li>
              Compte invité : seul ton pseudo est conservé, associé à un identifiant anonyme stocké dans ton navigateur.
            </li>
            <li>
              Connexion Discord (optionnelle) : nous recevons ton identifiant, ton pseudo et ton avatar Discord. Aucun accès
              à tes serveurs, messages ou amis.
            </li>
            <li>
              Vidéo et audio : diffusés en direct aux autres joueurs du salon, jamais enregistrés par DCDS. Tu peux couper
              ta caméra et ton micro à tout moment.
            </li>
            <li>Messages de chat et parties : conservés le temps de la partie, puis supprimés lors du nettoyage des salons.</li>
          </ul>
          <p className="mt-2 text-ink-soft">
            Pour toute demande (accès, suppression) : <em>[adresse de contact à compléter]</em>.
          </p>
        </section>

        <section className="clay clay-grain p-6">
          <h2 className="text-xl font-bold">Lots</h2>
          <p className="mt-2 text-ink-soft">
            Les lots du catalogue sont fictifs et n&apos;ont aucune valeur réelle. Les lots ajoutés par un host relèvent de sa
            seule responsabilité.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
