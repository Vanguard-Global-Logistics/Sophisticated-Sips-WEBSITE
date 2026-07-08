/** Static fallback content so public pages render fully before Supabase is configured.
 *  Mirrors the seed data in supabase/schema.sql. */
export const DEMO_MENU = [
  { id: "d1", category: "Iced Espresso", name: "Shaken Espresso", price_label: "16 oz $6 · 24 oz $7", description: "Double shots shaken over ice until silky and frothed.", is_signature: false },
  { id: "d2", category: "Iced Espresso", name: "Iced Latte", price_label: "16 oz $7 · 24 oz $8", description: "Espresso and cold milk over ice, finished your way.", is_signature: false },
  { id: "d3", category: "Iced Espresso", name: "Iced Macchiato", price_label: "16 oz $7 · 24 oz $8", description: "Layered espresso poured slow over vanilla milk.", is_signature: false },
  { id: "d4", category: "Hot Espresso", name: "Americano", price_label: "12 oz $4 · 16 oz $5", description: "Rich espresso lengthened with hot water.", is_signature: false },
  { id: "d5", category: "Hot Espresso", name: "Café Latte", price_label: "12 oz $6 · 16 oz $7", description: "Velvet-steamed milk over a double shot.", is_signature: false },
  { id: "d6", category: "Hot Espresso", name: "Espresso Shot", price_label: "1 shot $2 · 2 shots $3", description: "Pulled fresh, crema-crowned.", is_signature: false },
  { id: "d7", category: "Non-Espresso", name: "Red Bull Italian Cream Soda", price_label: "$7", description: "Sparkling energy with sweet cream and syrup.", is_signature: false },
  { id: "d8", category: "Non-Espresso", name: "Italian Soda", price_label: "$5", description: "Sparkling water with artisan flavor syrups.", is_signature: false },
  { id: "d9", category: "Non-Espresso", name: "Dirty Soda", price_label: "$6", description: "Soda, cream, and flavor — the fun one.", is_signature: false },
  { id: "d10", category: "Non-Espresso", name: "Hot Chocolate", price_label: "$5", description: "Real cocoa, steamed milk, whipped topping.", is_signature: false },
  { id: "d11", category: "Non-Espresso", name: "Hot Tea", price_label: "$3", description: "A curated selection of premium teas.", is_signature: false },
  { id: "d12", category: "Non-Espresso", name: "Red Bull", price_label: "$4", description: "Chilled, classic or sugar-free.", is_signature: false },
  { id: "d13", category: "Non-Espresso", name: "Soda Pop Can", price_label: "$3", description: "Assorted favorites, ice cold.", is_signature: false },
  { id: "d14", category: "Non-Espresso", name: "Water", price_label: "$2", description: "Bottled and chilled.", is_signature: false },
  { id: "d15", category: "Signature", name: "Golden Pulse Latte", price_label: "$7.50", description: "Our house latte with a champagne-gold turmeric-honey finish.", is_signature: true },
  { id: "d16", category: "Signature", name: "Golden Pulse Crepe", price_label: "$12", description: "Warm crepe, caramelized honey butter, gold dusting.", is_signature: true },
  { id: "d17", category: "Signature", name: "Oreo Artisan Cheesecake", price_label: "$11", description: "Hand-finished cheesecake on a dark cookie crust.", is_signature: true },
  { id: "d18", category: "Signature", name: "Peppermint Pulse Cheesecake", price_label: "$11", description: "Cool peppermint over velvet cheesecake.", is_signature: true },
];

export const DEMO_PACKAGES = [
  { id: "p1", name: "The Espresso Hour", tag: "Most booked", description: "Full espresso bar service for up to 50 guests. Iced and hot menu, two baristas, styled trailer setup.", bullet_points: ["2 hours of service", "Full espresso + non-espresso menu", "Custom cup sleeves available"] },
  { id: "p2", name: "The Golden Event", tag: "Weddings & galas", description: "Our signature luxury experience: espresso bar, signature Golden Pulse menu, dessert display, and crepe station.", bullet_points: ["3–4 hours of service", "Signature drinks + dessert bar", "Crepe add-on station", "Champagne-gold styling"] },
  { id: "p3", name: "Corporate Perk", tag: "Offices & appreciation days", description: "Turn a Tuesday into the best day of the quarter. Branded menu boards, fast lines, invoice-friendly billing.", bullet_points: ["Per-cup or flat-rate billing", "Company-branded menu option", "Recurring visit scheduling"] },
];
