import React, { useState, useEffect } from "react";
import { X, Mail, Phone, Linkedin, Twitter, Globe, Info, Clipboard, Check, Calendar, Users, DollarSign, Rocket } from "lucide-react";

// Email Variant Card with clipboard copy capability
function EmailVariantCard({ title, body }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="email-variant-card">
      <div className="variant-header-row">
        <span className="variant-title-label">{title}</span>
        <button 
          className={`copy-email-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? <Check size={12} /> : <Clipboard size={12} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <div className="email-body-text">{body}</div>
    </div>
  );
}

export function DetailPanel({ lead, onClose, geminiConnected, simulationMode }) {
  const [activeTab, setActiveTab] = useState("details"); // 'details', 'intent', 'emails'
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailLeadId, setEmailLeadId] = useState(null); // Tracks which lead emails are generated for

  // Reset tab when lead changes
  useEffect(() => {
    setActiveTab("details");
    setEmails([]);
    setEmailLeadId(null);
  }, [lead.id]);

  // Load emails when Email tab is opened
  useEffect(() => {
    if (activeTab === "emails" && emailLeadId !== lead.id) {
      generateEmails();
    }
  }, [activeTab, lead.id]);

  const generateEmails = async () => {
    setIsLoadingEmails(true);
    setEmailLeadId(lead.id);
    try {
      const res = await fetch("/api/leads/email-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lead })
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else {
        console.error("Failed to generate emails");
      }
    } catch (err) {
      console.error("Error generating emails:", err);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const initials = lead.name.split(" ").map(w => w.charAt(0)).slice(0, 2).join("");
  
  let scoreClass = "low";
  if (lead.score >= 8) scoreClass = "high";
  else if (lead.score >= 5) scoreClass = "medium";

  return (
    <aside className="detail-panel">
      {/* Detail Header */}
      <div className="detail-header">
        <button className="close-panel-btn" onClick={onClose} title="Close Panel">
          <X size={18} />
        </button>
        
        <div className="detail-meta-row">
          <div className="detail-avatar">{initials}</div>
          <div className="detail-names-wrapper">
            <h2 className="detail-fullname">{lead.name}</h2>
            <div className="detail-title-company">
              {lead.title} at <strong>{lead.company}</strong>
            </div>
            
            <div className="detail-score-box">
              <span className={`score-badge ${scoreClass}`} style={{ width: "24px", height: "24px", fontSize: "11px" }}>
                {lead.score ?? "?"}
              </span>
              <span className="detail-score-text">AI Score Alignment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="detail-tabs-row">
        <button 
          className={`detail-tab-btn ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Profile Details
        </button>
        <button 
          className={`detail-tab-btn ${activeTab === "intent" ? "active" : ""}`}
          onClick={() => setActiveTab("intent")}
        >
          Intent &amp; Signals
        </button>
        <button 
          className={`detail-tab-btn ${activeTab === "emails" ? "active" : ""}`}
          onClick={() => setActiveTab("emails")}
        >
          AI Email Writer
        </button>
      </div>

      {/* Tab Panels */}
      <div className="detail-content-pane">
        
        {/* TAB 1: DETAILS */}
        {activeTab === "details" && (
          <div>
            <div className="detail-section-title">Contact Information</div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label"><Mail size={10} style={{ display: "inline", marginRight: "4px" }} /> Email</span>
                <span className="info-value" title={lead.email}>{lead.email || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Phone size={10} style={{ display: "inline", marginRight: "4px" }} /> Phone</span>
                <span className="info-value">{lead.phone || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Linkedin size={10} style={{ display: "inline", marginRight: "4px" }} /> LinkedIn</span>
                <span className="info-value">
                  {lead.linkedinUrl ? <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer">View Profile</a> : "—"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label"><Twitter size={10} style={{ display: "inline", marginRight: "4px" }} /> Twitter</span>
                <span className="info-value">
                  {lead.twitterUrl ? <a href={lead.twitterUrl} target="_blank" rel="noopener noreferrer">View Feed</a> : "—"}
                </span>
              </div>
            </div>

            <div className="detail-section-title">Company Information</div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label"><Globe size={10} style={{ display: "inline", marginRight: "4px" }} /> Website</span>
                <span className="info-value">
                  {lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer">{lead.website.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label"><Info size={10} style={{ display: "inline", marginRight: "4px" }} /> Industry</span>
                <span className="info-value" title={lead.industry}>{lead.industry || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Users size={10} style={{ display: "inline", marginRight: "4px" }} /> Team Size</span>
                <span className="info-value">{lead.teamSize || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Calendar size={10} style={{ display: "inline", marginRight: "4px" }} /> Founded</span>
                <span className="info-value">{lead.foundedYear || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><Rocket size={10} style={{ display: "inline", marginRight: "4px" }} /> Funding Stage</span>
                <span className="info-value">{lead.fundingStage || "—"}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><DollarSign size={10} style={{ display: "inline", marginRight: "4px" }} /> Est. Revenue</span>
                <span className="info-value">{lead.revenueEstimate || "—"}</span>
              </div>
            </div>
            
            <div className="detail-section-title">Lead Location</div>
            <div className="info-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="info-item">
                <span className="info-label">Address / Territory</span>
                <span className="info-value" style={{ whiteSpace: "normal" }}>{lead.location || "—"}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTENT & SIGNALS */}
        {activeTab === "intent" && (
          <div>
            <div className="detail-section-title">AI Match Score Reasoning</div>
            <div className="reason-card">
              <p className="reason-text">{lead.scoreReason || "Heuristics match analysis is being updated."}</p>
            </div>

            <div className="detail-section-title">Buying Intent Signals</div>
            <div className="intent-detail-list">
              {lead.intentSignals?.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                  No active intent signals identified for this company.
                </div>
              ) : (
                lead.intentSignals.map((signal, idx) => (
                  <div key={idx} className="intent-detail-card">
                    <div className="intent-card-header">
                      <span className="intent-category-pill">{signal.category}</span>
                      <span className="intent-boost-pill">+{signal.scoreBoost || 1} score boost</span>
                    </div>
                    <span className="intent-signal-description">{signal.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: AI COLD EMAILS */}
        {activeTab === "emails" && (
          <div>
            {isLoadingEmails ? (
              <div className="email-gen-loader">
                <span style={{ fontWeight: 500 }}>
                  {simulationMode ? "Simulating cold drafts..." : "Drafting personalized variants..."}
                </span>
                <div className="email-gen-bar"></div>
              </div>
            ) : (
              <div className="email-variants-stack">
                <div style={{ fontSize: "11px", color: "var(--text-muted)", paddingBottom: "4px" }}>
                  {simulationMode 
                    ? "Generated via deterministic heuristics (Simulation Mode). Connect Gemini API in settings for full generative AI copy."
                    : "Personalized cold variants written using Gemini API."}
                </div>
                {emails.map((variant, idx) => (
                  <EmailVariantCard
                    key={idx}
                    title={variant.type}
                    body={variant.body}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
}
