import { GoogleGenerativeAI } from "@google/generative-ai";

// Standard deterministic scoring simulator
function computeLocalScore(lead, index) {
  let score = 5; // Base score
  
  // Title boosts
  const t = lead.title.toLowerCase();
  if (t.includes("founder") || t.includes("ceo") || t.includes("co-founder")) {
    score += 2;
  } else if (t.includes("vp") || t.includes("director") || t.includes("head")) {
    score += 1;
  }
  
  // Funding stage boosts
  const f = lead.fundingStage || "";
  if (f.includes("Series A") || f.includes("Series B") || f.includes("Series C")) {
    score += 2;
  } else if (f.includes("Seed") || f.includes("Bootstrapped")) {
    score += 1;
  }
  
  // Intent signals boost
  const signalsCount = lead.intentSignals?.length || 0;
  score += Math.min(signalsCount, 2); // max +2
  
  // Ensure score is within 1 to 10
  score = Math.min(Math.max(score, 1), 10);
  
  // Formulate a clean, custom 1-line reason
  let reason = "";
  if (score >= 8) {
    reason = `High Fit: ${lead.title} at ${lead.company} (${lead.fundingStage || "SaaS"}) with strong intent signals (${lead.intentSignals?.[0]?.category || "Growth"}).`;
  } else if (score >= 5) {
    reason = `Medium Fit: Active decision-maker in ${lead.location} with moderate buying signals.`;
  } else {
    reason = `Low Fit: Smaller company size and fewer growth indicators in target segment.`;
  }
  
  return { score, reason };
}

// Generate cold email templates locally
function generateLocalEmails(lead) {
  const signalText = lead.intentSignals?.[0]?.text || "your recent updates";
  
  const variant1 = `Subject: Quick question re: ${lead.company} outbound

Hi ${lead.name.split(" ")[0]},

Saw that you're serving as ${lead.title} at ${lead.company}. Congratulations on ${signalText.toLowerCase()}! 

I'm writing because we help teams in the ${lead.industry} space scale up their lead generation operations. Are you open to a quick 10-minute chat next Tuesday to see if we can do the same for ${lead.company}?

Best,
[Your Name]`;

  const variant2 = `Subject: Scaling lead flow for ${lead.company}

Hi ${lead.name.split(" ")[0]},

I noticed ${lead.company} is currently dealing with ${signalText.toLowerCase()}. That usually means scaling up operations and driving pipeline is top-of-mind for you as ${lead.title}.

We built ProspectOS to help companies scrape LinkedIn and enrich lead lists automatically using AI. Our clients typically see a 3x increase in response rates.

Would you be open to running a free pilot list for ${lead.company} this week? Let me know your thoughts.

Regards,
[Your Name]`;

  const variant3 = `Subject: Idea for ${lead.company}'s growth in ${lead.location.split(",")[0]}

Hi ${lead.name.split(" ")[0]},

I was researching SaaS companies in ${lead.location} and came across ${lead.company}. I saw that you're ${lead.title} there—really impressive what you're building.

Given that you are ${signalText.toLowerCase()}, I put together a quick list of 15 targeted buyers in your segment that might need your services. 

Would you like me to send over the list? No strings attached—just wanted to share some value.

Cheers,
[Your Name]`;

  return [
    { type: "Variant 1: Short & Direct", body: variant1 },
    { type: "Variant 2: Value-First", body: variant2 },
    { type: "Variant 3: Creative Hook", body: variant3 }
  ];
}

// AI Service API wrapper
export async function scoreLeadWithAI(lead, geminiApiKey) {
  if (!geminiApiKey) {
    return computeLocalScore(lead);
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an advanced B2B Sales Dev AI. Rate the following lead from 1 to 10 based on how likely they are to buy premium sales automation tools (10 is extremely likely, 1 is not interested).
    
Lead Info:
Name: ${lead.name}
Title: ${lead.title}
Company: ${lead.company}
Industry: ${lead.industry}
Location: ${lead.location}
Funding Stage: ${lead.fundingStage}
Team Size: ${lead.teamSize}
Revenue: ${lead.revenueEstimate}
Buying Intent Signals: ${lead.intentSignals?.map(s => s.text).join(", ")}

Respond with a raw JSON block only, using exactly this schema:
{
  "score": <number 1-10>,
  "reason": "<one sentence explanation why you gave this score>"
}

Do not wrap the JSON in markdown code blocks.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Clean any potential markdown wrappers if Gemini returned them
    const cleanText = text.replace(/^```json/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanText);
    
    return {
      score: Math.min(Math.max(Number(parsed.score) || 5, 1), 10),
      reason: parsed.reason || "Scored based on profile characteristics and intent signals."
    };
  } catch (error) {
    console.error(`AI scoring failed for ${lead.name}:`, error);
    return computeLocalScore(lead);
  }
}

export async function generateEmailsWithAI(lead, geminiApiKey) {
  if (!geminiApiKey) {
    return generateLocalEmails(lead);
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a copywriter writing cold email campaigns. Write 3 personalized cold email templates for this lead:
Lead Name: ${lead.name}
Title: ${lead.title}
Company: ${lead.company}
Industry: ${lead.industry}
Location: ${lead.location}
Buying Intent Signals: ${lead.intentSignals?.map(s => s.text).join(", ")}

Guidelines:
- [Your Name] should be used as the sender placeholder.
- Incorporate their specific intent signals (like hiring, funding, or traffic surges) naturally.
- Keep them distinct:
  - Variant 1: Short & Direct (Under 100 words, casual, simple ask)
  - Variant 2: Value-First (Focus on ROI, how our tool helps their industry)
  - Variant 3: Creative Hook (Leverage location or recent funding/milestone in a highly personalized way)

Respond in a raw JSON block only, with this exact schema:
[
  { "type": "Variant 1: Short & Direct", "body": "<email body text, use \\n for line breaks>" },
  { "type": "Variant 2: Value-First", "body": "<email body text, use \\n for line breaks>" },
  { "type": "Variant 3: Creative Hook", "body": "<email body text, use \\n for line breaks>" }
]

Do not wrap the JSON in markdown code blocks.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanText = text.replace(/^```json/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanText);

    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed;
    }
    throw new Error("Invalid response format from Gemini");
  } catch (error) {
    console.error(`AI email generation failed for ${lead.name}:`, error);
    return generateLocalEmails(lead);
  }
}
