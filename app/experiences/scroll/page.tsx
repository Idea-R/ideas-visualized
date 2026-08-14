import { ScrollExperience } from "@/components/experiences/ScrollExperience";

export const metadata = {
  title: "Scroll Experience · Ideas Visualized",
  description: "Explore a scroll-driven visual journey with layered depth, parallax motion, and staged text reveals.",
  alternates: { canonical: "/experiences/scroll" },
};

export default function ScrollExperiencePage() {
  return (
    <main>
      <ScrollExperience />
    </main>
  );
}
