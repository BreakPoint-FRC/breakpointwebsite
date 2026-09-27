// Tipler: içerik dosyaları bu şekle uymak zorunda.
// [KÖŞELİ PARANTEZ] içindeki her değer takımın dolduracağı yer tutucudur.

export type Tone = "white" | "yellow" | "muted";

export interface LinkItem {
  label: string;
  /** Gerçek adres gelene kadar "#" kalır. */
  href: string;
}

export interface MediaAsset {
  /** public/ altındaki yol, ör. "/media/robot.mp4". Yoksa null → yer tutucu kutu görünür. */
  src: string | null;
  alt: string;
  placeholder: string;
}

export interface VideoAsset extends MediaAsset {
  poster: string | null;
}

export interface SiteInfo {
  teamName: string;
  teamNumber: string;
  school: string;
  city: string;
  slogan: string;
  robotName: string;
  robotYear: string;
  copyrightYear: string;
  description: string;
}

export interface HeroContent {
  codeComment: string;
  codeKeyword: string;
  subtitle: string;
  primaryCta: LinkItem;
  secondaryCta: LinkItem;
  scrollHint: string;
  media: VideoAsset;
}

export interface SectionHeading {
  label: string;
  title: string;
  titleAccent: string;
}

export interface Fact {
  value: string;
  label: string;
  shortLabel: string;
}

export interface FrcSection extends SectionHeading {
  body: string;
  bodyShort: string;
  facts: Fact[];
}

export interface RobotPart {
  no: string;
  name: string;
  description: string;
  /** Robot fotoğrafı üzerindeki nokta, yüzde (0–100). */
  x: number;
  y: number;
}

export interface RobotSection {
  label: string;
  overviewText: string;
  photo: MediaAsset;
  photoMobile: MediaAsset;
  parts: RobotPart[];
}

export interface TeamMember {
  role: string;
  name: string;
  photo: MediaAsset;
}

export interface TeamSection extends SectionHeading {
  titleMobile: string;
  titleAccentMobile: string;
  joinCta: LinkItem;
  members: TeamMember[];
}

export interface ManifestoSegment {
  text: string;
  highlight?: boolean;
}

export interface ManifestoSection {
  label: string;
  segments: ManifestoSegment[];
}

export interface SponsorTier {
  id: string;
  name: string;
  amount: string;
  recommended: boolean;
  /** Robot üzerindeki yer (JSON görünümündeki anahtar). */
  placement: string;
  placementLabel: string;
  benefits: string[];
}

export interface SponsorLogo {
  name: string;
  logo: MediaAsset | null;
}

export interface OrbitSection {
  label: string;
  title: string;
  titleAccent: string;
  titleEnd: string;
  landLabel: string;
  landTitle: string;
  landTitleAccent: string;
  inputLabel: string;
  inputLabelMobile: string;
  inputPlaceholder: string;
  youSlot: string;
  sponsors: SponsorLogo[];
}

export interface PackagesSection extends SectionHeading {
  labelMobile: string;
  tiers: SponsorTier[];
}

export interface BudgetItem {
  label: string;
  shortLabel: string;
  amount: string;
  /** Yüzde pay. Toplam 100 olmalı. */
  share: number;
  tone: "yellow" | "white" | "muted" | "line";
}

export interface Budget {
  /** true iken grafikte "ÖRNEK" notu görünür. */
  isExample: boolean;
  exampleNote: string;
  exampleNoteMobile: string;
  items: BudgetItem[];
}

export interface ContactPerson {
  name: string;
  role: string;
  phone: string;
  photo: MediaAsset;
}

export interface ConsoleLine {
  key: string;
  link: LinkItem;
  /** Mobil konsolda gösterilsin mi. */
  mobile: boolean;
}

export interface ContactContent {
  person: ContactPerson;
  whatsapp: LinkItem;
  sponsorPdf: LinkItem;
  sponsorCta: LinkItem;
  joinCta: LinkItem;
  consoleLabel: string;
  consoleLines: ConsoleLine[];
  glassLine1: string;
  glassLine2: string;
  glassLine3: string;
  schoolLine: string;
  legal: LinkItem;
}

export interface SceneNavItem {
  id: string;
  label: string;
}

export interface WatchRow {
  key: string;
  value: string;
  tone: Tone;
  /** Dolu ise değer sahne tarafından canlı güncellenir. */
  bind?: string;
}
