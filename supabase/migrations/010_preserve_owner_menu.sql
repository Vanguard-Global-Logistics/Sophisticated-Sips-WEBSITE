-- Keep fresh environments aligned with Amy's owner-managed live catalog.
-- Existing owner edits are preserved: only the superseded flyer values change.
update menu_items
set price_label = '16 oz $5 · 24 oz $6'
where lower(name) = 'shaken espresso'
  and price_label = '16 oz $5 · 20 oz $5.50';

update menu_items
set price_label = '16 oz $6 · 24 oz $7'
where lower(name) in ('iced latte', 'iced macchiato')
  and price_label = '16 oz $6 · 20 oz $6.50';
