"use client";
import { createBrowserClient } from "@supabase/ssr";

const RECOVERED_URL = "https://wzzfyvxvsymkenewpbzs.supabase.co";
const RECOVERED_PUBLISHABLE_KEY = "sb_publishable_8apPcpmpfBid2mIdjyTK7Q_7rSyMzx7";

export function supabaseBrowser() {
  return createBrowserClient(RECOVERED_URL, RECOVERED_PUBLISHABLE_KEY);
}
