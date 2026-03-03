import { scrapeAll } from "./src/lib/scraper.js";
import { saveSnapshot } from "./src/lib/storage.js";

console.log("Starting scrape...");
scrapeAll("30265").then((listings) => {
  if (!listings.length) {
    console.error("No listings returned!");
    process.exit(1);
  }
  saveSnapshot(listings);
  console.log(`Done! Saved ${listings.length} listings.`);
}).catch(console.error);
