// src/app/api/scrape/route.js
import { scrapeAll } from "@/lib/scraper";
import { saveSnapshot } from "@/lib/storage";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const zip = body.zip || process.env.DEFAULT_ZIP || "30265";

  try {
    const listings = await scrapeAll(zip);
    if (!listings.length) {
      return NextResponse.json({ error: "No listings returned" }, { status: 502 });
    }
    const date = saveSnapshot(listings);
    return NextResponse.json({ success: true, date, count: listings.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const { getLastUpdated, getIndex } = await import("@/lib/storage");
  const lastUpdated = getLastUpdated();
  const index = getIndex();
  return NextResponse.json({ lastUpdated, totalSnapshots: index.snapshots?.length || 0 });
}
