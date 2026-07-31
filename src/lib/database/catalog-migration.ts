import type { SupabaseClient } from "@supabase/supabase-js";
import {
  menuMigrationPlan,
  packageMigrationPlan,
  type MenuCatalogRow,
  type PackageCatalogRow,
} from "@/lib/catalog-guard";

/**
 * Reconciles untouched launch-demo rows only after a verified owner session.
 * It is idempotent and leaves Amy-edited rows alone.
 */
export async function reconcileAmyFlyerCatalog(db: SupabaseClient): Promise<boolean> {
  const [menuResult, packageResult] = await Promise.all([
    db.from("menu_items").select("*").order("category").order("sort"),
    db.from("catering_packages").select("*").order("sort"),
  ]);
  if (menuResult.error) throw menuResult.error;
  if (packageResult.error) throw packageResult.error;

  const menuPlan = menuMigrationPlan((menuResult.data ?? []) as MenuCatalogRow[]);
  const packagePlan = packageMigrationPlan((packageResult.data ?? []) as PackageCatalogRow[]);
  const jobs: PromiseLike<unknown>[] = [];

  for (const update of menuPlan.updates) {
    jobs.push(db.from("menu_items").update(update.values).eq("id", update.id));
  }
  for (const id of menuPlan.deactivateIds) {
    jobs.push(db.from("menu_items").update({ active: false }).eq("id", id));
  }
  if (menuPlan.inserts.length) {
    jobs.push(db.from("menu_items").insert(menuPlan.inserts));
  }

  for (const id of packagePlan.deactivateIds) {
    jobs.push(db.from("catering_packages").update({ active: false }).eq("id", id));
  }
  if (packagePlan.inserts.length) {
    jobs.push(db.from("catering_packages").insert(packagePlan.inserts));
  }

  const results = await Promise.all(jobs);
  const failed = results.find((result: any) => result?.error) as { error?: unknown } | undefined;
  if (failed?.error) throw failed.error;
  return jobs.length > 0;
}
