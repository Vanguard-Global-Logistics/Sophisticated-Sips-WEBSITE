import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Protects /owner. Only a signed-in session matching OWNER_EMAIL gets through. */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/owner/login") return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
  getAll: () => req.cookies.getAll(),
  setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
    list.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options);
    });
  },
},
  const { data } = await supabase.auth.getUser();
  // Session gate only; owner authorization happens server-side (requireOwner + RLS),
  // which allows additional admins from the owners table and in-app ownership transfer.
  if (!data.user) {
    return NextResponse.redirect(new URL("/owner/login", req.url));
  }
  return res;
}

export const config = { matcher: ["/owner/:path*", "/owner"] };
