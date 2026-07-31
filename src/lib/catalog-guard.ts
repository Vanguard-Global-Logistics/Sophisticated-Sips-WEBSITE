import { DEMO_MENU, DEMO_PACKAGES } from "./demo-data";

export type MenuCatalogRow = {
  id?: string;
  category: string;
  name: string;
  price_label: string;
  description?: string | null;
  is_signature?: boolean;
  sort?: number;
  active?: boolean;
  sold_out?: boolean;
  photo_url?: string | null;
};

export type PackageCatalogRow = {
  id?: string;
  name: string;
  tag?: string | null;
  description?: string | null;
  bullet_points?: string[] | null;
  base_price_cents?: number | null;
  sort?: number;
  active?: boolean;
};

const LEGACY_MENU_DESCRIPTIONS = new Map<string, string>([
  ["shaken espresso", "Double shots shaken over ice until silky and frothed."],
  ["iced latte", "Espresso and cold milk over ice, finished your way."],
  ["iced macchiato", "Layered espresso poured slow over vanilla milk."],
  ["americano", "Rich espresso lengthened with hot water."],
  ["café latte", "Velvet-steamed milk over a double shot."],
  ["espresso shot", "Pulled fresh, crema-crowned."],
  ["red bull italian cream soda", "Sparkling energy with sweet cream and syrup."],
  ["italian soda", "Sparkling water with artisan flavor syrups."],
  ["hot chocolate", "Real cocoa, steamed milk, whipped topping."],
  ["hot tea", "A curated selection of premium teas."],
  ["red bull", "Chilled, classic or sugar-free."],
  ["water", "Bottled and chilled."],
]);

const RETIRED_MENU_DESCRIPTIONS = new Map<string, string>([
  ["dirty soda", "Soda, cream, and flavor — the fun one."],
  ["soda pop can", "Assorted favorites, ice cold."],
  ["golden pulse latte", "Our house latte with a champagne-gold turmeric-honey finish."],
  ["golden pulse crepe", "Warm crepe, caramelized honey butter, gold dusting."],
  ["oreo artisan cheesecake", "Hand-finished cheesecake on a dark cookie crust."],
  ["peppermint pulse cheesecake", "Cool peppermint over velvet cheesecake."],
]);

const LEGACY_PACKAGE_DESCRIPTIONS = new Map<string, string>([
  ["the espresso hour", "Full espresso bar service for up to 50 guests. Iced and hot menu, two baristas, styled trailer setup."],
  ["the golden event", "Our signature luxury experience: espresso bar, signature Golden Pulse menu, dessert display, and crepe station."],
  ["corporate perk", "Turn a Tuesday into the best day of the quarter. Branded menu boards, fast lines, invoice-friendly billing."],
]);

const key = (value: string) => value.trim().toLocaleLowerCase("en-US");
const matches = (row: { name: string; description?: string | null }, descriptions: Map<string, string>) =>
  descriptions.get(key(row.name)) === row.description;

const approvedMenuByName = new Map(DEMO_MENU.map((item) => [key(item.name), item]));

/**
 * Protects production while an older database is waiting for migration 008.
 * The guard activates only when an untouched launch-demo row is present.
 * Amy-edited catalogs pass through unchanged.
 */
export function normalizeLegacyMenuRows(rows: MenuCatalogRow[]): MenuCatalogRow[] {
  const legacyDetected = rows.some((row) =>
    row.active !== false &&
    (matches(row, LEGACY_MENU_DESCRIPTIONS) || matches(row, RETIRED_MENU_DESCRIPTIONS))
  );
  if (!legacyDetected) return rows;

  const normalized = rows.flatMap((row) => {
    if (matches(row, RETIRED_MENU_DESCRIPTIONS)) return [];
    if (!matches(row, LEGACY_MENU_DESCRIPTIONS)) return [row];

    const approved = approvedMenuByName.get(key(row.name));
    if (!approved) return [row];
    const { id: _fallbackId, ...approvedFields } = approved;
    return [{ ...row, ...approvedFields }];
  });

  const existingNames = new Set(normalized.map((item) => key(item.name)));
  for (const approved of DEMO_MENU) {
    if (existingNames.has(key(approved.name))) continue;
    normalized.push({
      ...approved,
      id: `flyer-${approved.id}`,
      active: true,
      sold_out: false,
      photo_url: null,
    });
  }
  return normalized;
}

/** Same migration guard for the three approved catering experiences. */
export function normalizeLegacyPackageRows(rows: PackageCatalogRow[]): PackageCatalogRow[] {
  const legacyDetected = rows.some((row) =>
    row.active !== false && matches(row, LEGACY_PACKAGE_DESCRIPTIONS)
  );
  if (!legacyDetected) return rows;

  const normalized = rows.filter((row) => !matches(row, LEGACY_PACKAGE_DESCRIPTIONS));
  const existingNames = new Set(normalized.map((item) => key(item.name)));
  for (const approved of DEMO_PACKAGES) {
    if (existingNames.has(key(approved.name))) continue;
    normalized.push({ ...approved, id: `flyer-${approved.id}`, active: true });
  }
  return normalized;
}

export type CatalogMigrationPlan<T> = {
  updates: Array<{ id: string; values: Partial<T> }>;
  deactivateIds: string[];
  inserts: T[];
};

/** Pure plan used by the authenticated owner-side reconciliation. */
export function menuMigrationPlan(rows: MenuCatalogRow[]): CatalogMigrationPlan<MenuCatalogRow> {
  const activeLegacyDetected = rows.some((row) =>
    row.active !== false &&
    (matches(row, LEGACY_MENU_DESCRIPTIONS) || matches(row, RETIRED_MENU_DESCRIPTIONS))
  );
  if (!activeLegacyDetected) return { updates: [], deactivateIds: [], inserts: [] };

  const updates: CatalogMigrationPlan<MenuCatalogRow>["updates"] = [];
  const deactivateIds: string[] = [];
  for (const row of rows) {
    if (row.active === false || !row.id) continue;
    if (matches(row, RETIRED_MENU_DESCRIPTIONS)) {
      deactivateIds.push(row.id);
      continue;
    }
    if (!matches(row, LEGACY_MENU_DESCRIPTIONS)) continue;
    const approved = approvedMenuByName.get(key(row.name));
    if (!approved) continue;
    const { id: _fallbackId, ...values } = approved;
    updates.push({ id: row.id, values });
  }

  const existingNames = new Set(rows.map((item) => key(item.name)));
  const inserts = DEMO_MENU
    .filter((item) => !existingNames.has(key(item.name)))
    .map(({ id: _fallbackId, ...item }) => ({
      ...item,
      active: true,
      sold_out: false,
      photo_url: null,
    }));

  return { updates, deactivateIds, inserts };
}

export function packageMigrationPlan(rows: PackageCatalogRow[]): CatalogMigrationPlan<PackageCatalogRow> {
  const activeLegacyDetected = rows.some((row) =>
    row.active !== false && matches(row, LEGACY_PACKAGE_DESCRIPTIONS)
  );
  if (!activeLegacyDetected) return { updates: [], deactivateIds: [], inserts: [] };

  const deactivateIds = rows
    .filter((row) => row.active !== false && row.id && matches(row, LEGACY_PACKAGE_DESCRIPTIONS))
    .map((row) => row.id as string);
  const existingNames = new Set(rows.map((item) => key(item.name)));
  const inserts = DEMO_PACKAGES
    .filter((item) => !existingNames.has(key(item.name)))
    .map(({ id: _fallbackId, ...item }) => ({ ...item, active: true }));

  return { updates: [], deactivateIds, inserts };
}
