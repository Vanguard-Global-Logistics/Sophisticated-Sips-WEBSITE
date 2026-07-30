"use client";
import { createBrowserClient } from "@supabase/ssr";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || "sb_publishable_8apPcpmpfBid2mIdjyTK7Q_7rSyMzx7";

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Supabase URL is not configured.");
  return createBrowserClient(url, PUBLISHABLE_KEY);
}
