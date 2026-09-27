import type { TeamMember, TeamSection } from "./types";

const member = (role: string): TeamMember => ({
  role,
  name: "[AD]",
  photo: { src: null, alt: "", placeholder: "[PORTRE]" },
});

export const team: TeamSection = {
  label: "04  Takım",
  title: "[N] öğrenci.",
  titleAccent: "Dört ekip. Tek robot.",
  titleMobile: "[N] öğrenci.",
  titleAccentMobile: "Dört ekip.",
  joinCta: { label: "Takıma katıl →", href: "#iletisim" },
  members: [
    member("kaptan"),
    member("mekanik[0]"),
    member("mekanik[1]"),
    member("yazilim[0]"),
    member("yazilim[1]"),
    member("elektronik[0]"),
    member("elektronik[1]"),
    member("medya[0]"),
    member("sponsorluk[0]"),
    member("mentor[0]"),
  ],
};
