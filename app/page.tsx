import { GlassOpening } from "@/components/glass/GlassOpening";
import { FlightCanvas } from "@/components/gl/FlightCanvas";
import { Contact } from "@/components/sections/Contact";
import { Final } from "@/components/sections/Final";
import { Frc } from "@/components/sections/Frc";
import { Hero } from "@/components/sections/Hero";
import { Robot } from "@/components/sections/Robot";
import { Sponsor } from "@/components/sections/Sponsor";
import { Team } from "@/components/sections/Team";
import { Header } from "@/components/shell/Header";
import { QualityBoot } from "@/components/shell/QualityBoot";
import { QualityNotice } from "@/components/shell/QualityNotice";

export default function Home() {
  return (
    <>
      <a className="skip" href="#main">
        İçeriğe geç
      </a>
      <div className="warm" aria-hidden="true"></div>
      <FlightCanvas />
      <div id="flash" aria-hidden="true"></div>
      <div className="prog" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>
      <div className="flight mono" id="flight" aria-hidden="true">
        <i className="ar"></i>
        <span id="fl-t">sıradaki</span>
        <span className="bar">
          <i id="fl-b"></i>
        </span>
      </div>
      <div id="site">
        <Header />
        <div id="track" aria-hidden="true"></div>
        <div id="stage">
          <main id="main" tabIndex={-1}>
            <Hero />
            <Frc />
            <Robot />
            <Team />
            <Sponsor />
            <Contact />
            <Final />
          </main>
        </div>
        <div className="stn mono" id="stn" aria-hidden="true">
          <i></i>
          <span id="stn-t">giriş</span>
        </div>
      </div>
      <GlassOpening />
      <QualityNotice />
      <QualityBoot />
    </>
  );
}
