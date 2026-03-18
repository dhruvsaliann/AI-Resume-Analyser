import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import { openai } from "@workspace/integrations-openai-ai-server";

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

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
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

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 80);
}

function computeMatchScore(
  resumeKeywords: Set<string>,
  jobKeywords: string[]
): { score: number; matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jobKeywords) {
    if (resumeKeywords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const score =
    jobKeywords.length === 0
      ? 0
      : Math.round((matched.length / jobKeywords.length) * 100);

  return { score, matched, missing };
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

      const jobDescription = (req.body as { jobDescription?: string })
        .jobDescription?.trim();

      if (!jobDescription) {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      let extractedText: string;
      try {
        const parsed = await pdfParse(req.file.buffer);
        extractedText = parsed.text?.trim() ?? "";
        if (!extractedText) {
          res
            .status(400)
            .json({ error: "Could not extract text from the PDF. Make sure the PDF is not image-only or password-protected." });
          return;
        }
      } catch {
        res
          .status(400)
          .json({ error: "Failed to parse PDF. Please upload a valid, non-encrypted PDF file." });
        return;
      }

      const resumeKeywords = new Set(extractKeywords(extractedText));
      const jobKeywords = extractKeywords(jobDescription);

      const { score, matched, missing } = computeMatchScore(
        resumeKeywords,
        jobKeywords
      );

      const aiPrompt = `You are a professional resume coach. Analyze the following resume against the job description and provide 5-7 specific, actionable improvement suggestions.

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

RESUME TEXT:
${extractedText.slice(0, 3000)}

MATCH SCORE: ${score}%
MISSING KEYWORDS: ${missing.slice(0, 20).join(", ")}

Provide exactly 5-7 concise, actionable bullet-point suggestions to improve this resume for the job. Focus on:
1. Adding missing technical skills or keywords
2. Quantifying achievements
3. Tailoring language to match the job description
4. Highlighting relevant experience

Return ONLY a JSON array of strings (the suggestions), no other text. Example: ["Suggestion 1", "Suggestion 2"]`;

      let suggestions: string[] = [];
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 1024,
          messages: [{ role: "user", content: aiPrompt }],
        });

        const content = completion.choices[0]?.message?.content ?? "[]";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]) as string[];
        }
      } catch {
        suggestions = [
          "Add more keywords from the job description to improve ATS compatibility.",
          "Quantify your achievements with specific numbers and percentages.",
          "Tailor your professional summary to match the role requirements.",
          "Highlight relevant projects that align with the job requirements.",
          "Use action verbs at the start of each bullet point.",
        ];
      }

      res.json({
        matchScore: score,
        matchedKeywords: matched.slice(0, 30),
        missingKeywords: missing.slice(0, 30),
        suggestions,
        extractedText,
      });
    } catch (err) {
      console.error("Resume analysis error:", err);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
);

export default router;
