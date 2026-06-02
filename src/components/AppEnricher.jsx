import React, { useState } from "react";
import { Search, Mail, Phone, Globe, Linkedin, Twitter, Instagram, MapPin, Download, Save, RefreshCw, Trash2, ArrowRight, Database, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

// Email Pill with self-contained copy-to-clipboard state
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
      className={`email-copy-pill ${copied ? 'copied' : ''}`} 
      onClick={handleCopy}
      title="Click to copy email"
      style={{ display: "inline-flex" }}
    >
      <Mail size={12} style={{ flexShrink: 0 }} />
      <span>{copied ? "Copied!" : email}</span>
    </div>
  );
}

// App Logo component matching the PlayScraper design
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

export function AppEnricher({
  enrichQueue,
  setEnrichQueue,
  showToast,
  onSelectLead,
  selectedLead,
  onSaveCampaign
}) {
  const [enrichingId, setEnrichingId] = useState(null);
  const [enrichPhase, setEnrichPhase] = useState("idle"); // 'idle', 'linkedin', 'web', 'saving'
  const [enrichedLeads, setEnrichedLeads] = useState([]);

  // Load persisted enriched leads on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("prospectos_recent_enrichments");
    if (saved) {
      try {
        setEnrichedLeads(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent enrichments:", e);
      }
    }
  }, []);

  // Sync to localStorage
  React.useEffect(() => {
    localStorage.setItem("prospectos_recent_enrichments", JSON.stringify(enrichedLeads));
  }, [enrichedLeads]);

  const handleDeleteEnrichedLead = (leadId) => {
    setEnrichedLeads(prev => prev.filter(l => l.id !== leadId));
    showToast("Enriched contact removed", "info");
  };
  
  // Save Campaign Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [campaignName, setCampaignName] = useState("Enriched Developer Campaign");

  // Remove single app from queue
  const handleRemoveFromQueue = (appId) => {
    setEnrichQueue(prev => prev.filter(app => app.appId !== appId));
    showToast("Removed app from queue", "info");
  };

  // Clear entire queue
  const handleClearQueue = () => {
    if (enrichQueue.length === 0) return;
    setEnrichQueue([]);
    showToast("Cleared enrichment queue", "info");
  };

  // Run enrichment on a single app
  const handleEnrich = async (app) => {
    if (enrichingId) return;

    setEnrichingId(app.appId);
    setEnrichPhase("linkedin");

    // Stepping through visual phases for a beautiful realistic animation
    const t1 = setTimeout(() => setEnrichPhase("web"), 2000);
    const t2 = setTimeout(() => setEnrichPhase("saving"), 4500);

    try {
      const res = await fetch("/api/scrape/enrich-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: app.appName,
          developerName: app.developerName,
          website: app.website,
          email: app.email
        })
      });

      // Maintain loading flow beauty
      await new Promise(r => setTimeout(r, 6000));

      if (res.ok) {
        const data = await res.json();
        const newLead = {
          ...data.lead,
          id: `lead_enrich_${Math.random().toString(36).substr(2, 9)}`,
          logo: app.logo // preserve the logo
        };

        // Add to enriched leads list
        setEnrichedLeads(prev => [newLead, ...prev]);
        
        // Remove from active queue
        setEnrichQueue(prev => prev.filter(item => item.appId !== app.appId));
        
        showToast(`Enriched ${app.appName} successfully!`, "success");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Enrichment failed");
      }
    } catch (err) {
      console.error("Enrichment error:", err);
      showToast(err.message || "Enrichment failed", "error");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setEnrichingId(null);
      setEnrichPhase("idle");
    }
  };

  // Enrich all apps in queue (consecutive execution)
  const handleEnrichAll = async () => {
    if (enrichQueue.length === 0 || enrichingId) return;
    
    const queueCopy = [...enrichQueue];
    showToast(`Starting bulk enrichment for ${queueCopy.length} apps...`, "info");
    
    for (const app of queueCopy) {
      await handleEnrich(app);
    }
  };

  // CSV Export for Enriched Leads
  const handleDownloadCSV = () => {
    if (enrichedLeads.length === 0) return;

    const headers = [
      "No.",
      "Founder/Contact Name",
      "Title",
      "Company Name",
      "Email Address",
      "Phone",
      "LinkedIn Profile",
      "Location",
      "Website",
      "Industry",
      "Team Size",
      "Founded Year",
      "Funding Stage",
      "Revenue Estimate",
      "AI Score",
      "Score Reason"
    ];

    const rows = enrichedLeads.map((lead, index) => [
      index + 1,
      lead.name || "",
      lead.title || "",
      lead.company || lead.appName || "",
      lead.email || "",
      lead.phone || "",
      lead.linkedinUrl || "",
      lead.location || "",
      lead.website || "",
      lead.industry || "",
      lead.teamSize || "",
      lead.foundedYear || "",
      lead.fundingStage || "",
      lead.revenueEstimate || "",
      lead.score || "",
      lead.scoreReason || ""
    ]);

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      let stringified = String(val);
      stringified = stringified.replace(/"/g, '""');
      if (stringified.includes(",") || stringified.includes('"') || stringified.includes("\n") || stringified.includes("\r")) {
        return `"${stringified}"`;
      }
      return stringified;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `enriched_developer_leads_${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`CSV downloaded: ${filename}`, "success");
  };

  const triggerSaveModal = () => {
    if (enrichedLeads.length === 0) return;
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    if (!campaignName.trim()) return;
    onSaveCampaign(campaignName);
    showToast("Enriched leads saved to campaign successfully!", "success");
    setShowSaveModal(false);
  };

  return (
    <div className="finder-pane" style={{ overflowY: "auto" }}>
      {/* Header Banner */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "22px", marginBottom: "4px" }}>
          LinkedIn &amp; Web Lead Enricher
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Send apps from the App Store Scraper here to discover founders/decision makers, extract their verified LinkedIn profiles, and scrape contact emails/phone numbers directly from their websites.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: Queue of apps to enrich */}
        <div className="table-container" style={{ margin: 0 }}>
          <div className="table-card" style={{ padding: "16px", minHeight: "350px", backgroundColor: "var(--bg-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                Enrichment Queue ({enrichQueue.length})
              </h3>
              {enrichQueue.length > 0 && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={handleClearQueue} 
                    className="delete-list-btn" 
                    style={{ opacity: 1, padding: "4px 8px", fontSize: "12px", border: "1px solid var(--border-medium)", borderRadius: "6px" }}
                    disabled={!!enrichingId}
                  >
                    Clear Queue
                  </button>
                  <button 
                    onClick={handleEnrichAll} 
                    className="save-list-action-btn"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                    disabled={!!enrichingId}
                  >
                    Enrich All
                  </button>
                </div>
              )}
            </div>

            {/* Queue List */}
            {enrichQueue.length === 0 ? (
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--text-muted)", textAlign: "center" }}>
                <Database size={36} style={{ color: "var(--border-active)", marginBottom: "12px" }} />
                <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>Queue is Empty</h4>
                <p style={{ fontSize: "12px", lineHeight: "1.4" }}>
                  Go to <strong>Play Store Scraper</strong>, scrape apps, and click <strong>Enrich with LinkedIn/Web</strong> to send developers here for contact extraction.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                {enrichQueue.map((app) => {
                  const isCurrent = enrichingId === app.appId;
                  return (
                    <div 
                      key={app.appId} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        padding: "10px 12px", 
                        backgroundColor: isCurrent ? "rgba(37,99,219,0.05)" : "var(--bg-primary)",
                        border: isCurrent ? "1px solid var(--accent-blue)" : "1px solid var(--border-light)",
                        borderRadius: "10px",
                        transition: "all var(--transition-fast)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", marginRight: "10px" }}>
                        <AppLogo logo={app.logo} appName={app.appName} />
                        <div style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={app.appName}>
                            {app.appName}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={app.developerName}>
                            {app.developerName}
                          </div>
                        </div>
                      </div>

                      {/* Action Button / Progress */}
                      <div style={{ flexShrink: 0 }}>
                        {isCurrent ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--accent-blue-hover)", fontWeight: 600 }}>
                            <RefreshCw size={12} className="pipeline-spinner" />
                            <span>
                              {enrichPhase === "linkedin" && "LinkedIn Scrape"}
                              {enrichPhase === "web" && "Web Scraping"}
                              {enrichPhase === "saving" && "Finalizing"}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              onClick={() => handleRemoveFromQueue(app.appId)}
                              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                              title="Remove"
                              disabled={!!enrichingId}
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              onClick={() => handleEnrich(app)}
                              className="save-list-action-btn"
                              style={{ padding: "4px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                              disabled={!!enrichingId}
                            >
                              <span>Enrich</span>
                              <ChevronRight size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Results - Enriched Leads */}
        <div className="table-container" style={{ margin: 0 }}>
          <div className="table-card" style={{ padding: "16px", minHeight: "350px", backgroundColor: "var(--bg-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} style={{ color: "var(--accent-blue-hover)" }} />
                <span>Enriched Contacts ({enrichedLeads.length})</span>
              </h3>
              {enrichedLeads.length > 0 && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all enriched contacts?")) {
                        setEnrichedLeads([]);
                        showToast("Cleared all enriched contacts", "info");
                      }
                    }} 
                    className="delete-list-btn" 
                    style={{ opacity: 1, padding: "4px 10px", fontSize: "12px", border: "1px solid var(--border-medium)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Trash2 size={12} />
                    <span>Clear List</span>
                  </button>
                  <button 
                    onClick={handleDownloadCSV} 
                    className="delete-list-btn" 
                    style={{ opacity: 1, padding: "4px 10px", fontSize: "12px", border: "1px solid var(--border-medium)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Download size={12} />
                    <span>Export CSV</span>
                  </button>
                  <button 
                    onClick={triggerSaveModal} 
                    className="save-list-action-btn"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                  >
                    <Save size={12} />
                    <span>Save to Campaign</span>
                  </button>
                </div>
              )}
            </div>

            {/* Enriched Leads Grid/List */}
            {enrichedLeads.length === 0 ? (
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "var(--text-muted)", textAlign: "center" }}>
                <Sparkles size={36} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>No Enriched Contacts Yet</h4>
                <p style={{ fontSize: "12px", lineHeight: "1.4", maxWidth: "320px" }}>
                  Enrich developer listings in your queue to find their founders, corporate emails, websites, and social links.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                {enrichedLeads.map((lead) => {
                  const initials = lead.name.split(" ").map(w => w.charAt(0)).slice(0, 2).join("");
                  return (
                    <div 
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      style={{ 
                        padding: "14px", 
                        backgroundColor: "var(--bg-primary)",
                        border: selectedLead?.id === lead.id ? "1px solid var(--accent-blue)" : "1px solid var(--border-light)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-active)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedLead?.id === lead.id ? "var(--accent-blue)" : "var(--border-light)"}
                    >
                      {/* Identity & Company Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ 
                            width: "36px", 
                            height: "36px", 
                            borderRadius: "50%", 
                            backgroundColor: "var(--accent-blue-glow)", 
                            color: "var(--accent-blue-hover)", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 600
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{lead.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <span>{lead.title}</span>
                              <span>·</span>
                              <span style={{ color: "var(--text-secondary)" }}>{lead.developerName}</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Score */}
                        <span className="score-badge high" style={{ fontSize: "11px", padding: "2px 6px" }}>
                          {lead.score || 9} / 10
                        </span>
                      </div>

                      {/* Contact Info Row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", padding: "6px 0", borderTop: "1px dashed var(--border-light)", borderBottom: "1px dashed var(--border-light)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <EmailPill email={lead.email} />
                        </div>
                        {lead.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            <Phone size={11} style={{ color: "var(--text-muted)" }} />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.location && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            <MapPin size={11} style={{ color: "var(--text-muted)" }} />
                            <span>{lead.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Social & Web Links footer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          App: {lead.appName}
                        </span>
                        
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noreferrer" title="Website" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                              <Globe size={13} />
                            </a>
                          )}
                          {lead.linkedinUrl && (
                            <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" title="LinkedIn Profile" style={{ color: "var(--accent-blue-hover)", transition: "color 0.2s" }}>
                              <Linkedin size={13} />
                            </a>
                          )}
                          {lead.twitterUrl && (
                            <a href={lead.twitterUrl} target="_blank" rel="noreferrer" title="Twitter Profile" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                              <Twitter size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteEnrichedLead(lead.id)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "var(--text-muted)", 
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              transition: "color 0.2s"
                            }}
                            title="Delete contact"
                            onMouseEnter={e => e.currentTarget.style.color = "var(--score-red-text)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Campaign Modal Popup */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Save Enriched Campaign List</div>
            <div className="modal-desc">Save these enriched contacts as a ProspectOS campaign list for cold outreach.</div>
            <input 
              type="text" 
              className="modal-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Finance App Founders India"
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button 
                className="modal-confirm-btn" 
                onClick={handleConfirmSave}
                disabled={!campaignName.trim()}
              >
                Save Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
