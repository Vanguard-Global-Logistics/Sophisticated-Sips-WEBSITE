import { describe, expect, it } from "vitest";
import {
  menuMigrationPlan,
  normalizeLegacyMenuRows,
  normalizeLegacyPackageRows,
  packageMigrationPlan,
} from "../src/lib/catalog-guard";
import { DEMO_MENU, DEMO_PACKAGES } from "../src/lib/demo-data";

const legacyMenu = [
  {
    id: "legacy-shaken",
    category: "Iced Espresso",
    name: "Shaken Espresso",
    price_label: "$4",
    description: "Double shots shaken over ice until silky and frothed.",
    is_signature: false,
    sort: 10,
    active: true,
  },
  {
    id: "legacy-dirty",
    category: "Non-Espresso",
    name: "Dirty Soda",
    price_label: "$5",
    description: "Soda, cream, and flavor — the fun one.",
    is_signature: false,
    sort: 20,
    active: true,
  },
];

const legacyPackages = [
  {
    id: "legacy-package",
    name: "The Espresso Hour",
    tag: "Up to 50",
    description: "Full espresso bar service for up to 50 guests. Iced and hot menu, two baristas, styled trailer setup.",
    bullet_points: [],
    base_price_cents: 35000,
    sort: 10,
    active: true,
  },
];

describe("catalog runtime guard", () => {
  it("replaces untouched legacy menu content with Amy's complete flyer catalog", () => {
    const menu = normalizeLegacyMenuRows(legacyMenu);
    expect(menu).toHaveLength(DEMO_MENU.length);
    expect(menu.find((item) => item.name === "Shaken Espresso")?.price_label).toBe("16 oz $5 · 20 oz $5.50");
    expect(menu.some((item) => item.name === "Dirty Soda")).toBe(false);
    expect(menu.filter((item) => item.category === "Crepes")).toHaveLength(6);
  });

  it("does not overwrite an Amy-edited catalog", () => {
    const edited = [{ ...legacyMenu[0], description: "Amy's custom description.", price_label: "$9" }];
    expect(normalizeLegacyMenuRows(edited)).toEqual(edited);
  });

  it("replaces untouched legacy packages with the three approved experiences", () => {
    const packages = normalizeLegacyPackageRows(legacyPackages);
    expect(packages.map((item) => item.name)).toEqual(DEMO_PACKAGES.map((item) => item.name));
    expect(packages.map((item) => item.base_price_cents)).toEqual([49900, 99900, 199900]);
  });
});

describe("catalog database reconciliation plan", () => {
  it("updates, retires, and inserts only what an unmigrated menu needs", () => {
    const plan = menuMigrationPlan(legacyMenu);
    expect(plan.updates).toHaveLength(1);
    expect(plan.deactivateIds).toEqual(["legacy-dirty"]);
    expect(plan.inserts).toHaveLength(DEMO_MENU.length - 1);
  });

  it("is a no-op once legacy rows are inactive or already changed", () => {
    const inactive = legacyMenu.map((item) => ({ ...item, active: false }));
    expect(menuMigrationPlan(inactive)).toEqual({ updates: [], deactivateIds: [], inserts: [] });
    expect(packageMigrationPlan(legacyPackages.map((item) => ({ ...item, active: false })))).toEqual({
      updates: [],
      deactivateIds: [],
      inserts: [],
    });
  });
});
