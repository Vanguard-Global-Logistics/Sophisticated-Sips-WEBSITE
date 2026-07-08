import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Session gate on /owner. If Supabase isn't configured, let the page render its own
 *  setup screen instead of throwing (which caused MIDDLEWARE_INVOCATION_FAILED). */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/owner/login") return NextResponse.next();
  if (!URL || !ANON) return NextResponse.next(); // unconfigured → page shows setup mode

  const res = NextResponse.next();
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) =>
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });

  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/owner/login", req.url));
  } catch {
    // Never 500 from middleware — fall through to the page, which handles auth/setup.
    return NextResponse.next();
  }
  return res;
}

export const config = { matcher: ["/owner/:path*", "/owner"] };
