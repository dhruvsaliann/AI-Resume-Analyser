import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDropzone } from "@/components/file-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileCheck, Loader2, Sparkles, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Problem = {
  severity: "high" | "medium" | "low";
  issue: string;
  description: string;
};

type ScoreBreakdown = {
  formatting: number;
  keywords: number;
  structure: number;
  readability: number;
};

type AtsResult = {
  atsText: string;
  atsScore: number;
  scoreBreakdown: ScoreBreakdown;
  problems: Problem[];
  positives: string[];
};

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg height="112" width="112" className="transform -rotate-90">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth="8" r={radius} cx="56" cy="56" />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth="8"
          strokeLinecap="round"
          r={radius}
          cx="56"
          cy="56"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-slate-500 font-medium">/ 100</span>
      </div>
    </div>
  );
}

export default function AtsConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!file) return;
    setIsPending(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("/api/resume/ats-convert", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as AtsResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to connect to the server. Is the backend running?");
    } finally {
      setIsPending(false);
    }
  };

  const handleDownload = () => {
    if (!result?.atsText) return;
    const blob = new Blob([result.atsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ats-resume.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-20 relative font-sans">
      <div className="absolute top-0 inset-x-0 h-[60vh] -z-10 bg-slate-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            ATS Resume Analyzer
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Is your resume{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">
              ATS friendly?
            </span>
          </h1>
          <p className="text-lg text-slate-600">
            Upload your resume to get an ATS score, see exactly what the system reads, and find problem areas to fix.
          </p>
        </div>

        <Card className="shadow-2xl shadow-primary/5 border-white/60 bg-white/70 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileCheck className="w-5 h-5 text-primary" />
              Upload Your Resume
            </CardTitle>
            <CardDescription>PDF format only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileDropzone file={file} setFile={setFile} />
            <Button
              size="lg"
              className="w-full text-lg shadow-xl shadow-primary/20 h-14"
              onClick={handleConvert}
              disabled={!file || isPending}
            >
              {isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><FileCheck className="w-5 h-5 mr-2" />Analyze ATS Compatibility</>
              )}
            </Button>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">{error}</div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="space-y-6">

              {/* ATS Score Card */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50">
                <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-8">
                  <ScoreRing score={result.atsScore} />
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      {result.atsScore >= 75 ? "Great ATS Compatibility!" : result.atsScore >= 50 ? "Needs Some Improvements" : "Poor ATS Compatibility"}
                    </h2>
                    <p className="text-slate-600 mb-4">Your resume scores {result.atsScore}/100 for ATS friendliness.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(result.scoreBreakdown).map(([key, val]) => (
                        <div key={key} className="bg-slate-100 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-600 capitalize">{key}</span>
                            <span className="text-xs font-bold text-slate-800">{val}/25</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(val / 25) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Problems */}
              {result.problems.length > 0 && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Problem Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.problems.map((p, i) => (
                      <div key={i} className={cn(
                        "p-4 rounded-xl border flex items-start gap-3",
                        p.severity === "high" ? "bg-rose-50 border-rose-200" :
                        p.severity === "medium" ? "bg-amber-50 border-amber-200" :
                        "bg-blue-50 border-blue-200"
                      )}>
                        <XCircle className={cn("w-5 h-5 shrink-0 mt-0.5",
                          p.severity === "high" ? "text-rose-500" :
                          p.severity === "medium" ? "text-amber-500" : "text-blue-500"
                        )} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{p.issue}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                              p.severity === "high" ? "bg-rose-100 text-rose-700" :
                              p.severity === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-blue-100 text-blue-700"
                            )}>{p.severity}</span>
                          </div>
                          <p className="text-sm text-slate-600">{p.description}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Positives */}
              {result.positives.length > 0 && (
                <Card className="shadow-lg border-emerald-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      What You're Doing Well
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.positives.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{p}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ATS Text View */}
              <Card className="shadow-xl border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">What ATS Actually Sees</CardTitle>
                    <CardDescription>This is the plain text your resume gets converted to by ATS systems</CardDescription>
                  </div>
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download .txt
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl p-6 max-h-[600px] overflow-y-auto shadow-inner">
                    {result.atsText}
                  </pre>
                </CardContent>
              </Card>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
