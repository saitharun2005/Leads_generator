import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runPythonScraper(query) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "scraper.py");
    console.log(`Spawning Python scraper at: ${scriptPath} with query: "${query}"`);
    
    // Spawn python process (python3 on Unix-like systems, python on Windows)
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const py = spawn(pythonCmd, [scriptPath, query]);

    py.on("error", (err) => {
      console.error("Failed to spawn Python process:", err);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    
    let dataString = "";
    let errorString = "";

    py.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorString += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python scraper stderr: ${errorString}`);
        reject(new Error(`Python scraper failed (exit code ${code}): ${errorString || "Unknown error"}`));
        return;
      }
      
      try {
        const parsed = JSON.parse(dataString);
        if (parsed.error) {
          reject(new Error(parsed.error));
        } else {
          resolve(parsed);
        }
      } catch (err) {
        console.error("Parser failure. Raw output was:", dataString);
        reject(new Error(`Failed to parse python scraper output: ${err.message}`));
      }
    });
  });
}

// Interface to match the old scraper interface in server.js
export async function scrapeRealLeads(query, apifyToken) {
  // Bypasses Apify token completely, runs the custom python scraper
  return await runPythonScraper(query);
}

export function generateSimulatedLeads(query) {
  // If simulation is enabled, we still use the python scraper but can trigger fallback flags if needed
  // However, the Python scraper is smart and generates mock data if the DDG request fails, 
  // so we can just run the Python scraper to keep it realistic!
  return runPythonScraper(query);
}

export async function scrapePlayStore(params) {
  const jsonStr = JSON.stringify(params);
  return await runPythonScraper(jsonStr);
}

export async function enrichApp(params) {
  const jsonStr = JSON.stringify({
    action: "enrich",
    ...params
  });
  return await runPythonScraper(jsonStr);
}


