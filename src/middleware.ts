import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Protects /owner routes when Supabase is configured.
 * If Supabase is not configured yet, do not crash — let the owner pages show setup/demo mode.
 */
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/owner/login" || pathname === "/owner/setup" || pathname === "/owner/reset-password") {
    return NextResponse.next();
  }

  // Recovery default: matches supabase-server.ts and supabase-browser.ts.
  // All surviving Vercel projects should read Amy's recovered Supabase
  // project, even if an older deployment has a stale public key set.
  const supabaseUrl = "https://wzzfyvxvsymkenewpbzs.supabase.co";
  const supabaseAnonKey = "sb_publishable_8apPcpmpfBid2mIdjyTK7Q_7rSyMzx7";

  const res = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/owner/login";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/owner/:path*", "/owner"],
};