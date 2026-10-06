import Link from "next/link";
import { LEGAL_NOTICE } from "@/lib/legal";

export function Footer() {
  return (
    <footer className="mx-auto mt-10 mb-6 w-full max-w-4xl rounded-3xl bg-[#14245e]/55 px-5 py-4 text-center text-xs leading-relaxed text-white backdrop-blur-sm">
      <p>{LEGAL_NOTICE}</p>
      <p className="mt-2 space-x-3 font-semibold">
        <Link href="/regles" className="underline-offset-2 hover:underline">
          Règles
        </Link>
        <span aria-hidden>·</span>
        <Link href="/mentions-legales" className="underline-offset-2 hover:underline">
          Mentions légales
        </Link>
        <span aria-hidden>·</span>
        <Link href="/demo" className="underline-offset-2 hover:underline">
          Essayer en solo
        </Link>
      </p>
    </footer>
  );
}
