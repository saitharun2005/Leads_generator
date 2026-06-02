import React, { useState } from "react";
import { Search, Mail, Smartphone, Globe, ExternalLink, RefreshCw, Database, MapPin, Download, Sparkles, Trash2 } from "lucide-react";

// ──────────────────────────────────────────────
// Email Pill with copy-to-clipboard
// ──────────────────────────────────────────────
function EmailPill({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!email) return <span className="empty-cell-dash">—</span>;

  return (
    <div
      className={`email-copy-pill ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title="Click to copy email"
    >
      <Mail size={12} style={{ flexShrink: 0 }} />
      <span>{copied ? "Copied!" : email}</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// App logo with graceful fallback
// ──────────────────────────────────────────────
function AppLogo({ logo, appName }) {
  const [failed, setFailed] = useState(false);
  const initial = appName ? appName.charAt(0).toUpperCase() : "A";
  const hue = (appName || "A").charCodeAt(0) * 17 % 360;

  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt={appName}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          objectFit: "cover",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "block",
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        background: `hsl(${hue}, 60%, 30%)`,
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "15px",
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

// ──────────────────────────────────────────────
// Downloads badge (colour-coded)
// ──────────────────────────────────────────────
function DownloadsBadge({ value }) {
  if (!value || value === "N/A") return <span className="empty-cell-dash">—</span>;

  const lower = value.toLowerCase();
  let color = "#6b7280"; // grey default
  if (lower.includes("b") || lower.includes("500m") || lower.includes("1b")) color = "#10b981";
  else if (lower.includes("m")) color = "#3b82f6";
  else if (lower.includes("k")) color = "#f59e0b";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "20px",
        background: `${color}20`,
        border: `1px solid ${color}40`,
        color,
        fontWeight: 600,
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      <Download size={11} />
      {value}
    </span>
  );
}

// ──────────────────────────────────────────────
// Categories & download ranges
// ──────────────────────────────────────────────
const CATEGORY_GROUPS = {
  "E-Commerce-Related Categories": [
    "Shopping",
    "Finance",
    "Business",
    "Food & Drink",
    "Travel & Local"
  ],
  "Education-Related Categories": [
    "Education",
    "Books & Reference",
    "News & Magazines",
    "Parenting",
    "Health & Fitness",
    "Productivity"
  ]
};

const CATEGORIES = [
  ...CATEGORY_GROUPS["E-Commerce-Related Categories"],
  ...CATEGORY_GROUPS["Education-Related Categories"]
];

const DOWNLOAD_RANGES = [
  { label: "All Downloads", value: "" },
  { label: "1 – 100",       value: "1-100" },
  { label: "100 – 1,000",   value: "100-1000" },
  { label: "1K – 2K",       value: "1k-2k" },
  { label: "2K – 5K",       value: "2k-5k" },
  { label: "5K – 10K",      value: "5k-10k" },
  { label: "10K – 15K",     value: "10k-15k" },
  { label: "15K – 20K",     value: "15k-20k" },
  { label: "20K – 30K",     value: "20k-30k" },
  { label: "30K – 50K",     value: "30k-50k" },
  { label: "50K – 100K",    value: "50k-100k" },
  { label: "100K – 500K",   value: "100k-500k" },
  { label: "500K – 1M",     value: "500k-1m" },
  { label: "1M – 5M",       value: "1m-5m" },
  { label: "5M – 10M",      value: "5m-10m" },
  { label: "10M – 50M",     value: "10m-50m" },
  { label: "50M+",          value: "50m-10b" },
];

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export function PlayScraper({ showToast, onSendToEnricher, enrichQueue = [] }) {
  const [activeSubTab, setActiveSubTab] = useState("scraper"); // 'scraper', 'recents'
  const [category, setCategory] = useState("Shopping");
  const [downloads, setDownloads] = useState("");
  const [apps, setApps] = useState([]);
  const [recentScrapes, setRecentScrapes] = useState([]);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapePhase, setScrapePhase] = useState("idle");
  const [selectedAppIds, setSelectedAppIds] = useState(new Set());

  // Clear selection on new apps load
  React.useEffect(() => {
    setSelectedAppIds(new Set());
  }, [apps]);

  // Load recent scrapes on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("prospectos_recent_scrapes");
    if (saved) {
      try {
        setRecentScrapes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent scrapes:", e);
      }
    }
  }, []);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!category) {
      showToast("Please select a Category.", "error");
      return;
    }

    setIsScraping(true);
    setApps([]);
    setScrapePhase("searching");

    const t1 = setTimeout(() => setScrapePhase("scraping"), 3000);
    const t2 = setTimeout(() => setScrapePhase("filtering"), 8000);

    try {
      const res = await fetch("/api/scrape/play-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, downloads }),
      });

      if (res.ok) {
        const data = await res.json();
        setScrapePhase("done");
        setApps(data.apps || []);
        showToast(
          `Found ${data.apps ? data.apps.length : 0} verified Indian apps!`,
          "success"
        );

        // Save run to recent scrapes
        if (data.apps && data.apps.length > 0) {
          const newScrape = {
            id: `scrape_${Date.now()}`,
            timestamp: new Date().toISOString(),
            category,
            downloads: DOWNLOAD_RANGES.find(r => r.value === downloads)?.label || downloads || "All Downloads",
            appsCount: data.apps.length,
            apps: data.apps
          };
          setRecentScrapes(prev => {
            const updated = [newScrape, ...prev].slice(0, 10);
            localStorage.setItem("prospectos_recent_scrapes", JSON.stringify(updated));
            return updated;
          });
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || "Scraping failed");
      }
    } catch (err) {
      console.error("Scraping error:", err);
      showToast(err.message, "error");
      setScrapePhase("idle");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsScraping(false);
    }
  };

  const handleLoadRecentScrape = (scrape) => {
    setCategory(scrape.category);
    
    // Resolve the internal value for downloads filter
    const matchedRange = DOWNLOAD_RANGES.find(r => r.label === scrape.downloads || r.value === scrape.downloads);
    setDownloads(matchedRange ? matchedRange.value : (scrape.downloads === "All Downloads" ? "" : scrape.downloads));
    
    setApps(scrape.apps);
    setActiveSubTab("scraper");
    showToast(`Loaded ${scrape.apps.length} apps from recent scrape of "${scrape.category}" (${scrape.downloads})!`, "success");
  };

  const handleDeleteRecentScrape = (scrapeId, e) => {
    e.stopPropagation();
    setRecentScrapes(prev => {
      const updated = prev.filter(item => item.id !== scrapeId);
      localStorage.setItem("prospectos_recent_scrapes", JSON.stringify(updated));
      return updated;
    });
    showToast("Recent scrape removed", "success");
  };

  // Download CSV logic
  const handleDownloadCSV = () => {
    if (!apps || apps.length === 0) return;

    // Define CSV headers
    const headers = [
      "No.",
      "App Name",
      "App ID",
      "Downloads",
      "Category",
      "Developer",
      "Email Address",
      "Location (India)",
      "Website",
      "Play Store URL"
    ];

    // Convert apps to rows
    const rows = apps.map((app, index) => [
      index + 1,
      app.appName || "",
      app.appId || "",
      app.downloads || "",
      app.category || "",
      app.developerName || "",
      app.email || "",
      app.place || "",
      app.website || "",
      app.playUrl || ""
    ]);

    // Format fields (handling quotes, commas, newlines)
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      let stringified = String(val);
      stringified = stringified.replace(/"/g, '""');
      if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n") || stringified.includes("\r")) {
        return `"${stringified}"`;
      }
      return stringified;
    };

    // Combine headers and rows
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\r\n");

    // Create Blob and trigger browser download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const formattedCategory = category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `play_store_scraper_${formattedCategory}_${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`CSV downloaded successfully: ${filename}`, "success");
  };

  // ────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────
  return (
    <div className="finder-pane">
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontSize: "22px",
            marginBottom: "4px",
          }}
        >
          Indian App Store Scraper
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Scrape verified Indian apps directly from Google Play Store — real
          logos, emails, and developer locations.
        </p>
      </div>

      {/* Sub-tab navigation */}
      <div 
        style={{ 
          display: "flex", 
          gap: "8px", 
          marginBottom: "20px", 
          borderBottom: "1px solid var(--border-light)", 
          paddingBottom: "1px" 
        }}
      >
        <button
          onClick={() => setActiveSubTab("scraper")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeSubTab === "scraper" ? "2px solid var(--accent-blue-hover)" : "2px solid transparent",
            color: activeSubTab === "scraper" ? "var(--text-primary)" : "var(--text-secondary)",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all var(--transition-fast)"
          }}
        >
          Run Scraper
        </button>
        <button
          onClick={() => setActiveSubTab("recents")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeSubTab === "recents" ? "2px solid var(--accent-blue-hover)" : "2px solid transparent",
            color: activeSubTab === "recents" ? "var(--text-primary)" : "var(--text-secondary)",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span>Recent Scrapes</span>
          {recentScrapes.length > 0 && (
            <span 
              style={{ 
                fontSize: "10px", 
                backgroundColor: "var(--bg-tertiary)", 
                padding: "2px 6px", 
                borderRadius: "10px",
                color: "var(--text-secondary)",
                fontWeight: 700
              }}
            >
              {recentScrapes.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "scraper" && (
        <>
          {/* Form */}
          <div className="prompt-container" style={{ padding: "20px" }}>
        <form onSubmit={handleScrape}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "16px",
            }}
          >
            {/* Category */}
            <div className="settings-field">
              <label className="field-label" style={{ fontSize: "11px" }}>
                App Category
              </label>
              <select
                className="sort-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isScraping}
                style={{
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-medium)",
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                }}
              >
                {Object.entries(CATEGORY_GROUPS).map(([groupName, cats]) => (
                  <optgroup key={groupName} label={groupName}>
                    {cats.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Downloads */}
            <div className="settings-field">
              <label className="field-label" style={{ fontSize: "11px" }}>
                Downloads Range
              </label>
              <select
                className="sort-select"
                value={downloads}
                onChange={(e) => setDownloads(e.target.value)}
                disabled={isScraping}
                style={{
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-medium)",
                  width: "100%",
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                }}
              >
                {DOWNLOAD_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              * Fetches real app data — logo, email, address — directly from
              Google Play India
            </span>
            <button
              type="submit"
              className="save-settings-btn"
              disabled={isScraping || !category}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {isScraping ? (
                <>
                  <RefreshCw size={16} className="pipeline-spinner" />
                  <span>Scraping Play Store...</span>
                </>
              ) : (
                <>
                  <Database size={16} />
                  <span>Scrape Play Store</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Progress */}
      {isScraping && (
        <div className="pipeline-progress-box">
          <div className="pipeline-header">
            <div className="pipeline-spinner"></div>
            <span className="pipeline-title">
              Scraping Google Play India · Category: {category}
            </span>
          </div>
          <div className="pipeline-steps">
            <div
              className={`pipeline-step ${
                scrapePhase === "searching"
                  ? "active"
                  : ["scraping", "filtering", "done"].includes(scrapePhase)
                  ? "done"
                  : "pending"
              }`}
            >
              <div className="step-indicator">1</div>
              <span className="step-label">
                Browsing Play Store Category Page
              </span>
            </div>
            <div
              className={`pipeline-step ${
                scrapePhase === "scraping"
                  ? "active"
                  : ["filtering", "done"].includes(scrapePhase)
                  ? "done"
                  : "pending"
              }`}
            >
              <div className="step-indicator">2</div>
              <span className="step-label">
                Fetching App Details &amp; Logos
              </span>
            </div>
            <div
              className={`pipeline-step ${
                scrapePhase === "filtering"
                  ? "active"
                  : scrapePhase === "done"
                  ? "done"
                  : "pending"
              }`}
            >
              <div className="step-indicator">3</div>
              <span className="step-label">
                Filtering Indian Developers &amp; Organisations
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {apps.length > 0 ? (
        <div className="table-container">
          <div className="table-card">
            {/* Results count bar */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={14} style={{ color: "var(--accent-blue-hover)" }} />
                <span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {apps.length}
                  </strong>{" "}
                  verified Indian apps in{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {category}
                  </strong>
                </span>
              </div>

              {/* Multi-select queue button */}
              {selectedAppIds.size > 0 && (
                <button
                  onClick={() => {
                    const selectedApps = apps.filter(a => selectedAppIds.has(a.appId));
                    onSendToEnricher(selectedApps);
                    setSelectedAppIds(new Set());
                  }}
                  className="save-list-action-btn"
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--accent-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  <Sparkles size={13} fill="white" />
                  <span>Queue Selected ({selectedAppIds.size})</span>
                </button>
              )}
              
              <button
                onClick={handleDownloadCSV}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(37, 99, 219, 0.1)",
                  border: "1px solid rgba(37, 99, 219, 0.2)",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--accent-blue-hover)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-blue)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(37, 99, 219, 0.1)";
                  e.currentTarget.style.color = "var(--accent-blue-hover)";
                  e.currentTarget.style.borderColor = "rgba(37, 99, 219, 0.2)";
                }}
              >
                <Download size={13} />
                <span>Download CSV</span>
              </button>
            </div>

            <div className="table-wrapper">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={apps.length > 0 && selectedAppIds.size === apps.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds(new Set(apps.map(a => a.appId)));
                          } else {
                            setSelectedAppIds(new Set());
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: "36px", textAlign: "center" }}>#</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Icon</th>
                    <th>App Name</th>
                    <th>Downloads</th>
                    <th>Category</th>
                    <th>Developer</th>
                    <th>Email</th>
                    <th>Place (India)</th>
                    <th style={{ width: "110px", textAlign: "center" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, idx) => {
                    const isQueued = enrichQueue.some(q => q.appId === app.appId);
                    return (
                      <tr key={app.appId || idx}>
                      <td style={{ textAlign: "center", width: "40px" }}>
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={selectedAppIds.has(app.appId)}
                          onChange={(e) => {
                            const next = new Set(selectedAppIds);
                            if (e.target.checked) {
                              next.add(app.appId);
                            } else {
                              next.delete(app.appId);
                            }
                            setSelectedAppIds(next);
                          }}
                        />
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          textAlign: "center",
                          fontWeight: "bold",
                          width: "36px",
                        }}
                      >
                        {idx + 1}
                      </td>

                      {/* Logo */}
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          width: "50px",
                        }}
                      >
                        <div
                          style={{ display: "flex", justifyContent: "center" }}
                        >
                          <AppLogo logo={app.logo} appName={app.appName} />
                        </div>
                      </td>

                      {/* App name */}
                      <td style={{ fontWeight: 600, maxWidth: "220px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={app.appName}
                          >
                            {app.appName}
                          </span>
                          {app.appId && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--text-muted)",
                                fontWeight: 400,
                                fontFamily: "monospace",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={app.appId}
                            >
                              {app.appId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Downloads */}
                      <td>
                        <DownloadsBadge value={app.downloads} />
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          className="intent-mini-tag"
                          style={{ border: "1px solid var(--border-medium)" }}
                        >
                          {app.category}
                        </span>
                      </td>

                      {/* Developer */}
                      <td
                        style={{
                          fontWeight: 500,
                          maxWidth: "180px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={app.developerName}
                      >
                        {app.developerName}
                      </td>

                      {/* Email */}
                      <td>
                        <EmailPill email={app.email} />
                      </td>

                      {/* Place */}
                      <td>
                        {app.place ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "6px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <MapPin
                              size={12}
                              style={{
                                flexShrink: 0,
                                color: "var(--text-muted)",
                                marginTop: "2px",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "12px",
                                lineHeight: "1.4",
                                maxWidth: "220px",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                              title={app.place}
                            >
                              {app.place}
                            </span>
                          </div>
                        ) : (
                          <span className="empty-cell-dash">—</span>
                        )}
                      </td>

                      {/* Links */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                          }}
                        >
                          {app.website && (
                            <a
                              href={app.website}
                              target="_blank"
                              rel="noreferrer"
                              title="Developer Website"
                              style={{
                                color: "var(--text-muted)",
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color =
                                  "var(--text-primary)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color =
                                  "var(--text-muted)")
                              }
                            >
                              <Globe size={14} />
                            </a>
                          )}
                          <a
                            href={app.playUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open on Google Play Store"
                            style={{ color: "var(--accent-blue-hover)", display: "flex", alignItems: "center" }}
                          >
                            <ExternalLink size={14} />
                          </a>

                          <button
                            onClick={() => onSendToEnricher(app)}
                            title={isQueued ? "Already in Enrichment Queue" : "Send to LinkedIn/Web Enricher"}
                            disabled={isQueued}
                            style={{
                              background: "none",
                              border: "none",
                              color: isQueued ? "#10b981" : "var(--text-muted)",
                              cursor: isQueued ? "default" : "pointer",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              padding: 0
                            }}
                            onMouseEnter={(e) => {
                              if (!isQueued) e.currentTarget.style.color = "var(--accent-blue-hover)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isQueued) e.currentTarget.style.color = "var(--text-muted)";
                            }}
                          >
                            <Sparkles size={14} fill={isQueued ? "#10b981" : "none"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        !isScraping && (
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px",
              color: "var(--text-secondary)",
            }}
          >
            <Database
              size={48}
              style={{ color: "var(--border-active)", marginBottom: "16px" }}
            />
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              Ready to Scrape Indian App Data
            </h3>
            <p
              style={{
                fontSize: "14px",
                maxWidth: "450px",
                textAlign: "center",
                lineHeight: "1.5",
              }}
            >
              Select a category and downloads range, then click{" "}
              <strong>Scrape Play Store</strong> to fetch real app logos,
              developer emails, addresses, and more — directly from Google Play
              India.
            </p>
          </div>
        )
      )}
      </>
      )}

      {activeSubTab === "recents" && (
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {recentScrapes.length === 0 ? (
            <div
              style={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                color: "var(--text-secondary)",
              }}
            >
              <Database
                size={48}
                style={{ color: "var(--border-active)", marginBottom: "16px" }}
              />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                No Recent Scrapes Yet
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  maxWidth: "450px",
                  textAlign: "center",
                  lineHeight: "1.5",
                }}
              >
                Go to the <strong>Run Scraper</strong> tab to search and discover Indian apps. Your successful scrape runs will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <div className="table-card">
                <div className="table-wrapper">
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th style={{ width: "60px", textAlign: "center" }}>#</th>
                        <th>Scraped Date &amp; Time</th>
                        <th>Category</th>
                        <th>Downloads Filter</th>
                        <th>Apps Found</th>
                        <th style={{ width: "160px", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScrapes.map((scrape, idx) => {
                        const dateObj = new Date(scrape.timestamp);
                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        
                        return (
                          <tr key={scrape.id} style={{ cursor: "pointer" }} onClick={() => handleLoadRecentScrape(scrape)}>
                            <td style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "bold" }}>
                              {idx + 1}
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span style={{ fontWeight: 600 }}>{dateStr}</span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{timeStr}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className="intent-mini-tag"
                                style={{ border: "1px solid var(--border-medium)" }}
                              >
                                {scrape.category}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-secondary)" }}>
                              {scrape.downloads}
                            </td>
                            <td>
                              <span 
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 8px",
                                  borderRadius: "20px",
                                  background: "rgba(37, 99, 219, 0.1)",
                                  border: "1px solid rgba(37, 99, 219, 0.2)",
                                  color: "var(--accent-blue-hover)",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                }}
                              >
                                <Smartphone size={11} />
                                {scrape.appsCount} apps
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }} onClick={e => e.stopPropagation()}>
                                <button
                                  className="save-list-action-btn"
                                  onClick={() => handleLoadRecentScrape(scrape)}
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "var(--accent-blue)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Load Scrape
                                </button>
                                <button
                                  onClick={(e) => handleDeleteRecentScrape(scrape.id, e)}
                                  title="Remove Scrape"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: 0
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--score-red-text)"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
