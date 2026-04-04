import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { createRequire } from "module";

// Use a CJS-safe require — falls back gracefully when import.meta.url is unavailable (esbuild CJS bundles)
const _require = typeof require !== "undefined" ? require : createRequire(import.meta.url);
const pdfParse = _require("pdf-parse") as (
  buffer: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall", "can",
  "not", "no", "nor", "so", "yet", "both", "either", "neither", "if",
  "then", "than", "that", "this", "these", "those", "it", "its", "we",
  "our", "you", "your", "they", "their", "he", "she", "his", "her",
  "i", "my", "me", "us", "them", "who", "which", "what", "when",
  "where", "how", "why", "all", "each", "every", "any", "some", "such",
  "into", "through", "during", "before", "after", "above", "below",
  "up", "down", "out", "off", "over", "under", "again", "further",
  "also", "just", "about", "experience", "work", "years", "year",
  "role", "position", "team", "company", "business", "looking",
  "seeking", "responsible", "responsibilities", "including", "ability",
]);

async function parsePdf(buffer: Buffer, filename: string): Promise<string> {
  console.log(`[PDF] Parsing file: ${filename} (${buffer.length} bytes)`);
  try {
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim() ?? "";
    console.log(`[PDF] Extracted ${text.length} characters from ${parsed.numpages} page(s)`);
    if (!text || text.length < 10) {
      throw new Error(
        "PDF appears to be image-based or password-protected — no readable text could be extracted. Please use a text-based PDF."
      );
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PDF] Parse failed:`, msg);
    // Re-throw user-friendly messages as-is; wrap other errors
    if (msg.includes("no readable text") || msg.includes("image-based")) throw err;
    throw new Error("Failed to parse the PDF. The file may be corrupted, encrypted, or not a valid PDF.");
  }
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 80);
}

function computeKeywordMatch(resumeText: string, jobText: string) {
  const resumeKeywords = new Set(extractKeywords(resumeText));
  const jobKeywords = extractKeywords(jobText);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of jobKeywords) {
    if (resumeKeywords.has(kw)) matched.push(kw);
    else missing.push(kw);
  }
  const keywordScore =
    jobKeywords.length === 0 ? 0 : Math.round((matched.length / jobKeywords.length) * 100);
  return { matched, missing, keywordScore };
}

// ─── Candidate Analysis ─────────────────────────────────────────────────────

router.post(
  "/resume/analyze",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    console.log("[ANALYZE] Request received");
    try {
      if (!req.file) {
        console.error("[ANALYZE] No file uploaded or non-PDF rejected");
        res.status(400).json({ error: "No PDF file uploaded. Please select a .pdf file." });
        return;
      }

      console.log(`[ANALYZE] File received: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

      const jobDescription = (req.body as { jobDescription?: string }).jobDescription?.trim();
      if (!jobDescription) {
        res.status(400).json({ error: "Job description is required." });
        return;
      }
      console.log(`[ANALYZE] Job description length: ${jobDescription.length} chars`);

      let extractedText: string;
      try {
        extractedText = await parsePdf(req.file.buffer, req.file.originalname);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse PDF.";
        res.status(400).json({ error: msg });
        return;
      }

      const { matched, missing, keywordScore } = computeKeywordMatch(extractedText, jobDescription);
      console.log(`[ANALYZE] Keyword match: ${keywordScore}% (${matched.length} matched, ${missing.length} missing)`);

      const aiPrompt = `You are a professional resume coach helping a job seeker improve their resume.

JOB DESCRIPTION:
${jobDescription.slice(0, 2500)}

RESUME TEXT:
${extractedText.slice(0, 3000)}

KEYWORD MATCH SCORE: ${keywordScore}%
MISSING KEYWORDS: ${missing.slice(0, 20).join(", ")}

Analyze this resume and respond with ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "suggestions": ["5-7 specific actionable improvement tips to better align with this job"],
  "aiScore": <integer 0-100 semantic fit score based on actual experience>,
  "aiScoreRationale": "2 sentence explanation",
  "suggestions": ["5-7 specific actionable improvement tips"],
  "strengths": ["3-5 genuine resume strengths relevant to this job"]
}

Focus suggestions on: adding missing keywords, quantifying achievements, tailoring language, highlighting relevant experience.
Focus strengths on: what the candidate already does well for this specific role.`;

      let suggestions: string[] = [];
      let strengths: string[] = [];
      let aiScore: number = keywordScore;
      let aiScoreRationale: string = "";

      console.log("[ANALYZE] Sending request to OpenAI...");
      try {
        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1200,
          messages: [{ role: "user", content: aiPrompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "{}";
        console.log("[ANALYZE] OpenAI response received, length:", content.length);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: string[]; strengths?: string[]; aiScore?: number; aiScoreRationale?: string };
          suggestions = parsed.suggestions ?? [];
          strengths = parsed.strengths ?? [];
          aiScore = parsed.aiScore ?? keywordScore;
          aiScoreRationale = parsed.aiScoreRationale ?? "";
          console.log(`[ANALYZE] Parsed: ${suggestions.length} suggestions, aiScore: ${aiScore}`);
        }
      } catch (aiErr) {
        console.error("[ANALYZE] OpenAI request failed:", aiErr instanceof Error ? aiErr.message : String(aiErr));
        suggestions = [
          "Add more keywords from the job description to improve ATS compatibility.",
          "Quantify your achievements with specific numbers and percentages.",
          "Tailor your professional summary to match the role requirements.",
          "Highlight relevant projects that align with the job requirements.",
          "Use action verbs at the start of each bullet point.",
        ];
        strengths = [
          "Your resume demonstrates relevant experience in the field.",
          "Clear structure makes the document easy to scan.",
        ];
      }

      const responsePayload = {
        matchScore: keywordScore,
        aiScore,
        aiScoreRationale,
        matchedKeywords: matched.slice(0, 30),
        missingKeywords: missing.slice(0, 30),
        suggestions,
        strengths,
        extractedText,
      };
      console.log("[ANALYZE] Sending response with matchScore:", responsePayload.matchScore);
      res.json(responsePayload);
    } catch (err) {
      console.error("[ANALYZE] Unexpected error:", err instanceof Error ? err.stack : String(err));
      res.status(500).json({ error: "An unexpected server error occurred. Please try again." });
    }
  }
);

// ─── Recruiter Evaluation ────────────────────────────────────────────────────

router.post(
  "/resume/evaluate",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    console.log("[EVALUATE] Request received");
    try {
      if (!req.file) {
        console.error("[EVALUATE] No file uploaded or non-PDF rejected");
        res.status(400).json({ error: "No PDF file uploaded. Please select a .pdf file." });
        return;
      }

      console.log(`[EVALUATE] File received: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

      const jobDescription = (req.body as { jobDescription?: string }).jobDescription?.trim();
      if (!jobDescription) {
        res.status(400).json({ error: "Job description is required." });
        return;
      }
      console.log(`[EVALUATE] Job description length: ${jobDescription.length} chars`);

      let extractedText: string;
      try {
        extractedText = await parsePdf(req.file.buffer, req.file.originalname);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to parse PDF.";
        res.status(400).json({ error: msg });
        return;
      }

      const { matched, missing, keywordScore } = computeKeywordMatch(extractedText, jobDescription);
      console.log(`[EVALUATE] Keyword match: ${keywordScore}% (${matched.length} matched, ${missing.length} missing)`);

      const aiPrompt = `You are a senior recruiter evaluating a candidate resume for a specific role. Be analytical, objective, and use professional recruiter language. Do not say "hire this person" — use language like "appears suitable for shortlist review", "lacks several required qualifications", "moderate alignment with the role".

JOB DESCRIPTION:
${jobDescription.slice(0, 2500)}

CANDIDATE RESUME:
${extractedText.slice(0, 3000)}

KEYWORD OVERLAP: ${keywordScore}% (${matched.slice(0, 15).join(", ") || "none"})
MISSING KEYWORDS: ${missing.slice(0, 15).join(", ") || "none"}

Evaluate this candidate's suitability for the role. Respond with ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "fitScore": <integer 0-100>,
  "hiringRecommendation": <"Strong Fit" | "Moderate Fit" | "Low Fit">,
  "matchedSkills": ["up to 10 specific matched skills/competencies"],
  "missingSkills": ["up to 10 important missing skills or qualifications"],
  "experienceSummary": "2-3 sentence objective summary of the candidate's relevant experience",
  "strengths": ["3-5 recruiter-relevant candidate strengths"],
  "concerns": ["2-4 gaps, risks or concerns about this candidate for this role"],
  "nextStep": <"Shortlist for Screening" | "Consider with Caution" | "Not Suitable for This Role">,
  "scoreRationale": "1-2 sentence explanation of why you gave this fit score"
}

Scoring guidance: 75-100=strong alignment, 50-74=moderate, 0-49=weak. The fitScore must reflect experience quality and role relevance, not just keyword overlap.`;

      type EvalResult = {
        fitScore: number;
        hiringRecommendation: string;
        matchedSkills: string[];
        missingSkills: string[];
        experienceSummary: string;
        strengths: string[];
        concerns: string[];
        nextStep: string;
        scoreRationale: string;
      };

      const fallback: EvalResult = {
        fitScore: keywordScore,
        hiringRecommendation: keywordScore >= 75 ? "Strong Fit" : keywordScore >= 50 ? "Moderate Fit" : "Low Fit",
        matchedSkills: matched.slice(0, 10),
        missingSkills: missing.slice(0, 10),
        experienceSummary: "Automated evaluation could not be completed. Please review the resume manually.",
        strengths: ["Some keyword alignment detected with the role requirements."],
        concerns: ["Full AI evaluation could not be completed — manual review recommended."],
        nextStep: keywordScore >= 75 ? "Shortlist for Screening" : keywordScore >= 50 ? "Consider with Caution" : "Not Suitable for This Role",
        scoreRationale: `Based on ${keywordScore}% keyword overlap with the job description.`,
      };

      let evalResult: EvalResult = fallback;

      console.log("[EVALUATE] Sending request to OpenAI...");
      try {
        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1500,
          messages: [{ role: "user", content: aiPrompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "{}";
        console.log("[EVALUATE] OpenAI response received, length:", content.length);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<EvalResult>;
          evalResult = { ...fallback, ...parsed };
          console.log(`[EVALUATE] fitScore=${evalResult.fitScore}, recommendation="${evalResult.hiringRecommendation}"`);
        }
      } catch (aiErr) {
        console.error("[EVALUATE] OpenAI request failed:", aiErr instanceof Error ? aiErr.message : String(aiErr));
        evalResult = fallback;
      }

      console.log("[EVALUATE] Sending evaluation response");
      res.json(evalResult);
    } catch (err) {
      console.error("[EVALUATE] Unexpected error:", err instanceof Error ? err.stack : String(err));
      res.status(500).json({ error: "An unexpected server error occurred. Please try again." });
    }
  }
);

// ─── Generate Improved Resume Draft ─────────────────────────────────────────

router.post(
  "/resume/generate-draft",
  async (req: Request, res: Response) => {
    console.log("[DRAFT] Request received");
    try {
      type DraftBody = {
        resumeText?: string;
        jobDescription?: string;
        matchedKeywords?: string[];
        missingKeywords?: string[];
        suggestions?: string[];
        useHighConfidenceOnly?: boolean;
      };
      const body = req.body as DraftBody;
      const resumeText = body.resumeText?.trim();
      const jobDescription = body.jobDescription?.trim();

      if (!resumeText) {
        res.status(400).json({ error: "resumeText is required." });
        return;
      }
      if (!jobDescription) {
        res.status(400).json({ error: "jobDescription is required." });
        return;
      }

      const matchedKeywords = body.matchedKeywords ?? [];
      const missingKeywords = body.missingKeywords ?? [];
      const suggestions = body.suggestions ?? [];

      const aiPrompt = `You are an expert resume writer creating a clean, ATS-friendly improved resume draft for a job applicant. Your goal is to rewrite the resume content to better align with the target job while staying 100% truthful to the original experience.

RULES:
- Do NOT fabricate experience, skills, companies, titles, or dates
- Do NOT include unsupported keywords or claims
- Only naturally integrate keywords that appear in the job description AND are supported by the resume content
- Use strong action verbs and quantify achievements where possible (only if data already exists in the resume)
- Avoid keyword stuffing — make it read naturally
- Keep the output realistic and professional
- Do NOT preserve original formatting; generate clean structured output

TARGET JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

ORIGINAL RESUME TEXT:
${resumeText.slice(0, 3000)}

KEYWORDS ALREADY MATCHED: ${matchedKeywords.slice(0, 15).join(", ") || "none"}
KEYWORDS TO NATURALLY INTEGRATE (only if supported by resume content): ${missingKeywords.slice(0, 15).join(", ") || "none"}
IMPROVEMENT GUIDANCE: ${suggestions.slice(0, 5).join("; ") || "none"}

Generate an improved resume draft. Respond with ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "professionalSummary": "2-3 sentence professional summary tailored to the job description",
  "skills": ["list of relevant skills from the resume, formatted for ATS, max 15 items"],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Date range if present in resume",
      "bullets": ["rewritten bullet point with strong action verb and clear impact", "..."]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "bullets": ["improved project detail", "..."]
    }
  ],
  "notes": "Optional: mention anything that needs manual verification or could not be improved without more info"
}

Only include "projects" if there are projects in the original resume. The "notes" field is optional.`;

      type DraftResult = {
        professionalSummary: string;
        skills: string[];
        experience: Array<{ role: string; company?: string; duration?: string; bullets: string[] }>;
        projects?: Array<{ name: string; description?: string; bullets: string[] }>;
        notes?: string;
      };

      const fallback: DraftResult = {
        professionalSummary: "Experienced professional with a strong background aligned with the requirements of this role. Skilled in delivering results and collaborating across teams.",
        skills: matchedKeywords.slice(0, 12),
        experience: [{ role: "Previous Role", bullets: ["Please review the original resume — AI draft generation could not be completed."] }],
        notes: "AI draft generation encountered an issue. Please try again.",
      };

      let draft: DraftResult = fallback;

      console.log("[DRAFT] Sending request to OpenAI...");
      try {
        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2500,
          messages: [{ role: "user", content: aiPrompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "{}";
        console.log("[DRAFT] OpenAI response received, length:", content.length);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<DraftResult>;
          draft = { ...fallback, ...parsed };
          console.log(`[DRAFT] Parsed draft with ${draft.experience.length} experience entries`);
        }
      } catch (aiErr) {
        console.error("[DRAFT] OpenAI request failed:", aiErr instanceof Error ? aiErr.message : String(aiErr));
        draft = fallback;
      }

      console.log("[DRAFT] Sending draft response");
      res.json(draft);
    } catch (err) {
      console.error("[DRAFT] Unexpected error:", err instanceof Error ? err.stack : String(err));
      res.status(500).json({ error: "An unexpected server error occurred. Please try again." });
    }
  }
);

export default router;
