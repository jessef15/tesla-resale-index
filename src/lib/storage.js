// src/lib/storage.js
// File-based storage using JSON. Zero dependencies, works everywhere.
// Each day gets its own snapshot file: data/snapshots/2026-03-02.json
// Summary index is stored in data/index.json

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

export function saveSnapshot(listings) {
  ensureDirs();
  const today = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();

  // Save full listings snapshot for today
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${today}.json`);
  writeJSON(snapshotFile, { timestamp, listings });

  // Update summary index
  const index = readJSON(INDEX_FILE, { snapshots: [] });

  // Compute per-model stats
  const statsByModel = computeStatsByModel(listings);

  // Remove today's entry if exists, add new one
  index.snapshots = index.snapshots.filter((s) => s.date !== today);
  index.snapshots.push({ date: today, timestamp, statsByModel });
  index.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  index.lastUpdated = timestamp;

  writeJSON(INDEX_FILE, index);
  return today;
}

// ─── READ ─────────────────────────────────────────────────────────────────────

export function getLatestSnapshot() {
  ensureDirs();
  const index = readJSON(INDEX_FILE, { snapshots: [] });
  if (!index.snapshots.length) return null;

  const latest = index.snapshots[index.snapshots.length - 1];
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${latest.date}.json`);
  return readJSON(snapshotFile, null);
}

export function getIndex() {
  ensureDirs();
  return readJSON(INDEX_FILE, { snapshots: [], lastUpdated: null });
}

export function getLastUpdated() {
  const index = readJSON(INDEX_FILE, {});
  return index.lastUpdated || null;
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export function computeStatsByModel(listings) {
  const groups = {};
  for (const l of listings) {
    if (!groups[l.model]) groups[l.model] = [];
    if (l.price) groups[l.model].push(l.price);
  }

  const result = {};
  for (const [model, prices] of Object.entries(groups)) {
    const sorted = [...prices].sort((a, b) => a - b);
    result[model] = {
      count: sorted.length,
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }
  return result;
}

export function groupByYear(listings, model) {
  const filtered = listings.filter((l) => l.model === model && l.year && l.price);
  const map = {};
  for (const l of filtered) {
    if (!map[l.year]) map[l.year] = [];
    map[l.year].push(l.price);
  }
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, prices]) => ({
      year: Number(year),
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      count: prices.length,
    }));
}

export function groupByTrim(listings, model) {
  const filtered = listings.filter((l) => l.model === model && l.trim && l.price);
  const map = {};
  for (const l of filtered) {
    if (!map[l.trim]) map[l.trim] = [];
    map[l.trim].push(l.price);
  }
  return Object.entries(map)
    .map(([trim, prices]) => ({
      trim,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);
}
