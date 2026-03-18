import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { createRequire } from "module";
import { openai } from "@workspace/integrations-openai-ai-server";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
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

async function parsePdf(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);
  const text = parsed.text?.trim() ?? "";
  if (!text) {
    throw new Error("Could not extract text from the PDF. Make sure the PDF is not image-only or password-protected.");
  }
  return text;
}

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
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

router.post(
  "/resume/analyze",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No PDF file uploaded" });
        return;
      }
      const jobDescription = (req.body as { jobDescription?: string }).jobDescription?.trim();
      if (!jobDescription) {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      let extractedText: string;
      try {
        extractedText = await parsePdf(req.file.buffer);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Failed to parse PDF." });
        return;
      }

      const { matched, missing, keywordScore } = computeKeywordMatch(extractedText, jobDescription);

      const aiPrompt = `You are a professional resume coach helping a job seeker improve their resume.

JOB DESCRIPTION:
${jobDescription.slice(0, 2500)}

RESUME TEXT:
${extractedText.slice(0, 3000)}

KEYWORD MATCH SCORE: ${keywordScore}%
MISSING KEYWORDS: ${missing.slice(0, 20).join(", ")}

Analyze this resume and respond with ONLY a JSON object (no markdown, no extra text) with exactly these fields:
{
  "suggestions": ["5-7 specific actionable improvement tips to better align with this job"],
  "strengths": ["3-5 genuine resume strengths relevant to this job"]
}

Focus suggestions on: adding missing keywords, quantifying achievements, tailoring language, highlighting relevant experience.
Focus strengths on: what the candidate already does well for this specific role.`;

      let suggestions: string[] = [];
      let strengths: string[] = [];

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 1200,
          messages: [{ role: "user", content: aiPrompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "{}";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: string[]; strengths?: string[] };
          suggestions = parsed.suggestions ?? [];
          strengths = parsed.strengths ?? [];
        }
      } catch {
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

      res.json({
        matchScore: keywordScore,
        matchedKeywords: matched.slice(0, 30),
        missingKeywords: missing.slice(0, 30),
        suggestions,
        strengths,
        extractedText,
      });
    } catch (err) {
      console.error("Resume analyze error:", err);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
);

router.post(
  "/resume/evaluate",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No PDF file uploaded" });
        return;
      }
      const jobDescription = (req.body as { jobDescription?: string }).jobDescription?.trim();
      if (!jobDescription) {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      let extractedText: string;
      try {
        extractedText = await parsePdf(req.file.buffer);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Failed to parse PDF." });
        return;
      }

      const { matched, missing, keywordScore } = computeKeywordMatch(extractedText, jobDescription);

      const aiPrompt = `You are a senior recruiter evaluating a candidate resume for a specific role. Be analytical, objective, and use professional recruiter language. Do not say "hire this person" — use language like "appears suitable for shortlist review", "lacks several required qualifications", "moderate alignment with the role".

JOB DESCRIPTION:
${jobDescription.slice(0, 2500)}

CANDIDATE RESUME:
${extractedText.slice(0, 3000)}

KEYWORD OVERLAP: ${keywordScore}% (${matched.slice(0, 15).join(", ") || "none"})
MISSING KEYWORDS: ${missing.slice(0, 15).join(", ") || "none"}

Evaluate this candidate's suitability for the role. Respond with ONLY a JSON object (no markdown, no extra text) with exactly these fields:
{
  "fitScore": <integer 0-100, weighted blend of keyword match and experience/quality assessment>,
  "hiringRecommendation": <"Strong Fit" | "Moderate Fit" | "Low Fit">,
  "matchedSkills": ["up to 10 specific matched skills/competencies"],
  "missingSkills": ["up to 10 important missing skills or qualifications"],
  "experienceSummary": "2-3 sentence objective summary of the candidate's relevant experience",
  "strengths": ["3-5 recruiter-relevant candidate strengths"],
  "concerns": ["2-4 gaps, risks or concerns about this candidate for this role"],
  "nextStep": <"Shortlist for Screening" | "Consider with Caution" | "Not Suitable for This Role">,
  "scoreRationale": "1-2 sentence explanation of why you gave this fit score"
}

Scoring guidance:
- 75-100: Strong alignment — majority of required skills present, experience appears highly relevant
- 50-74: Moderate alignment — some gaps but core qualifications are evident  
- 0-49: Weak alignment — significant skill or experience gaps for this specific role

The fitScore must be a grounded, realistic assessment — not just keyword overlap. Weigh experience quality, role relevance, and overall candidate profile.`;

      let evalResult = {
        fitScore: keywordScore,
        hiringRecommendation: keywordScore >= 75 ? "Strong Fit" : keywordScore >= 50 ? "Moderate Fit" : "Low Fit",
        matchedSkills: matched.slice(0, 10),
        missingSkills: missing.slice(0, 10),
        experienceSummary: "Unable to generate a detailed summary at this time. Please review the resume manually.",
        strengths: ["Candidate submitted a structured resume.", "Some keyword alignment detected with the role."],
        concerns: ["Full AI evaluation could not be completed."],
        nextStep: keywordScore >= 75 ? "Shortlist for Screening" : keywordScore >= 50 ? "Consider with Caution" : "Not Suitable for This Role",
        scoreRationale: `Based on ${keywordScore}% keyword match with the job description.`,
      } as {
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

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 1500,
          messages: [{ role: "user", content: aiPrompt }],
        });
        const content = completion.choices[0]?.message?.content ?? "{}";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as typeof evalResult;
          evalResult = { ...evalResult, ...parsed };
        }
      } catch (aiErr) {
        console.warn("AI evaluation failed, using fallback:", aiErr);
      }

      res.json(evalResult);
    } catch (err) {
      console.error("Resume evaluate error:", err);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
);

export default router;
