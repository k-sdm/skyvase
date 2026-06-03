export const PRODUCT = {
  name: "sky vase",
  tagline: "Your sky, cast in titanium",
  description:
    "A 200mm titanium vase with a colour gradient uniquely encoding a date and location. " +
    "The gradient maps daylight hours to anodisation zones — shorter days produce deeper blues, " +
    "longer days reveal golds and teals. Each piece is one-of-one.",
  // Base price 300.00 GBP. Stripe Adaptive Pricing converts this to the
  // buyer's local currency at checkout (enable Adaptive Pricing in the
  // Stripe Dashboard: Settings → Payments).
  priceAmount: 30000,
  currency: "gbp",
  dimensions: "200mm × 80mm",
  material: "Grade 2 Titanium",
  process: "Electrochemical anodisation",
  editionSize: 50,
};

export const VOLTAGE_COLOURS = [
  { voltage: 15, colour: "#8B6914", name: "Bronze" },
  { voltage: 23, colour: "#1E3A5F", name: "Blue" },
  { voltage: 35, colour: "#C8A832", name: "Yellow" },
  { voltage: 50, colour: "#2D6B4E", name: "Green" },
  { voltage: 56, colour: "#1A8B7A", name: "Teal" },
  { voltage: 65, colour: "#9B2D5E", name: "Pink" },
] as const;

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}
