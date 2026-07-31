-- 008_amy_flyer_catalog.sql
-- Aligns untouched launch-demo rows with Amy's approved picture menu and
-- catering flyer. User-edited rows are preserved: updates only match the
-- original launch descriptions, and retired demo rows are hidden, not deleted.

update menu_items as item
set
  category = approved.category,
  price_label = approved.price_label,
  description = approved.description,
  is_signature = approved.is_signature,
  sort = approved.sort
from (
  values
    ('Shaken Espresso','Double shots shaken over ice until silky and frothed.','Iced Espresso','16 oz $5 · 20 oz $5.50','Your refreshing pick-me-up, similar to a crisp iced coffee.',false,10),
    ('Iced Latte','Espresso and cold milk over ice, finished your way.','Iced Espresso','16 oz $6 · 20 oz $6.50','Smooth espresso perfectly blended with chilled milk.',false,20),
    ('Iced Macchiato','Layered espresso poured slow over vanilla milk.','Iced Espresso','16 oz $6 · 20 oz $6.50','A beautifully layered iced latte—a true work of art in a cup.',false,30),
    ('Americano','Rich espresso lengthened with hot water.','Hot Espresso','12 oz $4 · 16 oz $4.50','A bold and invigorating classic, just like a traditional coffee.',false,10),
    ('Café Latte','Velvet-steamed milk over a double shot.','Hot Espresso','12 oz $5.50 · 16 oz $6','Rich espresso harmoniously combined with velvety steamed milk.',false,20),
    ('Espresso Shot','Pulled fresh, crema-crowned.','Hot Espresso','1 shot $2 · 2 shots $3','Pure, concentrated perfection.',false,30),
    ('Red Bull Italian Cream Soda','Sparkling energy with sweet cream and syrup.','Non-Espresso','20 oz $7','The ultimate energy boost meets a sweet, creamy fizz.',false,10),
    ('Italian Soda','Sparkling water with artisan flavor syrups.','Non-Espresso','16 oz $4','Club soda, your favorite flavor, cream, and a swirl of whipped cream.',false,20),
    ('Hot Chocolate','Real cocoa, steamed milk, whipped topping.','Non-Espresso','12 oz $4','Warm milk, fluffy marshmallows, peppermint, and whipped cream.',false,30),
    ('Hot Tea','A curated selection of premium teas.','Non-Espresso','12 oz $2','A soothing, aromatic selection of available flavors.',false,40),
    ('Red Bull','Chilled, classic or sugar-free.','Non-Espresso','$4','A chilled 8.4 oz can.',false,50),
    ('Water','Bottled and chilled.','Non-Espresso','$1','Crisp, refreshing hydration.',false,60)
) as approved(name, legacy_description, category, price_label, description, is_signature, sort)
where lower(item.name) = lower(approved.name)
  and item.description = approved.legacy_description;

update menu_items
set active = false
where
  (name = 'Dirty Soda' and description = 'Soda, cream, and flavor — the fun one.')
  or (name = 'Soda Pop Can' and description = 'Assorted favorites, ice cold.')
  or (name = 'Golden Pulse Latte' and description = 'Our house latte with a champagne-gold turmeric-honey finish.')
  or (name = 'Golden Pulse Crepe' and description = 'Warm crepe, caramelized honey butter, gold dusting.')
  or (name = 'Oreo Artisan Cheesecake' and description = 'Hand-finished cheesecake on a dark cookie crust.')
  or (name = 'Peppermint Pulse Cheesecake' and description = 'Cool peppermint over velvet cheesecake.');

insert into menu_items (category, name, price_label, description, is_signature, sort)
select approved.*
from (
  values
    ('Iced Espresso','Shaken Espresso','16 oz $5 · 20 oz $5.50','Your refreshing pick-me-up, similar to a crisp iced coffee.',false,10),
    ('Iced Espresso','Iced Latte','16 oz $6 · 20 oz $6.50','Smooth espresso perfectly blended with chilled milk.',false,20),
    ('Iced Espresso','Iced Macchiato','16 oz $6 · 20 oz $6.50','A beautifully layered iced latte—a true work of art in a cup.',false,30),
    ('Hot Espresso','Americano','12 oz $4 · 16 oz $4.50','A bold and invigorating classic, just like a traditional coffee.',false,10),
    ('Hot Espresso','Café Latte','12 oz $5.50 · 16 oz $6','Rich espresso harmoniously combined with velvety steamed milk.',false,20),
    ('Hot Espresso','Espresso Shot','1 shot $2 · 2 shots $3','Pure, concentrated perfection.',false,30),
    ('Non-Espresso','Red Bull Italian Cream Soda','20 oz $7','The ultimate energy boost meets a sweet, creamy fizz.',false,10),
    ('Non-Espresso','Italian Soda','16 oz $4','Club soda, your favorite flavor, cream, and a swirl of whipped cream.',false,20),
    ('Non-Espresso','Hot Chocolate','12 oz $4','Warm milk, fluffy marshmallows, peppermint, and whipped cream.',false,30),
    ('Non-Espresso','Hot Tea','12 oz $2','A soothing, aromatic selection of available flavors.',false,40),
    ('Non-Espresso','Red Bull','$4','A chilled 8.4 oz can.',false,50),
    ('Non-Espresso','Water','$1','Crisp, refreshing hydration.',false,60),
    ('Crepes','Nutella Crepe','$7','The classic, simply irresistible.',false,10),
    ('Crepes','Banana Nutella Crepe','$8','Sweet bananas and rich Nutella.',false,20),
    ('Crepes','Strawberry Nutella Crepe','$9','Fresh strawberries paired with creamy Nutella.',false,30),
    ('Crepes','Strawberry-Banana Crepe','$10','A fresh, flavorful fruit duo.',false,40),
    ('Crepes','Banana Cheesecake Crepe','$8','Bananas blended with creamy cheesecake filling.',false,50),
    ('Crepes','Strawberry Cheesecake Crepe','$9','Juicy strawberries meet decadent cheesecake.',false,60),
    ('Signature','Lavender Honey Latte','Small $7 · Medium $8','Lavender, honey, and soft cinnamon over espresso and milk. Served iced or hot.',true,10),
    ('Signature','Biscoff Latte','Small $7 · Medium $8','Espresso, milk, Biscoff cookie butter, and whipped cream. Served iced or hot.',true,20),
    ('Signature','S’more Latte','Small $7 · Medium $8','Chocolate, toasted marshmallow, cold foam, and graham cracker. Served iced or hot.',true,30)
) as approved(category, name, price_label, description, is_signature, sort)
where not exists (
  select 1 from menu_items existing where lower(existing.name) = lower(approved.name)
);

update catering_packages
set active = false
where
  (name = 'The Espresso Hour' and description = 'Full espresso bar service for up to 50 guests. Iced and hot menu, two baristas, styled trailer setup.')
  or (name = 'The Golden Event' and description = 'Our signature luxury experience: espresso bar, signature Golden Pulse menu, dessert display, and crepe station.')
  or (name = 'Corporate Perk' and description = 'Turn a Tuesday into the best day of the quarter. Branded menu boards, fast lines, invoice-friendly billing.');

insert into catering_packages (name, tag, description, bullet_points, base_price_cents, sort)
select approved.*
from (
  values
    ('The Signature Bar','Up to 50 guests','A luxury coffee experience with unlimited handcrafted drinks and a professional espresso bar.',array['Fresh roasted espresso','Hot & iced beverages','Premium syrups and milk choices','Setup and breakdown'],49900,10),
    ('The Paris Experience','Up to 100 guests','Everything in The Signature Bar, plus a live gourmet crepe station made fresh for every guest.',array['Unlimited handcrafted drinks','Unlimited fresh crepes','Elegant menu displays','Luxury presentation'],99900,20),
    ('The Grand Experience','Up to 200 guests','The flagship experience with Amy’s signature latte collection and the highest level of presentation.',array['Luxury coffee cart','Premium décor and floral accents','Personalized drink names','Priority staffing and professional setup'],199900,30)
) as approved(name, tag, description, bullet_points, base_price_cents, sort)
where not exists (
  select 1 from catering_packages existing where lower(existing.name) = lower(approved.name)
);
