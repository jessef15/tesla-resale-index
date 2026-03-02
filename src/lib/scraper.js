// src/lib/scraper.js
const MODELS = ["m3", "my", "ms", "mx", "mc"];

export const MODEL_LABELS = {
  m3: "Model 3",
  my: "Model Y",
  ms: "Model S",
  mx: "Model X",
  mc: "Cybertruck",
};

async function fetchModel(modelId, zip = "30265", count = 50) {
  const query = {
    query: {
      model: modelId,
      condition: "used",
      market: "US",
      language: "en",
      super_region: "north america",
      zip,
      range: 0,
      region: "GA",
    },
    offset: 0,
    count,
    outsideOffset: 0,
    outsideSearch: true,
  };

  const url = `https://www.tesla.com/inventory/api/v4/inventory-results?query=${encodeURIComponent(JSON.stringify(query))}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.tesla.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(`Tesla API returned ${res.status} for model ${modelId}`);
    return [];
  }

  const data = await res.json();
  return data.results || [];
}

function normalizeListings(results, modelId) {
  return results
    .filter((r) => r.Price && r.Price > 5000)
    .map((r) => ({
      model: modelId,
      year: r.Year || null,
      trim: r.TrimName || r.TRIM_NAME || "Unknown",
      price: r.Price,
      odometer: r.Odometer || r.ODOMETER || 0,
      color: r.PAINT?.[0] || null,
      vin: r.VIN || null,
      is_demo: r.IsDemo || false,
      location: r.MetroName || r.City || null,
    }));
}

export async function scrapeAll(zip = "30265") {
  console.log(`[scraper] Starting scrape zip=${zip}`);
  const allListings = [];

  for (const modelId of MODELS) {
    try {
      console.log(`[scraper] Fetching ${MODEL_LABELS[modelId]}...`);
      const raw = await fetchModel(modelId, zip);
      const normalized = normalizeListings(raw, modelId);
      allListings.push(...normalized);
      console.log(`[scraper] ${MODEL_LABELS[modelId]}: ${normalized.length} listings`);
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`[scraper] Failed for ${modelId}:`, err.message);
    }
  }

  console.log(`[scraper] Done. Total: ${allListings.length}`);
  return allListings;
}

export { MODELS };
