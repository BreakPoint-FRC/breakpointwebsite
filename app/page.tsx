import { Header } from "@/components/layout/Header";
import { LegalBar } from "@/components/layout/LegalBar";
import { MobileBar } from "@/components/layout/MobileBar";
import { SceneTracker } from "@/components/layout/SceneTracker";
import { Spine } from "@/components/layout/Spine";
import { WatchPanel } from "@/components/layout/WatchPanel";
import { FitLeading } from "@/components/motion/FitLeading";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { FrcFacts } from "@/components/scenes/FrcFacts";
import { GlassFinale } from "@/components/scenes/GlassFinale";
import { Hero } from "@/components/scenes/Hero";
import { Manifesto } from "@/components/scenes/Manifesto";
import { OrbitLanding } from "@/components/scenes/OrbitLanding";
import { Packages } from "@/components/scenes/Packages";
import { RobotParts } from "@/components/scenes/RobotParts";
import { Team } from "@/components/scenes/Team";

export default function Home() {
  return (
    <>
      <a
        href="#frc"
        className="sr-only z-50 bg-bp-yellow px-16 py-12 font-label font-semibold text-bp-black focus:not-sr-only focus:fixed focus:top-8 focus:left-8"
      >
        İçeriğe geç
      </a>
      <SmoothScroll />
      <Header />
      <Spine />
      <WatchPanel />
      <main>
        <Hero />
        <FrcFacts />
        <RobotParts />
        <Team />
        <Manifesto />
        <OrbitLanding />
        <Packages />
        <GlassFinale />
      </main>
      <LegalBar />
      <MobileBar />
      <SceneTracker />
      <FitLeading />
    </>
  );
}
