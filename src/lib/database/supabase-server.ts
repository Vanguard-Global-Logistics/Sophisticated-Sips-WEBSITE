import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True only when the public Supabase env vars exist. Public pages use this to
 *  fall back to static demo content instead of throwing when unconfigured. */
export function isSupabaseConfigured(): boolean {
  return !!URL && !!ANON;
}

/** Session-aware client, or null if Supabase isn't configured yet. Respects RLS. */
export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!URL || !ANON) return null;
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: CookieToSet[]) =>
        list.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options); } catch {}
        }),
    },
  });
}

/** Service-role client, or null if unconfigured. Server-only; bypasses RLS. */
export function supabaseAdmin(): SupabaseClient | null {
  if (!URL || !SERVICE) return null;
  return createClient(URL, SERVICE, { auth: { persistSession: false } });
}

/** Signed-in owner's email, or null. Null (not a crash) when unconfigured. */
export async function ownerEmail(): Promise<string | null> {
  const sb = await supabaseServer();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  if (email === process.env.OWNER_EMAIL?.toLowerCase()) return email;
  const admin = supabaseAdmin();
  if (!admin) return email === process.env.OWNER_EMAIL?.toLowerCase() ? email : null;
  const { data: row } = await admin.from("owners").select("email").eq("email", email).maybeSingle();
  return row ? email : null;
}

export async function requireOwner(): Promise<boolean> {
  return (await ownerEmail()) !== null;
}

/** For API routes that cannot work without the DB. Returns the admin client or null;
 *  callers return a clean 503 when null instead of throwing. */
export function adminOr503(): SupabaseClient | null {
  return supabaseAdmin();
}
