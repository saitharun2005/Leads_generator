import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Settings } from "./components/Settings.jsx";
import { DetailPanel } from "./components/DetailPanel.jsx";
import { PlayScraper } from "./components/PlayScraper.jsx";
import { AppEnricher } from "./components/AppEnricher.jsx";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("play_scraper"); // 'play_scraper', 'settings'
  
  // Leads & Campaigns States
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedLists, setSavedLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeListName, setActiveListName] = useState("");
  
  // Selected Lead (for Right Side Detail Panel)
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Credits & Integrations States
  const [credits, setCredits] = useState({ used: 0, limit: 1000 });
  const [settings, setSettings] = useState({
    geminiConnected: false,
    apolloConnected: false,
    apifyConnected: false,
    geminiMasked: "",
    apolloMasked: "",
    apifyMasked: "",
    simulationMode: true
  });

  // Loading & Progress Pipeline States
  const [isSearching, setIsSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState("idle"); // 'idle', 'scraping', 'enriching', 'scoring', 'done'
  
  // Toast notifications
  const [toast, setToast] = useState(null);

  // Enrichment Queue State
  const [enrichQueue, setEnrichQueue] = useState([]);

  const handleSendToEnricher = (appOrApps) => {
    const list = Array.isArray(appOrApps) ? appOrApps : [appOrApps];
    setEnrichQueue((prev) => {
      const existingIds = new Set(prev.map(a => a.appId));
      const newItems = list.filter(a => !existingIds.has(a.appId));
      const updated = [...prev, ...newItems];
      localStorage.setItem("prospectos_enrich_queue", JSON.stringify(updated));
      return updated;
    });
    showToast(`Sent ${list.length} app(s) to LinkedIn & Web Enricher queue!`, "success");
  };

  // Load configuration on mount
  useEffect(() => {
    fetchSettings();
    fetchLists();
    
    // Load persisted enrichment queue
    const savedQueue = localStorage.getItem("prospectos_enrich_queue");
    if (savedQueue) {
      try {
        setEnrichQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error("Failed to parse saved enrich queue:", e);
      }
    }
  }, []);

  // Sync to localStorage on state changes
  useEffect(() => {
    localStorage.setItem("prospectos_enrich_queue", JSON.stringify(enrichQueue));
  }, [enrichQueue]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          geminiConnected: data.geminiConnected,
          apolloConnected: data.apolloConnected,
          apifyConnected: data.apifyConnected,
          geminiMasked: data.geminiMasked,
          apolloMasked: data.apolloMasked,
          apifyMasked: data.apifyMasked,
          simulationMode: data.simulationMode
        });
        setCredits({
          used: data.creditsUsed,
          limit: data.creditsLimit
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setSavedLists(data);
        
        // Load the first saved list as default demo list
        if (data.length > 0 && leads.length === 0 && !activeListId) {
          handleSelectSavedList(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load saved lists:", err);
    }
  };

  const handleSelectSavedList = (list) => {
    setLeads(list.leads);
    setSearchQuery(list.query);
    setActiveListId(list.id);
    setActiveListName(list.name);
    setSelectedLead(null);
    setActiveTab("finder");
  };

  const handleDeleteSavedList = async (id, e) => {
    e.stopPropagation(); // Avoid triggering list selection
    try {
      const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Campaign list deleted", "success");
        if (activeListId === id) {
          setLeads([]);
          setSearchQuery("");
          setActiveListId(null);
          setActiveListName("");
        }
        fetchLists();
      } else {
        showToast("Failed to delete list", "error");
      }
    } catch (err) {
      console.error("Error deleting list:", err);
      showToast("Error deleting list", "error");
    }
  };

  const handleSearch = async (queryText) => {
    if (!queryText.trim()) return;
    
    setIsSearching(true);
    setSearchQuery(queryText);
    setSelectedLead(null);
    setActiveListId(null);
    setActiveListName("");
    
    // Animate visual steps
    setSearchPhase("scraping");
    
    // We step through simulated phases to give a high fidelity visual flow
    const timers = [];
    timers.push(setTimeout(() => setSearchPhase("enriching"), 1500));
    timers.push(setTimeout(() => setSearchPhase("scoring"), 3000));

    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: queryText })
      });

      // Wait a minimum of 4.5s for the transitions to complete nicely
      await new Promise(r => setTimeout(r, 4500));

      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setCredits({ used: data.creditsUsed, limit: data.creditsLimit });
        setSearchPhase("done");
        showToast(`Found ${data.leads.length} matching leads!`, "success");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Search failed");
      }
    } catch (err) {
      console.error("Search pipeline error:", err);
      showToast(err.message, "error");
      setSearchPhase("idle");
    } finally {
      // Clear timers in case of errors
      timers.forEach(t => clearTimeout(t));
      setIsSearching(false);
    }
  };

  const handleSaveCampaign = async (name) => {
    if (!name || leads.length === 0) return;
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          query: searchQuery,
          leads
        })
      });
      if (res.ok) {
        const newList = await res.json();
        showToast("Campaign list saved successfully!", "success");
        setActiveListId(newList.id);
        setActiveListName(newList.name);
        fetchLists();
      } else {
        showToast("Failed to save campaign", "error");
      }
    } catch (err) {
      console.error("Save list error:", err);
      showToast("Error saving campaign", "error");
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        creditsUsed={credits.used}
        creditsLimit={credits.limit}
      />

      {/* Main Workspace Panel */}
      <div className="main-workspace">
        {/* Topbar Banner */}
        <header className="topbar">
          <div className="topbar-title">
            {activeTab === "play_scraper"
              ? "Google Play App Store Scraper"
              : activeTab === "app_enricher"
              ? "LinkedIn & Website Lead Enricher"
              : "System Connections & API Keys"}
          </div>
          <div className="connection-status-pill">
            <span className={`connection-dot ${settings.simulationMode ? 'simulated' : ''}`}></span>
            {settings.simulationMode ? "Simulation Mode Active" : "Live API Connections Active"}
          </div>
        </header>

        {/* Content pane */}
        <div className="content-wrapper">

          {activeTab === "play_scraper" && (
            <PlayScraper
              showToast={showToast}
              onSendToEnricher={handleSendToEnricher}
              enrichQueue={enrichQueue}
            />
          )}

          {activeTab === "app_enricher" && (
            <AppEnricher
              enrichQueue={enrichQueue}
              setEnrichQueue={setEnrichQueue}
              showToast={showToast}
              onSelectLead={setSelectedLead}
              selectedLead={selectedLead}
              onSaveCampaign={handleSaveCampaign}
            />
          )}

          {activeTab === "settings" && (
            <Settings
              settings={settings}
              fetchSettings={fetchSettings}
              showToast={showToast}
            />
          )}

          {/* Right Sliding Detail Panel */}
          {selectedLead && (
            <DetailPanel
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              geminiConnected={settings.geminiConnected}
              simulationMode={settings.simulationMode}
            />
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className="status-toast">
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
