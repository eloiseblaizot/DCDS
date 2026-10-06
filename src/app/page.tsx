import { Footer } from "@/components/Footer";
import { Logo } from "@/components/art/Logo";
import { HomeClient } from "./HomeClient";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center px-4 pt-10 sm:pt-16">
      <Logo size="lg" />
      <p className="clay-title mt-4 max-w-2xl text-center text-lg sm:text-2xl">
        Choisis ton conteneur. Bluffe. Échange.
        <br />
        Repars avec le meilleur lot… ou avec un cafard dans un bocal.
      </p>
      <HomeClient />
      <Footer />
    </main>
  );
}
