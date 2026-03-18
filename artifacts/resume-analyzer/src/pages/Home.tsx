import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileDropzone } from "@/components/file-dropzone";
import { ScoreRing } from "@/components/score-ring";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalyzeResume, useEvaluateResume } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  FileText,
  AlertCircle,
  ScanSearch,
  Loader2,
  Users,
  UserCircle,
  AlertTriangle,
  Lightbulb,
  FileCheck2,
  TextIcon,
  Search,
  Target
} from "lucide-react";

type Mode = "candidate" | "recruiter";

const SAMPLE_JOB_DESCRIPTION = `We are looking for a Senior Frontend Engineer to join our team. 

Responsibilities:
- Build and maintain modern web applications using React and TypeScript.
- Collaborate with designers to implement beautiful, responsive UIs using Tailwind CSS.
- Optimize application performance and ensure high quality of code.
- Write unit and integration tests.

Requirements:
- 5+ years of experience with React, JavaScript, and modern frontend tools.
- Strong proficiency in TypeScript.
- Experience with Next.js or Vite.
- Knowledge of state management libraries like Redux or React Query.
- Excellent communication skills.`;

export default function Home() {
  const [mode, setMode] = useState<Mode>("candidate");
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isExtractedTextOpen, setIsExtractedTextOpen] = useState(false);
  const [isScoreRationaleOpen, setIsScoreRationaleOpen] = useState(false);

  const analyzeMutation = useAnalyzeResume();
  const evaluateMutation = useEvaluateResume();

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    analyzeMutation.reset();
    evaluateMutation.reset();
  };

  const handleAnalyze = () => {
    if (!file || !jobDescription.trim()) return;
    
    if (mode === "candidate") {
      analyzeMutation.mutate({ data: { resume: file, jobDescription } });
    } else {
      evaluateMutation.mutate({ data: { resume: file, jobDescription } });
    }
  };

  const isFormValid = file !== null && jobDescription.trim().length > 10;
  
  const isPending = analyzeMutation.isPending || evaluateMutation.isPending;
  const isError = analyzeMutation.isError || evaluateMutation.isError;
  const errorMsg = analyzeMutation.error?.response?.data?.error || evaluateMutation.error?.response?.data?.error;

  const candidateResult = analyzeMutation.data;
  const recruiterResult = evaluateMutation.data;

  return (
    <div className="min-h-screen pb-20 relative font-sans">
      {/* Abstract Background */}
      <div className="absolute top-0 inset-x-0 h-[60vh] -z-10 bg-slate-50 overflow-hidden">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="" 
          className="w-full h-full object-cover opacity-[0.35] mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Hiring Intelligence</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Optimize alignment between <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">
              talent and opportunity
            </span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Our dual-mode platform empowers candidates to tailor their resumes and enables recruiters to evaluate fit instantly using advanced AI analysis.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl inline-flex relative shadow-inner">
            {/* Active Indicator */}
            <div 
              className="absolute inset-y-1.5 w-[calc(50%-0.375rem)] bg-white rounded-xl shadow-md transition-all duration-300 ease-out z-0 border border-slate-200/50"
              style={{ 
                left: mode === "candidate" ? "0.375rem" : "calc(50% + 0.1875rem)" 
              }}
            />
            
            <button
              onClick={() => handleModeChange("candidate")}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center py-3 px-8 rounded-xl transition-colors duration-200 min-w-[200px] sm:min-w-[240px]",
                mode === "candidate" ? "text-primary" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <div className="flex items-center gap-2 font-display font-bold text-base mb-0.5">
                <UserCircle className="w-5 h-5" />
                Candidate Mode
              </div>
              <span className="text-xs opacity-80 font-medium">Optimize your resume</span>
            </button>

            <button
              onClick={() => handleModeChange("recruiter")}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center py-3 px-8 rounded-xl transition-colors duration-200 min-w-[200px] sm:min-w-[240px]",
                mode === "recruiter" ? "text-primary" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <div className="flex items-center gap-2 font-display font-bold text-base mb-0.5">
                <Users className="w-5 h-5" />
                Recruiter Mode
              </div>
              <span className="text-xs opacity-80 font-medium">Evaluate a candidate</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            <Card className="shadow-2xl shadow-primary/5 border-white/60 bg-white/70 backdrop-blur-xl">
              <CardHeader className="pb-5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileCheck2 className="w-5 h-5 text-primary" />
                  {mode === "candidate" ? "Your Resume" : "Candidate Resume"}
                </CardTitle>
                <CardDescription>
                  Upload the {mode === "candidate" ? "resume" : "candidate's resume"} in PDF format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FileDropzone file={file} setFile={setFile} />

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg font-display">
                      <Briefcase className="w-5 h-5 text-indigo-500" />
                      Target Job Description
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setJobDescription(SAMPLE_JOB_DESCRIPTION)}
                      className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      Load sample
                    </Button>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    className="w-full h-44 px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                  />
                </div>

                <Button 
                  size="lg" 
                  className="w-full text-lg shadow-xl shadow-primary/20 h-14"
                  onClick={handleAnalyze}
                  disabled={!isFormValid || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {mode === "candidate" ? "Analyzing Match..." : "Evaluating Fit..."}
                    </>
                  ) : (
                    <>
                      {mode === "candidate" ? (
                        <ScanSearch className="w-5 h-5 mr-2" />
                      ) : (
                        <Search className="w-5 h-5 mr-2" />
                      )}
                      {mode === "candidate" ? "Analyze My Resume" : "Evaluate Candidate"}
                    </>
                  )}
                </Button>

                {isError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-xl flex items-start gap-3 shadow-sm text-destructive"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-sm font-medium">
                      {errorMsg || "An error occurred. Please check your PDF and try again."}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results or Empty State */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {isPending ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/60 border border-slate-200/60 rounded-3xl min-h-[550px] shadow-sm backdrop-blur-md"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-8" />
                    <div className="absolute inset-0 flex items-center justify-center mb-8">
                      {mode === "candidate" ? (
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                      ) : (
                        <Target className="w-8 h-8 text-primary animate-pulse" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    {mode === "candidate" ? "Analyzing your resume fit..." : "Evaluating candidate profile..."}
                  </h3>
                  <div className="space-y-2.5 text-slate-500 font-medium">
                    <p className="animate-pulse delay-75">Extracting key experience and skills</p>
                    <p className="animate-pulse delay-150">Cross-referencing with job requirements</p>
                    <p className="animate-pulse delay-300">
                      {mode === "candidate" ? "Generating actionable suggestions" : "Formulating hiring recommendation"}
                    </p>
                  </div>
                </motion.div>
              ) : (mode === "candidate" && candidateResult) ? (
                <motion.div
                  key="candidate-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  className="space-y-6"
                >
                  {/* Candidate Score Card */}
                  <Card className="overflow-hidden border-0 shadow-xl shadow-primary/5 bg-gradient-to-br from-white to-slate-50/80">
                    <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
                      <div className="shrink-0 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                        <ScoreRing score={candidateResult.matchScore} />
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-3xl font-display font-bold text-slate-900 mb-3">
                          {candidateResult.matchScore >= 75 ? "Excellent Match!" : candidateResult.matchScore >= 50 ? "Good Potential" : "Needs Optimization"}
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          Your resume matches <strong className="text-slate-900 font-bold">{candidateResult.matchScore}%</strong> of the job description requirements. Review the insights below to improve your chances of getting an interview.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Candidate Strengths */}
                  {candidateResult.strengths.length > 0 && (
                    <Card className="shadow-lg shadow-slate-200/30 border-amber-200/50 bg-amber-50/30">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                          <CheckCircle2 className="w-5 h-5 text-amber-500" />
                          Your Identified Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2.5">
                          {candidateResult.strengths.map((strength, i) => (
                            <span key={i} className="px-3.5 py-1.5 rounded-lg bg-amber-100/50 border border-amber-200 text-amber-800 text-sm font-medium">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Candidate Keywords Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Matched Keywords */}
                    <Card className="shadow-lg shadow-slate-200/30 border-emerald-100/60 bg-emerald-50/20">
                      <CardHeader className="pb-4 border-b border-emerald-100/50">
                        <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          Matched Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {candidateResult.matchedKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {candidateResult.matchedKeywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-md bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-sm font-medium">
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
                    <Card className="shadow-lg shadow-slate-200/30 border-rose-100/60 bg-rose-50/20">
                      <CardHeader className="pb-4 border-b border-rose-100/50">
                        <CardTitle className="text-lg flex items-center gap-2 text-rose-800">
                          <XCircle className="w-5 h-5 text-rose-500" />
                          Missing Keywords
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {candidateResult.missingKeywords.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {candidateResult.missingKeywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-md bg-rose-100/60 border border-rose-200 text-rose-800 text-sm font-medium">
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

                  {/* Candidate Suggestions */}
                  <Card className="shadow-xl shadow-primary/5 border-primary/20 relative overflow-hidden bg-white/80 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <CardHeader className="pb-5">
                      <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                        <Lightbulb className="w-5 h-5 text-primary" />
                        Improvement Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                      {candidateResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-primary/30 transition-colors group">
                          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                            {index + 1}
                          </div>
                          <p className="text-slate-700 leading-relaxed text-[15px] pt-1">
                            {suggestion}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Candidate Extracted Text Collapsible */}
                  <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setIsExtractedTextOpen(!isExtractedTextOpen)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <TextIcon className="w-4 h-4 text-slate-400" />
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
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs sm:text-sm font-mono text-slate-600 whitespace-pre-wrap max-h-[400px] overflow-y-auto shadow-inner">
                              {candidateResult.extractedText}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ) : (mode === "recruiter" && recruiterResult) ? (
                <motion.div
                  key="recruiter-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}
                  className="space-y-6"
                >
                  {/* Recruiter Header/Recommendation Banner */}
                  <div className={cn(
                    "rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-xl relative overflow-hidden",
                    recruiterResult.hiringRecommendation === "Strong Fit" ? "bg-emerald-600 text-white" :
                    recruiterResult.hiringRecommendation === "Moderate Fit" ? "bg-amber-500 text-white" :
                    "bg-rose-600 text-white"
                  )}>
                    <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                    
                    <div className="shrink-0 bg-white/20 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                      {/* Using a custom simplified score ring for the colored background to ensure contrast */}
                      <div className="relative flex items-center justify-center w-24 h-24">
                        <svg height="96" width="96" className="transform -rotate-90">
                          <circle stroke="rgba(255,255,255,0.2)" fill="transparent" strokeWidth="8" r="40" cx="48" cy="48" />
                          <motion.circle
                            stroke="white"
                            fill="transparent"
                            strokeWidth="8"
                            strokeLinecap="round"
                            r="40"
                            cx="48"
                            cy="48"
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - (recruiterResult.fitScore / 100) * 251.2 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ strokeDasharray: 251.2 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-display text-2xl font-bold">{recruiterResult.fitScore}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center sm:text-left z-10">
                      <h2 className="text-3xl font-display font-bold mb-2">
                        {recruiterResult.hiringRecommendation}
                      </h2>
                      <p className="text-white/90 text-lg">
                        Fit Score: {recruiterResult.fitScore}/100
                      </p>
                    </div>
                    
                    <div className="sm:ml-auto z-10 bg-white/20 backdrop-blur-md px-5 py-3 rounded-xl border border-white/20 text-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-1">Recommended Action</div>
                      <div className="font-bold flex items-center gap-2">
                        {recruiterResult.nextStep === "Shortlist for Screening" && <CheckCircle2 className="w-5 h-5" />}
                        {recruiterResult.nextStep === "Consider with Caution" && <AlertTriangle className="w-5 h-5" />}
                        {recruiterResult.nextStep === "Not Suitable for This Role" && <XCircle className="w-5 h-5" />}
                        {recruiterResult.nextStep}
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Experience Summary */}
                  <Card className="shadow-lg shadow-slate-200/40">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        Experience Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 leading-relaxed">
                        {recruiterResult.experienceSummary}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recruiter Evaluation Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <Card className="shadow-lg shadow-slate-200/40 border-emerald-100">
                      <CardHeader className="pb-4 bg-emerald-50/50 border-b border-emerald-100/50 rounded-t-3xl">
                        <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          Key Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-5">
                        <ul className="space-y-3">
                          {recruiterResult.strengths.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Concerns */}
                    <Card className="shadow-lg shadow-slate-200/40 border-rose-100">
                      <CardHeader className="pb-4 bg-rose-50/50 border-b border-rose-100/50 rounded-t-3xl">
                        <CardTitle className="text-lg flex items-center gap-2 text-rose-800">
                          <AlertTriangle className="w-5 h-5 text-rose-600" />
                          Concerns & Gaps
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-5">
                        {recruiterResult.concerns.length > 0 ? (
                          <ul className="space-y-3">
                            {recruiterResult.concerns.map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No major concerns identified.</p>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Matched Skills */}
                    <Card className="shadow-lg shadow-slate-200/40">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-slate-800">Matched Skills</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recruiterResult.matchedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {recruiterResult.matchedSkills.map((skill, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No exact skill matches.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Missing Skills */}
                    <Card className="shadow-lg shadow-slate-200/40">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-slate-800">Missing Skills</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recruiterResult.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {recruiterResult.missingSkills.map((skill, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">No missing required skills.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recruiter Score Rationale Collapsible */}
                  <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setIsScoreRationaleOpen(!isScoreRationaleOpen)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        Why this score? (Score Rationale)
                      </span>
                      <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isScoreRationaleOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {isScoreRationaleOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pt-0">
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-700 leading-relaxed shadow-inner">
                              {recruiterResult.scoreRationale}
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
                  className="h-full flex flex-col items-center justify-center text-center p-10 bg-white/50 border border-dashed border-slate-300 rounded-3xl min-h-[550px] backdrop-blur-md shadow-sm"
                >
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6 shadow-inner border border-slate-200">
                    {mode === "candidate" ? (
                      <UserCircle className="w-12 h-12 text-slate-400" />
                    ) : (
                      <Users className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">
                    {mode === "candidate" ? "Ready for Analysis" : "Ready for Evaluation"}
                  </h3>
                  <p className="text-slate-500 max-w-sm text-base leading-relaxed">
                    {mode === "candidate" 
                      ? "Upload your resume and paste the job description you're targeting to get actionable improvements." 
                      : "Upload a candidate's resume and the job description to get an objective fit evaluation."}
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
