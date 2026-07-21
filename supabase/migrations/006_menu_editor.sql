-- 006_menu_editor.sql — owner menu editor support (upgrade only; safe to re-run)
-- Adds a temporary "sold out" flag and an optional photo URL to menu_items.
-- `active` remains the availability flag (shown on / hidden from the public menu);
-- `sold_out` is a softer, temporary "86'd for today" state that still shows the item
-- but marks it unavailable. Prices stay as human-readable text in `price_label`.
alter table menu_items add column if not exists sold_out boolean default false;
alter table menu_items add column if not exists photo_url text;
