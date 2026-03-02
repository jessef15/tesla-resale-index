"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MODELS = [
  { id: "m3", label: "Model 3", short: "3" },
  { id: "my", label: "Model Y", short: "Y" },
  { id: "ms", label: "Model S", short: "S" },
  { id: "mx", label: "Model X", short: "X" },
  { id: "mc", label: "Cybertruck", short: "CT" },
];

const COLORS = {
  m3: "#3B82F6",
  my: "#10B981",
  ms: "#F59E0B",
  mx: "#EF4444",
  mc: "#A78BFA",
};

const fmt = (n) =>
  n ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";

const fmtK = (n) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : fmt(n));

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0A1628",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "12px 16px",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontWeight: 700, color: "#E2E8F0", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "#94A3B8" }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {typeof p.value === "number" && p.value > 1000 ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, sub, accent }) {
  const isUp = delta > 0;
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderTop: `3px solid ${accent || "rgba(255,255,255,0.1)"}`,
      borderRadius: "0 0 12px 12px",
      padding: "20px 22px",
      flex: "1 1 160px",
    }}>
      <div style={{ color: "#475569", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ color: "#F1F5F9", fontSize: 26, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      {(delta !== undefined || sub) && (
        <div style={{ marginTop: 8, fontSize: 12, color: delta !== undefined ? (isUp ? "#EF4444" : "#10B981") : "#475569" }}>
          {delta !== undefined && <span>{isUp ? "▲" : "▼"} {fmt(Math.abs(delta))} vs prior</span>}
          {sub && <span style={{ color: "#475569" }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ─── PILL ─────────────────────────────────────────────────────────────────────
function Pill({ children, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : "transparent",
        border: `1.5px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
        borderRadius: 100,
        color: active ? "#fff" : "#64748B",
        padding: "7px 18px",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: 13,
        transition: "all 0.15s",
        letterSpacing: 0.2,
      }}
    >
      {children}
    </button>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeModel, setActiveModel] = useState("my");
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (model) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/data?model=${model}&days=90`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(activeModel); }, [activeModel, loadData]);

  const handleExport = async () => {
    const res = await fetch(`/api/data?view=export&model=${activeModel}`);
    const { listings, lastUpdated } = await res.json();
    const headers = ["model", "year", "trim", "price", "odometer", "color", "location", "scraped_at"];
    const rows = [headers.join(","), ...listings.map((l) =>
      headers.map((h) => JSON.stringify(l[h] ?? "")).join(",")
    )];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tesla_resale_${activeModel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const modelLabel = MODELS.find((m) => m.id === activeModel)?.label;
  const stats = data?.statsByModel?.[activeModel];
  const history = (data?.history || []).filter((h) => h.model === activeModel);
  const allHistory = data?.history || [];
  const byYear = data?.byYear || [];
  const byTrim = data?.byTrim || [];
  const listings = (data?.listings || []).filter((l) => l.model === activeModel);
  const color = COLORS[activeModel];

  // Build multi-model history for overview
  const historyByDate = {};
  for (const h of allHistory) {
    if (!historyByDate[h.date]) historyByDate[h.date] = { date: h.date };
    historyByDate[h.date][h.model] = h.median_price;
  }
  const multiHistory = Object.values(historyByDate).sort((a, b) => a.date.localeCompare(b.date));

  // Price delta (latest vs 30 days ago)
  const priceDelta = (() => {
    if (history.length < 2) return undefined;
    const latest = history[history.length - 1]?.median_price;
    const older = history[0]?.median_price;
    return latest && older ? latest - older : undefined;
  })();

  return (
    <>
      <style>{`
        :root {
          --font-body: 'Syne', sans-serif;
          --font-mono: 'IBM Plex Mono', monospace;
          --bg: #050D1A;
          --surface: rgba(255,255,255,0.03);
          --border: rgba(255,255,255,0.07);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: #F1F5F9; font-family: var(--font-body); }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #475569;
          padding: 10px 4px;
          cursor: pointer;
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .tab-btn.active {
          color: #F1F5F9;
          border-bottom-color: currentColor;
        }
        .listing-row:hover { background: rgba(255,255,255,0.03); }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
        }
        .section-label {
          color: #334155;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--bg)", backgroundImage: `radial-gradient(ellipse 80% 50% at 10% 0%, ${color}10 0%, transparent 60%)` }}>

        {/* ── HEADER ── */}
        <header style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(5,13,26,0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>Tesla Resale Index</div>
                <div style={{ fontSize: 11, color: "#334155", fontFamily: "var(--font-mono)" }}>
                  {data?.lastUpdated ? `Updated ${new Date(data.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Loading..."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleExport}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "#64748B",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                ↓ CSV
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=Tesla+${modelLabel}+median+resale+price:+${stats ? fmt(stats.median) : "check+it+out"}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                target="_blank"
                rel="noopener"
                style={{
                  background: color,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Share ↗
              </a>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

          {/* ── MODEL SELECTOR ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
            {MODELS.map((m) => (
              <Pill
                key={m.id}
                active={activeModel === m.id}
                color={COLORS[m.id]}
                onClick={() => { setActiveModel(m.id); setActiveTab("overview"); }}
              >
                {m.label}
              </Pill>
            ))}
          </div>

          {/* ── STAT CARDS ── */}
          {loading ? (
            <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ flex: "1 1 140px", height: 100, background: "var(--surface)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          ) : stats ? (
            <div style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
              <StatCard label="Median Price" value={fmt(stats.median)} delta={priceDelta} accent={color} />
              <StatCard label="Avg Price" value={fmt(stats.avg)} accent={color} />
              <StatCard label="Lowest" value={fmt(stats.min)} accent={color} />
              <StatCard label="Highest" value={fmt(stats.max)} accent={color} />
              <StatCard label="Listings" value={stats.count} sub=" in stock" accent={color} />
            </div>
          ) : (
            <div style={{ padding: "32px 0", color: "#334155", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {error ? `Error: ${error}` : "No data yet — trigger a scrape to populate"}
            </div>
          )}

          {/* ── TABS ── */}
          <div style={{ display: "flex", gap: 24, marginBottom: 28, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {["overview", "trend", "by year", "by trim", "listings"].map((tab) => (
              <button
                key={tab}
                className={`tab-btn${activeTab === tab ? " active" : ""}`}
                style={{ color: activeTab === tab ? color : undefined, borderBottomColor: activeTab === tab ? color : undefined }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="card">
              <div className="section-label">All Models — Median Price Comparison</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={MODELS.map((m) => ({
                    model: m.label,
                    price: data?.statsByModel?.[m.id]?.median || 0,
                    count: data?.statsByModel?.[m.id]?.count || 0,
                  }))}
                  barSize={48}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="model" tick={{ fill: "#475569", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar
                    dataKey="price"
                    name="Median Price"
                    radius={[6, 6, 0, 0]}
                    fill={color}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── TREND TAB ── */}
          {activeTab === "trend" && (
            <div className="card">
              <div className="section-label">Median Resale Price — All Models Over Time</div>
              {multiHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={multiHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#334155", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12, paddingTop: 16 }}
                      formatter={(val) => <span style={{ color: "#64748B" }}>{MODELS.find((m) => m.id === val)?.label || val}</span>}
                    />
                    {MODELS.map((m) => (
                      <Line
                        key={m.id}
                        type="monotone"
                        dataKey={m.id}
                        name={m.id}
                        stroke={COLORS[m.id]}
                        strokeWidth={m.id === activeModel ? 2.5 : 1.5}
                        dot={false}
                        opacity={m.id === activeModel ? 1 : 0.4}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#334155", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  Trend data builds over time with each daily scrape. Check back tomorrow. 📈
                </div>
              )}
            </div>
          )}

          {/* ── BY YEAR TAB ── */}
          {activeTab === "by year" && (
            <div className="card">
              <div className="section-label">{modelLabel} — Avg Resale Price by Model Year</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byYear} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 12, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="avgPrice" name="Avg Price" fill={color} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 24 }}>
                {byYear.map((y) => (
                  <div key={y.year} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color }}>{y.year}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{fmt(y.avgPrice)}</div>
                    <div style={{ color: "#334155", fontSize: 11, marginTop: 4, fontFamily: "var(--font-mono)" }}>{y.count} listings</div>
                    <div style={{ color: "#334155", fontSize: 10, marginTop: 2, fontFamily: "var(--font-mono)" }}>{fmt(y.minPrice)} – {fmt(y.maxPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BY TRIM TAB ── */}
          {activeTab === "by trim" && (
            <div className="card">
              <div className="section-label">{modelLabel} — Avg Price by Trim Level</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byTrim} layout="vertical" barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtK} tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="trim" tick={{ fill: "#64748B", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="avgPrice" name="Avg Price" fill={color} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── LISTINGS TAB ── */}
          {activeTab === "listings" && (
            <div className="card" style={{ overflowX: "auto" }}>
              <div className="section-label">{modelLabel} — {listings.length} Current Listings</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Year", "Trim", "Price", "Odometer", "$/Mile", "Location"].map((h) => (
                      <th key={h} style={{ color: "#334155", textAlign: "left", padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 400, letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l, i) => {
                    const ppm = l.odometer > 0 ? (l.price / l.odometer).toFixed(2) : null;
                    return (
                      <tr key={i} className="listing-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.1s" }}>
                        <td style={{ padding: "11px 12px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{l.year}</td>
                        <td style={{ padding: "11px 12px", fontWeight: 600 }}>{l.trim}</td>
                        <td style={{ padding: "11px 12px", color, fontWeight: 800 }}>{fmt(l.price)}</td>
                        <td style={{ padding: "11px 12px", color: "#64748B", fontFamily: "var(--font-mono)" }}>{l.odometer?.toLocaleString()} mi</td>
                        <td style={{ padding: "11px 12px", color: "#334155", fontFamily: "var(--font-mono)" }}>{ppm ? `$${ppm}` : "—"}</td>
                        <td style={{ padding: "11px 12px", color: "#475569", fontSize: 12 }}>{l.location || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── FOOTER ── */}
          <footer style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ color: "#1E293B", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
              Data sourced from Tesla Certified Pre-Owned inventory · Updated daily · Not affiliated with Tesla, Inc.
            </div>
            <div style={{ color: "#1E293B", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              Tesla Resale Index
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
