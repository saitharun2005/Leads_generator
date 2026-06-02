import React, { useState } from "react";
import { Search, Save, ArrowRight, TrendingUp, Users, Mail, Award, CheckSquare, Clipboard } from "lucide-react";

// Email Pill with self-contained copy-to-clipboard state
function EmailPill({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation(); // Stop row click
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
    >
      <Mail size={12} style={{ flexShrink: 0 }} />
      <span>{copied ? "Copied!" : email}</span>
    </div>
  );
}

export function LeadFinder({
  leads,
  onSearch,
  isSearching,
  searchPhase,
  searchQuery,
  onSaveCampaign,
  selectedLead,
  onSelectLead,
  activeListId
}) {
  const [inputValue, setInputValue] = useState("");
  const [tierFilter, setTierFilter] = useState("all"); // 'all', 'high', 'medium', 'low'
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [sortBy, setSortBy] = useState("score-desc"); // 'score-desc', 'name-asc', 'company-asc'
  
  // Save Campaign Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isSearching) return;
    onSearch(inputValue);
  };

  const handleSuggestionClick = (queryText) => {
    setInputValue(queryText);
    onSearch(queryText);
  };

  const triggerSaveModal = () => {
    if (leads.length === 0) return;
    // Autogenerate campaign name if empty
    const defaultName = searchQuery 
      ? searchQuery.replace(/^find me|^find/i, "").trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
      : "New Lead List";
    setCampaignName(defaultName);
    setShowSaveModal(true);
  };

  const handleConfirmSave = () => {
    if (!campaignName.trim()) return;
    onSaveCampaign(campaignName);
    setShowSaveModal(false);
  };

  // 1. Filter Leads
  const filteredLeads = leads.filter(lead => {
    // Score tier filter
    if (tierFilter === "high" && (lead.score === null || lead.score < 8)) return false;
    if (tierFilter === "medium" && (lead.score === null || lead.score < 5 || lead.score >= 8)) return false;
    if (tierFilter === "low" && (lead.score === null || lead.score >= 5)) return false;
    
    // Email filter
    if (hasEmailFilter && !lead.email) return false;
    
    return true;
  });

  // 2. Sort Leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === "score-desc") {
      return (b.score || 0) - (a.score || 0);
    }
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "company-asc") {
      return a.company.localeCompare(b.company);
    }
    return 0;
  });

  // Compute stats
  const totalCount = leads.length;
  const emailsFoundCount = leads.filter(l => l.email).length;
  const scoredCount = leads.filter(l => l.score !== null).length;
  const avgScore = scoredCount > 0 
    ? (leads.reduce((sum, l) => sum + (l.score || 0), 0) / scoredCount).toFixed(1)
    : "0.0";
  const highIntentCount = leads.filter(l => l.score >= 8).length;

  return (
    <div className="finder-pane">
      {/* Search Input Box */}
      <div className="prompt-container">
        <form onSubmit={handleSearchSubmit}>
          <div className="prompt-textarea-wrapper">
            <textarea
              className="prompt-textarea"
              placeholder="Find me SaaS founders in the UK, target Series A and Seed, at least 15 leads..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
              disabled={isSearching}
            />
            <button 
              type="submit" 
              className="search-action-btn"
              disabled={isSearching || !inputValue.trim()}
              title="Search Leads"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="suggestions-title">Suggestions</div>
        <div className="suggestions-row">
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Find 20 AI SaaS founders in the UK")}
            disabled={isSearching}
          >
            "Find 20 AI SaaS founders in the UK"
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Sales leaders at Series A companies in NYC")}
            disabled={isSearching}
          >
            "Sales leaders at Series A companies in NYC"
          </button>
          <button 
            className="suggestion-chip"
            onClick={() => handleSuggestionClick("Marketing directors in Berlin, 10 leads")}
            disabled={isSearching}
          >
            "Marketing directors in Berlin"
          </button>
        </div>
      </div>

      {/* Scraper Pipeline Loading Card */}
      {isSearching && (
        <div className="pipeline-progress-box">
          <div className="pipeline-header">
            <div className="pipeline-spinner"></div>
            <span className="pipeline-title">Executing Prospecting Pipeline</span>
          </div>
          <div className="pipeline-steps">
            <div className={`pipeline-step ${searchPhase === "scraping" ? "active" : (searchPhase !== "idle" ? "done" : "pending")}`}>
              <div className="step-indicator">1</div>
              <span className="step-label">Scraping LinkedIn & Web</span>
            </div>
            <div className={`pipeline-step ${searchPhase === "enriching" ? "active" : (["scoring", "done"].includes(searchPhase) ? "done" : "pending")}`}>
              <div className="step-indicator">2</div>
              <span className="step-label">Enriching Contact Emails</span>
            </div>
            <div className={`pipeline-step ${searchPhase === "scoring" ? "active" : (searchPhase === "done" ? "done" : "pending")}`}>
              <div className="step-indicator">3</div>
              <span className="step-label">AI Match Scoring</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Row */}
      {totalCount > 0 && (
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-icon-wrapper">
              <Users size={20} />
            </div>
            <div className="stats-info">
              <span className="stats-label">Total Leads</span>
              <span className="stats-value">{totalCount}</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon-wrapper">
              <Mail size={20} />
            </div>
            <div className="stats-info">
              <span className="stats-label">Emails Found</span>
              <span className="stats-value">{emailsFoundCount}</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon-wrapper">
              <Award size={20} />
            </div>
            <div className="stats-info">
              <span className="stats-label">Avg AI Score</span>
              <span className="stats-value">{avgScore}</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon-wrapper">
              <TrendingUp size={20} />
            </div>
            <div className="stats-info">
              <span className="stats-label">High Intent (8+)</span>
              <span className="stats-value">{highIntentCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Toolbar (Filters & Actions) */}
      {totalCount > 0 && (
        <div className="toolbar-card">
          <div className="filter-group">
            <span className="filter-label">Score:</span>
            <div className="tier-tab-group">
              <button 
                className={`tier-tab ${tierFilter === "all" ? "active" : ""}`}
                onClick={() => setTierFilter("all")}
              >
                All
              </button>
              <button 
                className={`tier-tab ${tierFilter === "high" ? "active" : ""}`}
                onClick={() => setTierFilter("high")}
              >
                High (8+)
              </button>
              <button 
                className={`tier-tab ${tierFilter === "medium" ? "active" : ""}`}
                onClick={() => setTierFilter("medium")}
              >
                Mid (5-7)
              </button>
              <button 
                className={`tier-tab ${tierFilter === "low" ? "active" : ""}`}
                onClick={() => setTierFilter("low")}
              >
                Low (&lt;5)
              </button>
            </div>

            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="checkbox-input"
                checked={hasEmailFilter}
                onChange={(e) => setHasEmailFilter(e.target.checked)}
              />
              <span>Has Email Only</span>
            </label>
          </div>

          <div className="filter-group">
            <span className="filter-label">Sort:</span>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="score-desc">AI Score (High &rarr; Low)</option>
              <option value="name-asc">Name (A &rarr; Z)</option>
              <option value="company-asc">Company (A &rarr; Z)</option>
            </select>

            {!activeListId && (
              <button className="save-list-action-btn" onClick={triggerSaveModal}>
                <Save size={14} />
                <span>Save Campaign</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leads Table */}
      {totalCount > 0 ? (
        <div className="table-container">
          <div className="table-card">
          <div className="table-wrapper">
            <table className="leads-table">
              <thead>
                <tr>
                  <th style={{ width: "30px", textAlign: "center" }}><CheckSquare size={14} style={{ color: "var(--text-muted)" }} /></th>
                  <th>Name &amp; Title</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>AI Score</th>
                  <th>Buying Intent Signals</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  const initials = lead.name.split(" ").map(w => w.charAt(0)).slice(0, 2).join("");
                  
                  // Score Tier classification
                  let scoreClass = "low";
                  if (lead.score >= 8) scoreClass = "high";
                  else if (lead.score >= 5) scoreClass = "medium";

                  return (
                    <tr 
                      key={lead.id}
                      className={isSelected ? "selected" : ""}
                      onClick={() => onSelectLead(lead)}
                    >
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="checkbox-input"
                          checked={isSelected}
                          onChange={() => onSelectLead(isSelected ? null : lead)}
                        />
                      </td>
                      <td>
                        <div className="user-identity-cell">
                          <div className="avatar-fallback">{initials}</div>
                          <div className="user-names">
                            <span className="user-name-text">{lead.name}</span>
                            <span className="user-title-text">{lead.title}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="company-cell-wrapper">{lead.company}</span>
                      </td>
                      <td>
                        <EmailPill email={lead.email} />
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {lead.location || <span className="empty-cell-dash">—</span>}
                      </td>
                      <td>
                        <span className={`score-badge ${scoreClass}`}>
                          {lead.score ?? "?"}
                        </span>
                      </td>
                      <td>
                        <div className="intent-tags-container">
                          {lead.intentSignals?.slice(0, 2).map((signal, idx) => (
                            <span key={idx} className="intent-mini-tag" title={signal.text}>
                              {signal.category}
                            </span>
                          ))}
                          {lead.intentSignals?.length > 2 && (
                            <span className="intent-mini-tag" style={{ color: "var(--text-muted)" }}>
                              +{lead.intentSignals.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedLeads.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No leads match your current filter selection.
            </div>
          )}
        </div>
        </div>
      ) : (
        !isSearching && (
          <div style={{ 
            flexGrow: 1, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "40px",
            color: "var(--text-secondary)"
          }}>
            <Search size={48} style={{ color: "var(--border-active)", marginBottom: "16px" }} />
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>Search ProspectOS Intelligence</h3>
            <p style={{ fontSize: "14px", maxWidth: "450px", textAlign: "center", lineHeight: "1.5" }}>
              Enter a natural language search query above to scrape profiles, enrich emails, analyze buying intent, and score candidates.
            </p>
          </div>
        )
      )}

      {/* Save Campaign Modal Popup */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Save Campaign List</div>
            <div className="modal-desc">Give this lead intelligence list a memorable name to save it to your sidebar.</div>
            <input 
              type="text" 
              className="modal-input"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., UK SaaS Founders Campaign"
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
