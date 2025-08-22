export const FONT_FAMILIES = [
  "Space+Grotesk:wght@300..700",
  "Hanken+Grotesk:ital,wght@0,100..900;1,100..900",
  "Sen:wght@400..800",
  "Parkinsans:wght@300..800",
  "Sora:wght@100..800",
  "Outfit:wght@100..900",
  "Didact+Gothic",
  "Fredoka:wght@300..700",
  "Lexend:wght@100..900",
  "Maven+Pro:wght@400..900",
  "AR+One+Sans:wght@400..700",
  "Quicksand:wght@300..700",
  "Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800",
  "Recursive:wght@300..1000",
  "Red+Hat+Text:ital,wght@0,300..700;1,300..700",
  "Oxygen:wght@300;400;700",
  "Questrial",
  "Varela",
  "Varela+Round",
  "Montserrat:ital,wght@0,100..900;1,100..900",
  "Noto+Sans:ital,wght@0,100..900;1,100..900",
  "Nunito:ital,wght@0,200..1000;1,200..1000",
  "Teachers:ital,wght@0,400..800;1,400..800",
  "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900",
  "Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900",
  "DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000",
  "Figtree:ital,wght@0,300..900;1,300..900",
  "Geist:wght@100..900",
  "Manrope:wght@200..800",
  "Host+Grotesk:ital,wght@0,300..800;1,300..800",
  "Onest:wght@100..900",
  "Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700",
  "IBM+Plex+Sans:ital,wght@0,100..700;1,100..700",
  "Rubik:ital,wght@0,300..900;1,300..900",
  "Funnel+Sans:ital,wght@0,300..800;1,300..800"
];

export function generateGoogleFontsUrl(): string {
  const baseUrl = "https://fonts.googleapis.com/css2";
  const familyParams = FONT_FAMILIES.map(family => `family=${family}`).join("&");
  return `${baseUrl}?${familyParams}&display=swap`;
}
