import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Session-aware client for server components / route handlers (respects RLS). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: CookieToSet[]) =>
          list.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {}
          }),
      },
    }
  );
}

/** Service-role client for trusted server code only (bypasses RLS). NEVER import in client components. */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Returns the signed-in owner's email, or null. Authorization source of truth is the
 *  `owners` table (so ownership is transferable in-app); the OWNER_EMAIL env var remains
 *  a break-glass bootstrap owner and should be rotated at transfer (see TRANSFER.md). */
export async function ownerEmail(): Promise<string | null> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  if (email === process.env.OWNER_EMAIL?.toLowerCase()) return email;
  const { data: row } = await supabaseAdmin().from("owners").select("email").eq("email", email).maybeSingle();
  return row ? email : null;
}

/** True only for an authenticated owner/admin session. */
export async function requireOwner() {
  return (await ownerEmail()) !== null;
}
