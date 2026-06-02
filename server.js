import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Import custom services
import { scrapeRealLeads, generateSimulatedLeads, scrapePlayStore, enrichApp } from "./services/scraper.js";
import { scoreLeadWithAI, generateEmailsWithAI } from "./services/ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (process.env.DATA_DIR && !fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error(`Failed to create DATA_DIR ${DATA_DIR}:`, err);
  }
}
const DB_PATH = path.join(DATA_DIR, "db.json");
const DEFAULT_DB_PATH = path.join(__dirname, "db.json");

// Copy default db.json if missing from custom DATA_DIR
if (process.env.DATA_DIR && !fs.existsSync(DB_PATH) && fs.existsSync(DEFAULT_DB_PATH)) {
  try {
    fs.copyFileSync(DEFAULT_DB_PATH, DB_PATH);
    console.log(`Copied default db.json to ${DB_PATH}`);
  } catch (err) {
    console.error(`Failed to copy default db.json:`, err);
  }
}



// Helper to read database
function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database, creating new structure", err);
    const initial = {
      settings: {
        geminiApiKey: "",
        apolloApiKey: "",
        apifyApiKey: "",
        simulationMode: true,
        creditsUsed: 0,
        creditsLimit: 1000
      },
      lists: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

// Helper to write database
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// --- API ROUTES ---

// 1. Settings management
app.get("/api/settings", (req, res) => {
  const db = readDB();
  const s = db.settings;
  // Mask keys for safety
  res.json({
    geminiConnected: !!s.geminiApiKey,
    apolloConnected: !!s.apolloApiKey,
    apifyConnected: !!s.apifyApiKey,
    geminiMasked: s.geminiApiKey ? `${s.geminiApiKey.substring(0, 4)}...${s.geminiApiKey.slice(-4)}` : "",
    apolloMasked: s.apolloApiKey ? `${s.apolloApiKey.substring(0, 4)}...${s.apolloApiKey.slice(-4)}` : "",
    apifyMasked: s.apifyApiKey ? `${s.apifyApiKey.substring(0, 4)}...${s.apifyApiKey.slice(-4)}` : "",
    simulationMode: s.simulationMode,
    creditsUsed: s.creditsUsed,
    creditsLimit: s.creditsLimit
  });
});

app.post("/api/settings", (req, res) => {
  const { geminiApiKey, apolloApiKey, apifyApiKey, simulationMode } = req.body;
  const db = readDB();

  if (geminiApiKey !== undefined) db.settings.geminiApiKey = geminiApiKey;
  if (apolloApiKey !== undefined) db.settings.apolloApiKey = apolloApiKey;
  if (apifyApiKey !== undefined) db.settings.apifyApiKey = apifyApiKey;
  if (simulationMode !== undefined) db.settings.simulationMode = !!simulationMode;

  writeDB(db);
  res.json({ success: true, message: "Settings updated successfully" });
});

// 2. Saved Lists management
app.get("/api/lists", (req, res) => {
  const db = readDB();
  res.json(db.lists);
});

app.post("/api/lists", (req, res) => {
  const { name, query, leads } = req.body;
  if (!name || !leads) {
    return res.status(400).json({ error: "Missing campaign name or leads list" });
  }

  const db = readDB();
  const newList = {
    id: `list_${Math.random().toString(36).substr(2, 9)}`,
    name,
    query: query || "",
    createdAt: new Date().toISOString(),
    leadsCount: leads.length,
    leads
  };

  db.lists.unshift(newList);
  writeDB(db);
  res.json(newList);
});

app.delete("/api/lists/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialCount = db.lists.length;
  db.lists = db.lists.filter(l => l.id !== id);
  
  if (db.lists.length === initialCount) {
    return res.status(404).json({ error: "List not found" });
  }
  
  writeDB(db);
  res.json({ success: true, message: "List deleted successfully" });
});

// 2.5. Play Store Scraper Endpoint
app.post("/api/scrape/play-store", async (req, res) => {
  const { category, subcategory, downloads } = req.body;
  
  console.log(`Starting Play Store scraper with Category: "${category || ''}", Subcategory: "${subcategory || ''}", Downloads: "${downloads || ''}"`);
  
  try {
    const results = await scrapePlayStore({ category, subcategory, downloads });
    console.log(`Play Store scraping completed. Found ${results.length} apps.`);
    res.json({ success: true, apps: results });
  } catch (error) {
    console.error("Play Store scraping failure:", error);
    res.status(500).json({ error: "Play Store scraping failed: " + error.message });
  }
});

// 2.6. Play Store App Developer enrichment (LinkedIn & Web Scraping)
app.post("/api/scrape/enrich-app", async (req, res) => {
  const { appName, developerName, website, email } = req.body;
  console.log(`Starting developer enrichment for "${developerName || appName}"...`);
  try {
    const result = await enrichApp({ appName, developerName, website, email });
    res.json({ success: true, lead: result });
  } catch (error) {
    console.error("Enrichment failure:", error);
    res.status(500).json({ error: "Enrichment pipeline failed: " + error.message });
  }
});

// 3. CORE PIPELINE: Search & Scrape & Enrich & AI Score
app.post("/api/leads/search", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query prompt is required" });
  }

  console.log(`Starting leads pipeline for: "${query}"`);
  const db = readDB();
  const isSimulated = db.settings.simulationMode || (!db.settings.apifyApiKey && !db.settings.apolloApiKey && !db.settings.geminiApiKey);

  try {
    let leads = [];

    // Run unified Python Scraper (handles scraping, web crawl, and contact enrichment)
    if (isSimulated || !db.settings.apifyApiKey) {
      console.log("Running scraper in Simulation Mode...");
      leads = await generateSimulatedLeads(query);
    } else {
      console.log("Running live scraper...");
      leads = await scrapeRealLeads(query, db.settings.apifyApiKey);
    }

    // Phase 3: AI SCORING
    console.log(`AI Scoring: Scoring ${leads.length} leads...`);
    const scoringKey = isSimulated ? null : db.settings.geminiApiKey;
    
    // Process lead scores (concurrently or in series, let's resolve them in parallel)
    const scoredLeads = await Promise.all(
      leads.map(async (lead) => {
        const aiScore = await scoreLeadWithAI(lead, scoringKey);
        return {
          ...lead,
          score: aiScore.score,
          scoreReason: aiScore.reason
        };
      })
    );

    // Deduct credits based on lead count
    const creditsUsed = scoredLeads.length;
    db.settings.creditsUsed = Math.min(db.settings.creditsUsed + creditsUsed, db.settings.creditsLimit);
    writeDB(db);

    console.log(`Pipeline completed. Found and enriched ${scoredLeads.length} leads.`);
    res.json({
      leads: scoredLeads,
      creditsUsed: db.settings.creditsUsed,
      creditsLimit: db.settings.creditsLimit,
      isSimulated
    });

  } catch (error) {
    console.error("Pipeline failure:", error);
    res.status(500).json({ error: "Lead generation pipeline failed: " + error.message });
  }
});

// 4. Personalised Cold Email Generation
app.post("/api/leads/email-generate", async (req, res) => {
  const { lead } = req.body;
  if (!lead) {
    return res.status(400).json({ error: "Lead information is required" });
  }

  const db = readDB();
  const isSimulated = db.settings.simulationMode || !db.settings.geminiApiKey;
  const geminiKey = isSimulated ? null : db.settings.geminiApiKey;

  try {
    const emails = await generateEmailsWithAI(lead, geminiKey);
    res.json({ emails });
  } catch (error) {
    console.error("Email generation failed:", error);
    res.status(500).json({ error: "Failed to generate AI emails: " + error.message });
  }
});

// Serving built client assets in production
const clientBuildPath = path.join(__dirname, "dist");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ProspectOS API server running on http://localhost:${PORT}`);
});
