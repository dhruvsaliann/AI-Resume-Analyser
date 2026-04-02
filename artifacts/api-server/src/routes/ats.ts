import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { createRequire } from "module";
import { openai } from "@workspace/integrations-openai-ai-server";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  buffer: Buffer
) => Promise<{ text: string }>;

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(null, false);
  },
});

router.post(
  "/resume/ats-convert",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    console.log("[ATS] Request received");
    try {
      if (!req.file) {
        res.status(400).json({ error: "No PDF file uploaded." });
        return;
      }

      const parsed = await pdfParse(req.file.buffer);
      const resumeText = parsed.text?.trim() ?? "";

      if (!resumeText || resumeText.length < 10) {
        res.status(400).json({ error: "Could not extract text from PDF." });
        return;
      }

      const aiPrompt = `You are an ATS (Applicant Tracking System) expert. Analyze the following resume and do two things:

1. Convert it to a clean ATS-friendly plain text format
2. Score it and identify problem areas

Rules for conversion:
- Use simple section headers in ALL CAPS (e.g. SUMMARY, SKILLS, EXPERIENCE, EDUCATION, PROJECTS)
- No tables, columns, graphics, or special characters
- Use simple bullet points with a dash (-)
- Keep all original information — do not add or remove content
- Format dates consistently (e.g. Jan 2020 - Mar 2022)

ORIGINAL RESUME:
${resumeText.slice(0, 4000)}

Respond with ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "atsText": "the full converted plain text resume",
  "atsScore": <integer 0-100 representing how ATS-friendly the original resume is>,
  "scoreBreakdown": {
    "formatting": <0-25, score for clean formatting>,
    "keywords": <0-25, score for having good keywords>,
    "structure": <0-25, score for proper sections>,
    "readability": <0-25, score for ATS readability>
  },
  "problems": [
    {
      "severity": <"high" | "medium" | "low">,
      "issue": "short name of the issue",
      "description": "explanation of why this hurts ATS compatibility and how to fix it"
    }
  ],
  "positives": ["list of 2-4 things the resume does well for ATS"]
}`;

      const completion = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: aiPrompt }],
      });

      const content = completion.choices[0]?.message?.content ?? "{}";
      console.log("[ATS] Response received, length:", content.length);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: "Failed to parse AI response." });
        return;
      }

      const result = JSON.parse(jsonMatch[0]);
      console.log("[ATS] Score:", result.atsScore);
      res.json(result);
    } catch (err) {
      console.error("[ATS] Error:", err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  }
);

export default router;
