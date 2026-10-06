import type { Metadata } from "next";
import Link from "next/link";
import { ClayCloud } from "@/components/art/ClayCloud";
import { Logo } from "@/components/art/Logo";
import { Footer } from "@/components/Footer";
import { JOKER_ORDER, JOKERS } from "@/lib/game/settings";

export const metadata: Metadata = { title: "DCDS · règles du jeu" };

const STEPS = [
  {
    title: "1. Nomination du décideur",
    text: "Un joueur se porte volontaire, ou l'host lance un tirage au sort. Chaque joueur sera décideur une seule fois : une partie compte autant de manches que de joueurs.",
  },
  {
    title: "2. Choix des conteneurs",
    text: "Le décideur choisit son conteneur en premier. Ensuite, c'est premier arrivé, premier servi pour les participants !",
  },
  {
    title: "3. Découverte",
    text: "Chacun son tour, les participants ouvrent leur conteneur. Seul celui qui ouvre voit le lot, mais tout le monde voit sa réaction en grand sur l'écran géant. Le décideur, lui, ne voit jamais le sien.",
  },
  {
    title: "4. Le décideur joue",
    text: "Il utilise ses jokers (chacun une fois par manche) pour démêler le vrai du bluff. Il voit à tout moment qui a vu quel conteneur. Quand il est prêt, il garde son conteneur… ou en vole un.",
  },
  {
    title: "5. Le grand reveal",
    text: "On ouvre les conteneurs un par un devant tout le monde, avec toutes les caméras en bas de l'écran. Chaque lot a une valeur : elle s'ajoute au butin de son propriétaire.",
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" aria-label="Accueil">
        <Logo size="md" />
      </Link>
      <h1 className="clay-title mt-4 text-4xl">Les règles</h1>
      <p className="mt-2 max-w-2xl text-lg font-semibold text-white/90">
        Le but : repartir avec le meilleur lot. Les conteneurs cachent des lots trop bien (une console, un voyage au Japon…)
        ou ultra nuls (un cafard dans un bocal, un slip usagé…).
      </p>

      <div className="mt-6 space-y-3">
        {STEPS.map((s) => (
          <section key={s.title} className="clay clay-grain p-5">
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="mt-1 text-ink-soft">{s.text}</p>
          </section>
        ))}
      </div>

      <h2 className="clay-title mt-10 text-3xl">Les jokers</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {JOKER_ORDER.map((k) => (
          <section key={k} className="clay clay-grain flex items-center gap-4 p-4">
            <ClayCloud variant={k} className="h-20 w-28 shrink-0" />
            <div>
              <h3 className="text-lg font-bold">{JOKERS[k].name}</h3>
              <p className="text-sm text-ink-soft">{JOKERS[k].description}</p>
            </div>
          </section>
        ))}
      </div>

      <section className="clay clay-grain mt-6 p-5">
        <h2 className="text-xl font-bold">Les chats</h2>
        <p className="mt-1 text-ink-soft">
          <strong>Chat global</strong> : tout le salon, spectateurs compris. <strong>Chat des participants</strong> : un
          canal secret où les participants peuvent s&apos;entendre (ou se piéger) ; le décideur de la manche ne peut pas le
          lire.
        </p>
      </section>
      <Footer />
    </main>
  );
}
