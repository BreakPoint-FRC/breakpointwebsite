export interface SiteInfo {
  teamName: string;
  teamNumber: string;
  school: string;
  city: string;
  season: string;
  description: string;
  /** Sitenin yayın adresi (kanonik URL, sitemap, paylaşım önizlemesi). */
  url: string;
}

export interface Features {
  qualitySelector: boolean;
}

export interface HeroContent {
  lead: string;
  ctaLabel: string;
  ctaHref: string;
  commentLine: string;
  watch: {
    ariaLabel: string;
    title: string;
    teamLabel: string;
    schoolLabel: string;
    signalLabel: string;
    sensorName: string;
    hitLabel: string;
    shardsLabel: string;
    crackLabel: string;
    upLabel: string;
    /** Cam kırılmadan önce gösterilen değerler. */
    idleHit: string;
    idleValue: string;
    idleUp: string;
    crackUnit: string;
  };
  scrollCue: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FrcStep {
  title: string;
  text: string;
}

export interface FrcContent {
  title: string;
  lead: string;
  steps: FrcStep[];
  fieldLabel: string;
  allianceA: string;
  allianceB: string;
}

export type PartId = "sasi" | "mekanizma" | "elektronik" | "yazilim";

export interface RobotPart {
  id: PartId;
  name: string;
  description: string;
}

export interface Photo {
  src: string | null;
  alt: string;
}

export interface RobotContent {
  title: string;
  intro: string;
  photoLabel: string;
  photoTag: string;
  dimensionLabel: string;
  photo: Photo;
  parts: RobotPart[];
  /** 3B uçuşta robot sahnesinin göstergesi. */
  hud: { phaseLabel: string; phaseIdle: string; countLabel: string };
}

export interface TeamCard {
  role: string;
  name: string;
  photo: Photo;
}

export interface TeamContent {
  title: string;
  lead: string;
  photoLabel: string;
  cards: TeamCard[];
}

export interface SponsorTier {
  id: string;
  name: string;
  price: string;
  perks: string[];
  featured: boolean;
}

export interface SponsorContent {
  title: string;
  intro: string;
  featuredChip: string;
  ctaLabel: string;
  ctaHref: string;
  tiers: SponsorTier[];
}

export interface ContactField {
  label: string;
  value: string;
  mono: boolean;
  href?: string;
}

export interface ContactContent {
  title: string;
  lead: string;
  fields: ContactField[];
  big: string;
}
