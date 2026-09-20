export const site = {
  name: "HIGHGROUNDS*",
  tagline: "Tested. Warranted. Delivered.",
  description:
    "Tested pre-owned and brand new consoles, handhelds, laptops and PC parts. Every unit bench-tested, graded and warranted before it ships.",
  base: "Santo Tomas, Batangas",
  coverage: ["Batangas", "Laguna", "Cavite", "Metro Manila"],
  // TODO: replace with your Facebook Page username, e.g. https://m.me/highgroundsph
  messenger: "https://m.me/REPLACE_WITH_PAGE_USERNAME",
  facebook: "https://facebook.com/REPLACE_WITH_PAGE_USERNAME",
} as const;

export function peso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}
