import React, { useState } from "react";
import { Key, Bot, Shield } from "lucide-react";

export function Settings({ settings, fetchSettings, showToast }) {
  const [geminiKey, setGeminiKey] = useState("");
  const [simMode, setSimMode] = useState(settings.simulationMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          geminiApiKey: geminiKey || undefined,
          simulationMode: simMode
        })
      });

      if (res.ok) {
        showToast("Settings updated successfully!", "success");
        setGeminiKey("");
        fetchSettings(); // Refresh masking state in parent
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      showToast("Error updating settings", "error");
    }
  };

  return (
    <div className="settings-pane">
      <h1 className="settings-heading">Settings &amp; Integrations</h1>
      <p className="settings-subtext">Manage system API keys, databases, and simulation fallback configs.</p>

      {/* Simulation Toggle Switch */}
      <div className="simulation-toggle-row">
        <div className="simulation-toggle-info">
          <span className="sim-toggle-title">Simulation Sandbox Mode</span>
          <span className="sim-toggle-desc">
            Bypass live API requests and score/generate using local heuristic engines instead. Great for testing.
          </span>
        </div>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={simMode}
            onChange={(e) => setSimMode(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* API Configuration Card */}
      <div className="settings-card">
        <div className="settings-section-heading">Google Gemini AI Connection</div>
        <div className="settings-section-subtext">
          Provide your Gemini API Key to enable advanced AI-powered alignment scoring and customize cold email outreach copy.
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Gemini */}
          <div className="settings-field">
            <label className="field-label">Google Gemini API Key</label>
            <div className="api-input-wrapper">
              <input
                type="password"
                className="api-input"
                placeholder={settings.geminiConnected ? `Connected (${settings.geminiMasked})` : "Enter Google AI Gemini Key"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <span className={`api-status-badge ${settings.geminiConnected ? "connected" : "missing"}`}>
                {settings.geminiConnected ? "Connected" : "Not configured"}
              </span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              Generates custom B2B alignment scoring and drafts personalized outbound sequences.
            </span>
          </div>

          <button type="submit" className="save-settings-btn" style={{ marginTop: "12px" }}>
            Save Settings
          </button>
        </form>
      </div>

      {/* Integration Helper Context */}
      <div className="settings-card" style={{ display: "flex", gap: "16px", backgroundColor: "rgba(37, 99, 219, 0.02)" }}>
        <div style={{ color: "var(--accent-blue-hover)", flexShrink: 0 }}>
          <Shield size={24} />
        </div>
        <div>
          <div className="settings-section-heading" style={{ fontSize: "14px" }}>Security &amp; Data Residency</div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            All credentials and lists are saved locally in the `db.json` database. They never leave your workspace and are only sent directly to Google AI endpoints during AI operation.
          </p>
        </div>
      </div>
    </div>
  );
}

