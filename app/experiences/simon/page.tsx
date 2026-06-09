import Link from "next/link";
import { SimonSays } from "@/components/games/SimonSays";

export const metadata = { title: "Simon Says — Ideas Visualized" };

export default function SimonPage() {
  return (
    <main className="relative h-[100svh] w-full">
      <Link
        href="/experiences"
        className="absolute bottom-4 left-4 z-30 rounded-full border border-white/10 bg-bg-soft/70 px-3 py-1.5 text-xs text-muted backdrop-blur transition hover:text-fg"
      >
        ← Experiences
      </Link>
      <SimonSays />
    </main>
  );
}
