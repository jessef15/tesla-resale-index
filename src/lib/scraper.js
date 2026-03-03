const MODELS = ["m3", "my", "ms", "mx", "mc"];

export const MODEL_LABELS = {
  m3: "Model 3",
  my: "Model Y",
  ms: "Model S",
  mx: "Model X",
  mc: "Cybertruck",
};

async function fetchPage(modelId, zip, offset, count = 50) {
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
    offset,
    count,
    outsideOffset: 0,
    outsideSearch: true,
  };

  const url = `https://www.tesla.com/inventory/api/v4/inventory-results?query=${encodeURIComponent(JSON.stringify(query))}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.tesla.com/used",
      "Origin": "https://www.tesla.com",
      "sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
  });

  if (!res.ok) {
    console.warn(`Tesla API returned ${res.status} for model ${modelId} offset ${offset}`);
    return { results: [], totalMatchesFound: 0 };
  }

  const data = await res.json();
  return {
    results: data.results || [],
    totalMatchesFound: data.total_matches_found || 0,
  };
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

async function fetchAllPages(modelId, zip) {
  const PAGE_SIZE = 50;
  const MAX_LISTINGS = 500;
  let allResults = [];

  const first = await fetchPage(modelId, zip, 0, PAGE_SIZE);
  allResults.push(...first.results);
  const total = Math.min(first.totalMatchesFound, MAX_LISTINGS);
  console.log(`[scraper] ${MODEL_LABELS[modelId]}: ${total} total available`);

  let offset = PAGE_SIZE;
  while (offset < total && allResults.length < MAX_LISTINGS) {
    await new Promise((r) => setTimeout(r, 1000));
    const page = await fetchPage(modelId, zip, offset, PAGE_SIZE);
    if (!page.results.length) break;
    allResults.push(...page.results);
    offset += PAGE_SIZE;
    console.log(`[scraper] ${MODEL_LABELS[modelId]}: fetched ${allResults.length}/${total}`);
  }

  return allResults;
}

export async function scrapeAll(zip = "30265") {
  console.log(`[scraper] Starting scrape zip=${zip}`);
  const allListings = [];

  for (const modelId of MODELS) {
    try {
      const raw = await fetchAllPages(modelId, zip);
      const normalized = normalizeListings(raw, modelId);
      allListings.push(...normalized);
      console.log(`[scraper] ${MODEL_LABELS[modelId]}: saved ${normalized.length} listings`);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`[scraper] Failed for ${modelId}:`, err.message);
    }
  }

  console.log(`[scraper] Done. Total: ${allListings.length}`);
  return allListings;
}

export { MODELS };
