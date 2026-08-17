/** Static fallback content so public pages render fully before Supabase is configured.
 *  Mirrors the seed data in supabase/schema.sql. */
export const DEMO_MENU = [
  { id: "d1", category: "Iced Espresso", name: "Shaken Espresso", price_label: "16 oz $5 · 24 oz $6", description: "Your refreshing pick-me-up, similar to a crisp iced coffee.", is_signature: false, sort: 10 },
  { id: "d2", category: "Iced Espresso", name: "Iced Latte", price_label: "16 oz $6 · 24 oz $7", description: "Smooth espresso perfectly blended with chilled milk.", is_signature: false, sort: 20 },
  { id: "d3", category: "Iced Espresso", name: "Iced Macchiato", price_label: "16 oz $6 · 24 oz $7", description: "A beautifully layered iced latte—a true work of art in a cup.", is_signature: false, sort: 30 },
  { id: "d4", category: "Hot Espresso", name: "Americano", price_label: "12 oz $4 · 16 oz $4.50", description: "A bold and invigorating classic, just like a traditional coffee.", is_signature: false, sort: 10 },
  { id: "d5", category: "Hot Espresso", name: "Café Latte", price_label: "12 oz $5.50 · 16 oz $6", description: "Rich espresso harmoniously combined with velvety steamed milk.", is_signature: false, sort: 20 },
  { id: "d6", category: "Hot Espresso", name: "Espresso Shot", price_label: "1 shot $2 · 2 shots $3", description: "Pure, concentrated perfection.", is_signature: false, sort: 30 },
  { id: "d7", category: "Non-Espresso", name: "Red Bull Italian Cream Soda", price_label: "20 oz $7", description: "The ultimate energy boost meets a sweet, creamy fizz.", is_signature: false, sort: 10 },
  { id: "d8", category: "Non-Espresso", name: "Italian Soda", price_label: "16 oz $4", description: "Club soda, your favorite flavor, cream, and a swirl of whipped cream.", is_signature: false, sort: 20 },
  { id: "d9", category: "Non-Espresso", name: "Hot Chocolate", price_label: "12 oz $4", description: "Warm milk, fluffy marshmallows, peppermint, and whipped cream.", is_signature: false, sort: 30 },
  { id: "d10", category: "Non-Espresso", name: "Hot Tea", price_label: "12 oz $2", description: "A soothing, aromatic selection of available flavors.", is_signature: false, sort: 40 },
  { id: "d11", category: "Non-Espresso", name: "Red Bull", price_label: "$4", description: "A chilled 8.4 oz can.", is_signature: false, sort: 50 },
  { id: "d12", category: "Non-Espresso", name: "Water", price_label: "$1", description: "Crisp, refreshing hydration.", is_signature: false, sort: 60 },
  { id: "d13", category: "Crepes", name: "Nutella Crepe", price_label: "$7", description: "The classic, simply irresistible.", is_signature: false, sort: 10 },
  { id: "d14", category: "Crepes", name: "Banana Nutella Crepe", price_label: "$8", description: "Sweet bananas and rich Nutella.", is_signature: false, sort: 20 },
  { id: "d15", category: "Crepes", name: "Strawberry Nutella Crepe", price_label: "$9", description: "Fresh strawberries paired with creamy Nutella.", is_signature: false, sort: 30 },
  { id: "d16", category: "Crepes", name: "Strawberry-Banana Crepe", price_label: "$10", description: "A fresh, flavorful fruit duo.", is_signature: false, sort: 40 },
  { id: "d17", category: "Crepes", name: "Banana Cheesecake Crepe", price_label: "$8", description: "Bananas blended with creamy cheesecake filling.", is_signature: false, sort: 50 },
  { id: "d18", category: "Crepes", name: "Strawberry Cheesecake Crepe", price_label: "$9", description: "Juicy strawberries meet decadent cheesecake.", is_signature: false, sort: 60 },
  { id: "d19", category: "Signature", name: "Lavender Honey Latte", price_label: "Small $7 · Medium $8", description: "Lavender, honey, and soft cinnamon over espresso and milk. Served iced or hot.", is_signature: true, sort: 10 },
  { id: "d20", category: "Signature", name: "Biscoff Latte", price_label: "Small $7 · Medium $8", description: "Espresso, milk, Biscoff cookie butter, and whipped cream. Served iced or hot.", is_signature: true, sort: 20 },
  { id: "d21", category: "Signature", name: "S’more Latte", price_label: "Small $7 · Medium $8", description: "Chocolate, toasted marshmallow, cold foam, and graham cracker. Served iced or hot.", is_signature: true, sort: 30 },
];

export const DEMO_PACKAGES = [
  { id: "p1", name: "The Signature Bar", tag: "Up to 50 guests", description: "A luxury coffee experience with unlimited handcrafted drinks and a professional espresso bar.", bullet_points: ["Fresh roasted espresso", "Hot & iced beverages", "Premium syrups and milk choices", "Setup and breakdown"], base_price_cents: 49900, sort: 10 },
  { id: "p2", name: "The Paris Experience", tag: "Up to 100 guests", description: "Everything in The Signature Bar, plus a live gourmet crepe station made fresh for every guest.", bullet_points: ["Unlimited handcrafted drinks", "Unlimited fresh crepes", "Elegant menu displays", "Luxury presentation"], base_price_cents: 99900, sort: 20 },
  { id: "p3", name: "The Grand Experience", tag: "Up to 200 guests", description: "The flagship experience with Amy’s signature latte collection and the highest level of presentation.", bullet_points: ["Luxury coffee cart", "Premium décor and floral accents", "Personalized drink names", "Priority staffing and professional setup"], base_price_cents: 199900, sort: 30 },
];
