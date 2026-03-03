// src/app/api/data/route.js
import { NextResponse } from "next/server";
import {
  getLatestSnapshot,
  getIndex,
  getLastUpdated,
  computeStatsByModel,
  groupByYear,
  groupByTrim,
} from "@/lib/storage";

export const revalidate = 3600;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model");
  const view = searchParams.get("view") || "dashboard";

  try {
    const snapshot = getLatestSnapshot();
    const listings = snapshot?.listings || [];
    const lastUpdated = getLastUpdated();
    const index = getIndex();

    if (view === "export") {
      const filtered = model ? listings.filter((l) => l.model === model) : listings;
      return NextResponse.json({ listings: filtered, lastUpdated });
    }

    const statsByModel = computeStatsByModel(listings);
    const byYear = model ? groupByYear(listings, model) : [];
    const byTrim = model ? groupByTrim(listings, model) : [];

    // Build history from index snapshots
    const history = index.snapshots?.map((s) => ({
      date: s.date,
      ...Object.fromEntries(
        Object.entries(s.statsByModel || {}).map(([m, stats]) => [m, stats.median])
      ),
    })) || [];

    const filteredListings = model ? listings.filter((l) => l.model === model) : listings;

    return NextResponse.json({
      listings: filteredListings,
      history,
      statsByModel,
      byYear,
      byTrim,
      lastUpdated,
    });
  } catch (err) {
    console.error("[/api/data]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
