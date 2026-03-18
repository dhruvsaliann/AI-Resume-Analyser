import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDropzone } from "@/components/file-dropzone";
import { ScoreRing } from "@/components/score-ring";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalyzeResume } from "@workspace/api-client-react";
import { 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  FileText,
  AlertCircle,
  ScanSearch,
  Loader2
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isExtractedTextOpen, setIsExtractedTextOpen] = useState(false);

  const analyzeMutation = useAnalyzeResume();

  const handleAnalyze = () => {
    if (!file || !jobDescription.trim()) return;
    analyzeMutation.mutate({ data: { resume: file, jobDescription } });
  };

  const isFormValid = file !== null && jobDescription.trim().length > 10;
  const result = analyzeMutation.data;

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Abstract Background */}
      <div className="absolute top-0 inset-x-0 h-[50vh] -z-10 bg-slate-50 overflow-hidden">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="" 
          className="w-full h-full object-cover opacity-60 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Career Tool</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Optimize your resume for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">perfect match</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Upload your resume and the job description you're applying for. Our AI will analyze your fit, find missing keywords, and suggest improvements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <Card className="shadow-2xl shadow-blue-900/5 border-white/50 bg-white/80 backdrop-blur-xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Your Resume
                </CardTitle>
                <CardDescription>Upload your current resume in PDF format.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <FileDropzone file={file} setFile={setFile} />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg font-display">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    Target Job Description
                  </div>
                  <p className="text-sm text-slate-500">Paste the full description of the job you want.</p>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="e.g. We are looking for a Senior Frontend Engineer with experience in React, TypeScript, and modern CSS..."
                    className="w-full h-48 px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-sm"
                  />
                </div>

                <Button 
                  size="lg" 
                  className="w-full text-lg shadow-xl shadow-primary/20"
                  onClick={handleAnalyze}
                  disabled={!isFormValid || analyzeMutation.isPending}
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Match...
                    </>
                  ) : (
                    <>
                      <ScanSearch className="w-5 h-5 mr-2" />
                      Analyze Resume Match
                    </>
                  )}
                </Button>

                {analyzeMutation.isError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div className="text-sm font-medium">
                      {analyzeMutation.error?.response?.data?.error || "An error occurred while analyzing the resume. Please check your PDF and try again."}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results or Empty State */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {analyzeMutation.isPending ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/50 border border-slate-200 rounded-3xl min-h-[500px] shadow-sm backdrop-blur-sm"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-8" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">AI is analyzing your fit...</h3>
                  <div className="space-y-2 text-slate-500 font-medium">
                    <p className="animate-pulse delay-75">Extracting resume keywords</p>
                    <p className="animate-pulse delay-150">Comparing with job requirements</p>
                    <p className="animate-pulse delay-300">Generating actionable suggestions</p>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <Card className="overflow-hidden border-0 shadow-xl shadow-blue-900/5 bg-gradient-to-br from-white to-slate-50">
                    <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
                      <div className="shrink-0">
                        <ScoreRing score={result.matchScore} />
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
                          {result.matchScore >= 75 ? "Excellent Match!" : result.matchScore >= 50 ? "Good Potential" : "Needs Optimization"}
                        </h2>
                        <p className="text-slate-600 leading-relaxed">
                          Your resume matches <strong className="text-slate-900">{result.matchScore}%</strong> of the job description requirements. Focus on the missing keywords and suggestions below to improve your chances.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keywords Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Matched Keywords */}
                    <Card className="shadow-lg shadow-slate-200/40 border-emerald-100/50">
                      <CardHeader className="pb-4 border-b border-slate-100 bg-emerald-50/30 rounded-t-3xl">
                        <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          Matched Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {result.matchedKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {result.matchedKeywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium shadow-sm">
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No exact matches found.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Missing Keywords */}
                    <Card className="shadow-lg shadow-slate-200/40 border-rose-100/50">
                      <CardHeader className="pb-4 border-b border-slate-100 bg-rose-50/30 rounded-t-3xl">
                        <CardTitle className="text-lg flex items-center gap-2 text-rose-800">
                          <XCircle className="w-5 h-5 text-rose-500" />
                          Missing Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {result.missingKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {result.missingKeywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium shadow-sm">
                                {kw}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">Great! You hit all major keywords.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Suggestions */}
                  <Card className="shadow-xl shadow-indigo-900/5 border-indigo-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        AI Improvement Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors group">
                          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm group-hover:bg-indigo-100 transition-colors">
                            {index + 1}
                          </div>
                          <p className="text-slate-700 leading-relaxed text-[15px] pt-1">
                            {suggestion}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Extracted Text Collapsible */}
                  <Card className="shadow-sm border-slate-200">
                    <button
                      onClick={() => setIsExtractedTextOpen(!isExtractedTextOpen)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary inset-0"
                    >
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        View Extracted Resume Text
                      </span>
                      <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isExtractedTextOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {isExtractedTextOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pt-0">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs sm:text-sm font-mono text-slate-600 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                              {result.extractedText}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-10 bg-white/40 border border-dashed border-slate-300 rounded-3xl min-h-[500px] backdrop-blur-sm"
                >
                  <div className="w-24 h-24 rounded-3xl bg-blue-50/50 flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
                    <ScanSearch className="w-12 h-12 text-blue-400" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">Ready for Analysis</h3>
                  <p className="text-slate-500 max-w-sm text-base leading-relaxed">
                    Upload your resume and paste the job description you're targeting. Our AI will reveal your match score and provide actionable tips.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
