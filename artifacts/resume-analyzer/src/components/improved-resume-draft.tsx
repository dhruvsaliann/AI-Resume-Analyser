import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGenerateResumeDraft } from "@workspace/api-client-react";
import type { ResumeDraftResult } from "@workspace/api-client-react";
import {
  FileText,
  Copy,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  FolderOpen,
  User,
  Wand2,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImprovedResumeDraftProps {
  resumeText: string;
  jobDescription: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

function buildPlainText(draft: ResumeDraftResult): string {
  const lines: string[] = [];

  lines.push("PROFESSIONAL SUMMARY");
  lines.push("─".repeat(40));
  lines.push(draft.professionalSummary);
  lines.push("");

  lines.push("SKILLS");
  lines.push("─".repeat(40));
  lines.push(draft.skills.join(" • "));
  lines.push("");

  lines.push("EXPERIENCE");
  lines.push("─".repeat(40));
  for (const exp of draft.experience) {
    const header = [exp.role, exp.company, exp.duration].filter(Boolean).join(" | ");
    lines.push(header);
    for (const bullet of exp.bullets) {
      lines.push(`• ${bullet}`);
    }
    lines.push("");
  }

  if (draft.projects && draft.projects.length > 0) {
    lines.push("PROJECTS");
    lines.push("─".repeat(40));
    for (const proj of draft.projects) {
      lines.push(proj.name + (proj.description ? ` — ${proj.description}` : ""));
      for (const bullet of proj.bullets) {
        lines.push(`• ${bullet}`);
      }
      lines.push("");
    }
  }

  if (draft.notes) {
    lines.push("NOTES");
    lines.push("─".repeat(40));
    lines.push(draft.notes);
  }

  return lines.join("\n");
}

async function downloadDocx(draft: ResumeDraftResult, filename: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: "PROFESSIONAL SUMMARY",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: draft.professionalSummary, size: 22 })],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: "SKILLS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: draft.skills.join(" • "), size: 22 })],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: "EXPERIENCE",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })
  );

  for (const exp of draft.experience) {
    const header = [exp.role, exp.company, exp.duration].filter(Boolean).join(" | ");
    children.push(
      new Paragraph({
        children: [new TextRun({ text: header, bold: true, size: 22 })],
        spacing: { before: 160, after: 80 },
      })
    );
    for (const bullet of exp.bullets) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${bullet}`, size: 22 })],
          spacing: { after: 60 },
          indent: { left: 360 },
        })
      );
    }
  }

  if (draft.projects && draft.projects.length > 0) {
    children.push(
      new Paragraph({
        text: "PROJECTS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    for (const proj of draft.projects) {
      const header = proj.name + (proj.description ? ` — ${proj.description}` : "");
      children.push(
        new Paragraph({
          children: [new TextRun({ text: header, bold: true, size: 22 })],
          spacing: { before: 160, after: 80 },
        })
      );
      for (const bullet of proj.bullets) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${bullet}`, size: 22 })],
            spacing: { after: 60 },
            indent: { left: 360 },
          })
        );
      }
    }
  }

  if (draft.notes) {
    children.push(
      new Paragraph({
        text: "NOTES",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: draft.notes, size: 22, italics: true })],
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      paragraphStyles: [
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, size: 26, color: "1E3A5F" },
          paragraph: { spacing: { before: 240 } },
        },
      ],
    },
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(draft: ResumeDraftResult, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;
  const lineHeight = 6;
  const sectionGap = 4;

  const addText = (
    text: string,
    opts: { bold?: boolean; size?: number; color?: string; indent?: number } = {}
  ) => {
    const { bold = false, size = 10, color = "333333", indent = 0 } = opts;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(parseInt(color.slice(0, 2), 16), parseInt(color.slice(2, 4), 16), parseInt(color.slice(4, 6), 16));
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
  };

  const addSection = (title: string) => {
    y += sectionGap;
    if (y > 270) { doc.addPage(); y = 20; }
    addText(title, { bold: true, size: 12, color: "1E3A5F" });
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
  };

  addSection("PROFESSIONAL SUMMARY");
  addText(draft.professionalSummary);
  y += sectionGap;

  addSection("SKILLS");
  addText(draft.skills.join(" • "));
  y += sectionGap;

  addSection("EXPERIENCE");
  for (const exp of draft.experience) {
    const header = [exp.role, exp.company, exp.duration].filter(Boolean).join(" | ");
    addText(header, { bold: true });
    for (const bullet of exp.bullets) {
      addText(`• ${bullet}`, { indent: 4 });
    }
    y += 2;
  }

  if (draft.projects && draft.projects.length > 0) {
    addSection("PROJECTS");
    for (const proj of draft.projects) {
      const header = proj.name + (proj.description ? ` — ${proj.description}` : "");
      addText(header, { bold: true });
      for (const bullet of proj.bullets) {
        addText(`• ${bullet}`, { indent: 4 });
      }
      y += 2;
    }
  }

  if (draft.notes) {
    addSection("NOTES");
    addText(draft.notes);
  }

  doc.save(filename);
}

export function ImprovedResumeDraft({
  resumeText,
  jobDescription,
  matchedKeywords,
  missingKeywords,
  suggestions,
}: ImprovedResumeDraftProps) {
  const [useHighConfidenceOnly, setUseHighConfidenceOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<ResumeDraftResult | null>(null);
  const [showDraft, setShowDraft] = useState(true);

  const generateMutation = useGenerateResumeDraft();

  const handleGenerate = () => {
    generateMutation.mutate(
      {
        data: {
          resumeText,
          jobDescription,
          matchedKeywords,
          missingKeywords,
          suggestions,
          useHighConfidenceOnly,
        },
      },
      {
        onSuccess: (data) => {
          setDraft(data);
          setShowDraft(true);
        },
      }
    );
  };

  const handleCopy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(buildPlainText(draft));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = () => {
    if (!draft) return;
    void downloadDocx(draft, "improved-resume.docx");
  };

  const handleDownloadPdf = () => {
    if (!draft) return;
    void downloadPdf(draft, "improved-resume.pdf");
  };

  const errorMsg =
    (generateMutation.error?.data as { error?: string } | null)?.error ||
    generateMutation.error?.message;

  return (
    <Card className="shadow-xl shadow-primary/5 border-primary/20 relative overflow-hidden bg-white/80 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3" />

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
            <Wand2 className="w-5 h-5 text-primary" />
            Generate Improved Resume Draft
          </CardTitle>
          {draft && (
            <button
              onClick={() => setShowDraft(!showDraft)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showDraft && "rotate-180")} />
              {showDraft ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Creates a clean, ATS-friendly resume rewrite using only content supported by your original resume.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 relative z-10">
        {/* Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <button
            role="switch"
            aria-checked={useHighConfidenceOnly}
            onClick={() => setUseHighConfidenceOnly(!useHighConfidenceOnly)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              useHighConfidenceOnly ? "bg-primary" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                useHighConfidenceOnly ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
          <span className="text-sm text-slate-700 font-medium">
            Use only high-confidence keyword suggestions
          </span>
        </div>

        {/* Generate button */}
        <Button
          size="lg"
          className="w-full h-12 text-base shadow-lg shadow-primary/20"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating improved draft...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 mr-2" />
              {draft ? "Regenerate Draft" : "Generate Improved Resume Draft"}
            </>
          )}
        </Button>

        {/* Error */}
        {generateMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 text-sm"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {errorMsg || "Failed to generate draft. Please try again."}
          </motion.div>
        )}

        {/* Draft Output */}
        <AnimatePresence>
          {draft && showDraft && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-sm font-medium">
                  This is an AI-generated draft. Please review carefully before use — verify all details are accurate.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Text"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDocx}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download DOCX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>

              {/* Professional Summary */}
              <DraftSection icon={<User className="w-4 h-4" />} title="Professional Summary" color="blue">
                <p className="text-slate-700 leading-relaxed text-[15px]">{draft.professionalSummary}</p>
              </DraftSection>

              {/* Skills */}
              <DraftSection icon={<CheckCircle2 className="w-4 h-4" />} title="Skills" color="emerald">
                <div className="flex flex-wrap gap-2">
                  {draft.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </DraftSection>

              {/* Experience */}
              <DraftSection icon={<Briefcase className="w-4 h-4" />} title="Experience" color="indigo">
                <div className="space-y-5">
                  {draft.experience.map((exp, i) => (
                    <div key={i} className="space-y-2">
                      <div>
                        <span className="font-semibold text-slate-900 text-[15px]">{exp.role}</span>
                        {exp.company && (
                          <span className="text-slate-600 text-sm"> · {exp.company}</span>
                        )}
                        {exp.duration && (
                          <span className="text-slate-400 text-sm"> · {exp.duration}</span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j} className="flex gap-2 text-slate-700 text-[14px] leading-relaxed">
                            <span className="text-primary font-bold mt-0.5 shrink-0">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </DraftSection>

              {/* Projects */}
              {draft.projects && draft.projects.length > 0 && (
                <DraftSection icon={<FolderOpen className="w-4 h-4" />} title="Projects" color="violet">
                  <div className="space-y-5">
                    {draft.projects.map((proj, i) => (
                      <div key={i} className="space-y-2">
                        <div>
                          <span className="font-semibold text-slate-900 text-[15px]">{proj.name}</span>
                          {proj.description && (
                            <span className="text-slate-600 text-sm"> — {proj.description}</span>
                          )}
                        </div>
                        <ul className="space-y-1.5">
                          {proj.bullets.map((bullet, j) => (
                            <li key={j} className="flex gap-2 text-slate-700 text-[14px] leading-relaxed">
                              <span className="text-violet-500 font-bold mt-0.5 shrink-0">•</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </DraftSection>
              )}

              {/* Notes */}
              {draft.notes && (
                <DraftSection icon={<StickyNote className="w-4 h-4" />} title="Notes" color="amber">
                  <p className="text-slate-600 text-sm leading-relaxed italic">{draft.notes}</p>
                </DraftSection>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function DraftSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "emerald" | "indigo" | "violet" | "amber";
  children: React.ReactNode;
}) {
  const colorMap = {
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-100",
    violet: "text-violet-700 bg-violet-50 border-violet-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className={cn("flex items-center gap-2 px-5 py-3 border-b font-semibold text-sm", colorMap[color])}>
        {icon}
        {title}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
