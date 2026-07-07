import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/database/supabase-server";

export const runtime = "nodejs";

/** Today's weather for Amy's morning dashboard. Open-Meteo: free, no API key. */
export async function GET() {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "owner only" }, { status: 401 });

  const lat = process.env.BUSINESS_LAT, lon = process.env.BUSINESS_LON;
  if (!lat || !lon) return NextResponse.json({ available: false });

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`,
      { next: { revalidate: 1800 } } // cache 30 min
    );
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    return NextResponse.json({
      available: true,
      high: Math.round(d.daily.temperature_2m_max[0]),
      low: Math.round(d.daily.temperature_2m_min[0]),
      rainChance: d.daily.precipitation_probability_max[0],
    });
  } catch {
    return NextResponse.json({ available: false });
  }
}
