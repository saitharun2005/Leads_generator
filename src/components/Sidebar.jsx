import React from "react";
import { Settings, ShieldAlert, Trash2, Zap, Database, Sparkles } from "lucide-react";

export function Sidebar({
  activeTab,
  setActiveTab,
  creditsUsed,
  creditsLimit
}) {
  const percentage = Math.min((creditsUsed / creditsLimit) * 100, 100);

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div>
        <div className="logo-section">
          <div className="logo-icon">
            <Zap size={16} fill="white" color="white" />
          </div>
          <span className="logo-text">ProspectOS</span>
        </div>

        {/* Navigation Items */}
        <nav className="nav-menu">
          <div
            className={`nav-item ${activeTab === "play_scraper" ? "active" : ""}`}
            onClick={() => setActiveTab("play_scraper")}
          >
            <Database className="nav-item-icon" />
            <span>Play Store Scraper</span>
          </div>

          <div
            className={`nav-item ${activeTab === "app_enricher" ? "active" : ""}`}
            onClick={() => setActiveTab("app_enricher")}
          >
            <Sparkles className="nav-item-icon" />
            <span>LinkedIn &amp; Web Enricher</span>
          </div>

          <div
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="nav-item-icon" />
            <span>API Settings</span>
          </div>
        </nav>
      </div>

      {/* Credit meter progress bar */}
      <div className="credits-container">
        <div className="credits-header">
          <span className="credits-title">Scrape Credits</span>
          <span className="credits-value">{creditsUsed} / {creditsLimit}</span>
        </div>
        <div className="credits-bar-bg">
          <div
            className="credits-bar-fill"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </aside>
  );
}
